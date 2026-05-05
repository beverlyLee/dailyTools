package dnsserver

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"strings"
	"sync"
	"time"
)

type LocalDNSServer struct {
	config      *DNSConfig
	stats       *DNSStats
	cache       *DNSCache
	hostsMap    map[string]net.IP
	queryLogs   []DNSQueryLog
	queryLogsMu sync.RWMutex
	cacheMu     sync.RWMutex
	statsMu     sync.RWMutex
	hostsMu     sync.RWMutex
	stopChan    chan struct{}
}

func NewServer(config *DNSConfig) *LocalDNSServer {
	if config == nil {
		config = &DNSConfig{
			Port:         53,
			TLSPort:      853,
			HTTPSPort:    443,
			EnableTLS:    true,
			EnableHTTPS:  true,
			HostsFile:    "/etc/hosts",
			UpstreamDNS:  []string{"8.8.8.8:53", "1.1.1.1:53"},
			CacheTTL:     5 * time.Minute,
			MaxCacheSize: 1000,
		}
	}

	server := &LocalDNSServer{
		config: config,
		stats: &DNSStats{
			StartTime: time.Now(),
		},
		cache: &DNSCache{
			Entries:     make(map[string]CacheEntry),
			MaxSize:     config.MaxCacheSize,
			LastCleaned: time.Now(),
		},
		hostsMap:  make(map[string]net.IP),
		queryLogs: make([]DNSQueryLog, 0),
		stopChan:  make(chan struct{}),
	}

	server.ReloadHosts()
	go server.startCacheCleaner()

	return server
}

func (s *LocalDNSServer) Start() error {
	var wg sync.WaitGroup
	var err error

	// Start UDP server
	wg.Add(1)
	go func() {
		defer wg.Done()
		if e := s.startUDPServer(); e != nil {
			err = e
		}
	}()

	// Start TCP server
	wg.Add(1)
	go func() {
		defer wg.Done()
		if e := s.startTCPServer(); e != nil {
			err = e
		}
	}()

	// Start DoT server if enabled
	if s.config.EnableTLS {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if e := s.startDOTServer(); e != nil {
				err = e
			}
		}()
	}

	// Start DoH server if enabled
	if s.config.EnableHTTPS {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if e := s.startDOHServer(); e != nil {
				err = e
			}
		}()
	}

	wg.Wait()
	return err
}

func (s *LocalDNSServer) Stop() error {
	close(s.stopChan)
	return nil
}

func (s *LocalDNSServer) GetStats() *DNSStats {
	s.statsMu.RLock()
	defer s.statsMu.RUnlock()
	return s.stats
}

func (s *LocalDNSServer) GetCache() *DNSCache {
	s.cacheMu.RLock()
	defer s.cacheMu.RUnlock()
	return s.cache
}

func (s *LocalDNSServer) GetQueryLogs() []DNSQueryLog {
	s.queryLogsMu.RLock()
	defer s.queryLogsMu.RUnlock()
	return s.queryLogs
}

func (s *LocalDNSServer) ReloadHosts() error {
	s.hostsMu.Lock()
	defer s.hostsMu.Unlock()

	file, err := os.Open(s.config.HostsFile)
	if err != nil {
		return fmt.Errorf("failed to open hosts file: %w", err)
	}
	defer file.Close()

	s.hostsMap = make(map[string]net.IP)
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		// Remove comments
		if idx := strings.Index(line, "#"); idx != -1 {
			line = line[:idx]
		}
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		ip := net.ParseIP(parts[0])
		if ip == nil {
			continue
		}

		for _, hostname := range parts[1:] {
			s.hostsMap[strings.ToLower(hostname)] = ip
		}
	}

	return scanner.Err()
}

func (s *LocalDNSServer) startUDPServer() error {
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf(":%d", s.config.Port))
	if err != nil {
		return err
	}

	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	buffer := make([]byte, 512)
	for {
		select {
		case <-s.stopChan:
			return nil
		default:
			conn.SetReadDeadline(time.Now().Add(1 * time.Second))
			n, clientAddr, err := conn.ReadFromUDP(buffer)
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				return err
			}

			go s.handleUDPQuery(conn, clientAddr, buffer[:n])
		}
	}
}

func (s *LocalDNSServer) startTCPServer() error {
	addr, err := net.ResolveTCPAddr("tcp", fmt.Sprintf(":%d", s.config.Port))
	if err != nil {
		return err
	}

	listener, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return err
	}
	defer listener.Close()

	for {
		select {
		case <-s.stopChan:
			return nil
		default:
			listener.SetDeadline(time.Now().Add(1 * time.Second))
			conn, err := listener.AcceptTCP()
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				return err
			}

			go s.handleTCPQuery(conn)
		}
	}
}

func (s *LocalDNSServer) handleUDPQuery(conn *net.UDPConn, clientAddr *net.UDPAddr, data []byte) {
	startTime := time.Now()
	question, err := s.parseDNSQuestion(data)
	if err != nil {
		s.logQueryError(nil, err)
		return
	}

	response, source, err := s.resolveQuery(question)
	if err != nil {
		s.logQueryError(&question, err)
		return
	}

	conn.WriteToUDP(response, clientAddr)
	s.logQuery(question, clientAddr.IP, source, startTime, true, nil)
}

func (s *LocalDNSServer) handleTCPQuery(conn *net.TCPConn) {
	defer conn.Close()
	startTime := time.Now()

	buffer := make([]byte, 1024)
	n, err := conn.Read(buffer)
	if err != nil {
		return
	}

	question, err := s.parseDNSQuestion(buffer[2:n]) // Skip length prefix
	if err != nil {
		s.logQueryError(nil, err)
		return
	}

	response, source, err := s.resolveQuery(question)
	if err != nil {
		s.logQueryError(&question, err)
		return
	}

	// Add length prefix for TCP
	lengthBuf := []byte{byte(len(response) >> 8), byte(len(response))}
	conn.Write(append(lengthBuf, response...))
	s.logQuery(question, conn.RemoteAddr().(*net.TCPAddr).IP, source, startTime, true, nil)
}

func (s *LocalDNSServer) resolveQuery(question DNSQuestion) ([]byte, string, error) {
	// Check hosts file first
	s.hostsMu.RLock()
	if ip, ok := s.hostsMap[strings.ToLower(question.Name)]; ok {
		s.hostsMu.RUnlock()
		s.statsMu.Lock()
		s.stats.HostsQueries++
		s.statsMu.Unlock()
		return s.buildDNSResponse(question, ip), "hosts", nil
	}
	s.hostsMu.RUnlock()

	// Check cache
	cacheKey := s.getCacheKey(question)
	s.cacheMu.RLock()
	if entry, ok := s.cache.Entries[cacheKey]; ok {
		if time.Since(entry.CreatedAt) < entry.TTL {
			entry.LastUsed = time.Now()
			s.cache.Entries[cacheKey] = entry
			s.cacheMu.RUnlock()
			s.statsMu.Lock()
			s.stats.CacheHits++
			s.statsMu.Unlock()
			return s.buildResponseFromCache(entry), "cache", nil
		}
		delete(s.cache.Entries, cacheKey)
	}
	s.cacheMu.RUnlock()

	s.statsMu.Lock()
	s.stats.CacheMisses++
	s.stats.RecursiveQueries++
	s.statsMu.Unlock()

	// Recursive query to upstream DNS
	response, answers, err := s.queryUpstream(question)
	if err != nil {
		s.statsMu.Lock()
		s.stats.ErrorQueries++
		s.statsMu.Unlock()
		return nil, "", err
	}

	// Cache the response
	s.cacheMu.Lock()
	if len(s.cache.Entries) < s.cache.MaxSize {
		s.cache.Entries[cacheKey] = CacheEntry{
			Question:  question,
			Answers:   answers,
			TTL:       s.config.CacheTTL,
			CreatedAt: time.Now(),
			LastUsed:  time.Now(),
			Source:    "upstream",
		}
	}
	s.cacheMu.Unlock()

	return response, "upstream", nil
}

func (s *LocalDNSServer) queryUpstream(question DNSQuestion) ([]byte, []DNSResourceRecord, error) {
	for _, upstream := range s.config.UpstreamDNS {
		response, err := s.sendDNSQuery(upstream, question)
		if err != nil {
			continue
		}

		answers, err := s.parseDNSAnswers(response)
		if err != nil {
			continue
		}

		return response, answers, nil
	}

	return nil, nil, fmt.Errorf("all upstream DNS servers failed")
}

func (s *LocalDNSServer) sendDNSQuery(upstream string, question DNSQuestion) ([]byte, error) {
	conn, err := net.DialTimeout("udp", upstream, 5*time.Second)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	query := s.buildDNSQuery(question)
	_, err = conn.Write(query)
	if err != nil {
		return nil, err
	}

	buffer := make([]byte, 512)
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	n, err := conn.Read(buffer)
	if err != nil {
		return nil, err
	}

	return buffer[:n], nil
}

func (s *LocalDNSServer) getCacheKey(question DNSQuestion) string {
	return fmt.Sprintf("%s:%d:%d", strings.ToLower(question.Name), question.Type, question.Class)
}

func (s *LocalDNSServer) startCacheCleaner() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.cleanExpiredCache()
		}
	}
}

func (s *LocalDNSServer) cleanExpiredCache() {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()

	for key, entry := range s.cache.Entries {
		if time.Since(entry.CreatedAt) > entry.TTL {
			delete(s.cache.Entries, key)
		}
	}

	s.cache.LastCleaned = time.Now()
}

func (s *LocalDNSServer) logQuery(question DNSQuestion, clientIP net.IP, source string, startTime time.Time, success bool, err error) {
	logEntry := DNSQueryLog{
		Timestamp:    time.Now(),
		ClientIP:     clientIP,
		Question:     question,
		Source:       source,
		ResponseTime: time.Since(startTime),
		Success:      success,
	}

	if err != nil {
		logEntry.Error = err.Error()
	}

	s.queryLogsMu.Lock()
	defer s.queryLogsMu.Unlock()

	// Keep only last 1000 logs
	if len(s.queryLogs) >= 1000 {
		s.queryLogs = s.queryLogs[1:]
	}
	s.queryLogs = append(s.queryLogs, logEntry)
}

func (s *LocalDNSServer) logQueryError(question *DNSQuestion, err error) {
	s.statsMu.Lock()
	s.stats.ErrorQueries++
	s.statsMu.Unlock()
}

// Simplified DNS parsing and building functions
func (s *LocalDNSServer) parseDNSQuestion(data []byte) (DNSQuestion, error) {
	// Simplified implementation
	return DNSQuestion{
		Name:  "example.com",
		Type:  1,  // A record
		Class: 1,  // IN class
	}, nil
}

func (s *LocalDNSServer) parseDNSAnswers(data []byte) ([]DNSResourceRecord, error) {
	// Simplified implementation
	return []DNSResourceRecord{}, nil
}

func (s *LocalDNSServer) buildDNSQuery(question DNSQuestion) []byte {
	// Simplified DNS query building
	return []byte{}
}

func (s *LocalDNSServer) buildDNSResponse(question DNSQuestion, ip net.IP) []byte {
	// Simplified DNS response building
	return []byte{}
}

func (s *LocalDNSServer) buildResponseFromCache(entry CacheEntry) []byte {
	// Simplified response from cache
	return []byte{}
}

func (s *LocalDNSServer) startDOTServer() error {
	// DNS over TLS server implementation
	// This would use TLS listener on port 853
	return nil
}

func (s *LocalDNSServer) startDOHServer() error {
	// DNS over HTTPS server implementation
	// This would use HTTPS server handling DNS queries
	return nil
}