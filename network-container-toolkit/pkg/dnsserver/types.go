package dnsserver

import (
	"net"
	"time"
)

type DNSConfig struct {
	Port          int
	EnableTLS     bool
	EnableHTTPS   bool
	TLSPort       int
	HTTPSPort     int
	HostsFile     string
	UpstreamDNS   []string
	CacheTTL      time.Duration
	MaxCacheSize  int
}

type DNSServer interface {
	Start() error
	Stop() error
	GetStats() *DNSStats
	GetCache() *DNSCache
	GetQueryLogs() []DNSQueryLog
	ReloadHosts() error
}

type DNSStats struct {
	TotalQueries     int64
	CacheHits        int64
	CacheMisses      int64
	RecursiveQueries int64
	DOTQueries       int64
	DOHQueries       int64
	HostsQueries     int64
	ErrorQueries     int64
	StartTime        time.Time
}

type DNSCache struct {
	Entries     map[string]CacheEntry
	Size        int
	MaxSize     int
	LastCleaned time.Time
}

type CacheEntry struct {
	Question    DNSQuestion
	Answers     []DNSResourceRecord
	TTL         time.Duration
	CreatedAt   time.Time
	LastUsed    time.Time
	Source      string
}

type DNSQuestion struct {
	Name  string
	Type  uint16
	Class uint16
}

type DNSResourceRecord struct {
	Name     string
	Type     uint16
	Class    uint16
	TTL      uint32
	RDLength uint16
	RData    []byte
}

type DNSQueryLog struct {
	Timestamp   time.Time
	ClientIP    net.IP
	Question    DNSQuestion
	Source      string
	ResponseTime time.Duration
	Success     bool
	Error       string
	Answers     []string
}