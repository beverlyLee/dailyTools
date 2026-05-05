package scanner

import (
	"archive/tar"
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type Config struct {
	ImageName      string
	ScanOSPackages bool
	ScanAppDeps    bool
	CheckConfig    bool
	TempDir        string
}

type ScanResult struct {
	ImageName          string                    `json:"image_name"`
	ImageID            string                    `json:"image_id,omitempty"`
	Digest             string                    `json:"digest,omitempty"`
	OSInfo             *OSInfo                   `json:"os_info,omitempty"`
	OSVulnerabilities  []OSVulnerability         `json:"os_vulnerabilities"`
	AppVulnerabilities []AppVulnerability        `json:"app_vulnerabilities"`
	Packages           []PackageInfo             `json:"packages,omitempty"`
	AppDependencies    []AppDependency           `json:"app_dependencies,omitempty"`
	ScanTime           time.Time                 `json:"scan_time"`
	ScanDuration       time.Duration             `json:"scan_duration"`
}

type OSInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	ID      string `json:"id"`
	IDLike  string `json:"id_like,omitempty"`
}

type PackageInfo struct {
	Name         string `json:"name"`
	Version      string `json:"version"`
	Architecture string `json:"architecture,omitempty"`
	Source       string `json:"source,omitempty"`
}

type AppDependency struct {
	Manager      string `json:"manager"`
	Name         string `json:"name"`
	Version      string `json:"version"`
	FilePath     string `json:"file_path"`
}

type VulnerabilitySeverity string

const (
	SeverityCritical VulnerabilitySeverity = "Critical"
	SeverityHigh     VulnerabilitySeverity = "High"
	SeverityMedium   VulnerabilitySeverity = "Medium"
	SeverityLow      VulnerabilitySeverity = "Low"
	SeverityNegligible VulnerabilitySeverity = "Negligible"
	SeverityUnknown  VulnerabilitySeverity = "Unknown"
)

type OSVulnerability struct {
	VulnerabilityID string                 `json:"vulnerability_id"`
	PackageName     string                 `json:"package_name"`
	InstalledVersion string                `json:"installed_version"`
	FixedVersion    string                 `json:"fixed_version,omitempty"`
	Severity        VulnerabilitySeverity  `json:"severity"`
	Title           string                 `json:"title"`
	Description     string                 `json:"description,omitempty"`
	References      []string               `json:"references,omitempty"`
	CWEIDs          []string               `json:"cwe_ids,omitempty"`
	CVSS            *CVSSInfo              `json:"cvss,omitempty"`
}

type AppVulnerability struct {
	VulnerabilityID string                 `json:"vulnerability_id"`
	PackageName     string                 `json:"package_name"`
	InstalledVersion string                `json:"installed_version"`
	FixedVersion    string                 `json:"fixed_version,omitempty"`
	Severity        VulnerabilitySeverity  `json:"severity"`
	Title           string                 `json:"title"`
	Description     string                 `json:"description,omitempty"`
	Ecosystem       string                 `json:"ecosystem"`
	FilePath        string                 `json:"file_path,omitempty"`
	References      []string               `json:"references,omitempty"`
	CVSS            *CVSSInfo              `json:"cvss,omitempty"`
}

type CVSSInfo struct {
	Score         float64 `json:"score"`
	Vector        string  `json:"vector"`
	Version       string  `json:"version,omitempty"`
	Severity      string  `json:"severity,omitempty"`
}

type ImageScanner struct {
	config Config
}

func New(config Config) *ImageScanner {
	if config.TempDir == "" {
		config.TempDir = os.TempDir()
	}
	return &ImageScanner{config: config}
}

func (s *ImageScanner) Scan() (*ScanResult, error) {
	startTime := time.Now()

	result := &ScanResult{
		ImageName: s.config.ImageName,
		ScanTime:  time.Now(),
	}

	extractDir, err := s.extractImage()
	if err != nil {
		return nil, fmt.Errorf("failed to extract image: %w", err)
	}
	defer os.RemoveAll(extractDir)

	if s.config.ScanOSPackages {
		osInfo, packages, err := s.scanOSPackages(extractDir)
		if err != nil {
			return nil, fmt.Errorf("failed to scan OS packages: %w", err)
		}
		result.OSInfo = osInfo
		result.Packages = packages

		vulns, err := s.detectOSVulnerabilities(packages, osInfo)
		if err != nil {
			return nil, fmt.Errorf("failed to detect OS vulnerabilities: %w", err)
		}
		result.OSVulnerabilities = vulns
	}

	if s.config.ScanAppDeps {
		deps, err := s.scanAppDependencies(extractDir)
		if err != nil {
			return nil, fmt.Errorf("failed to scan app dependencies: %w", err)
		}
		result.AppDependencies = deps

		vulns, err := s.detectAppVulnerabilities(deps)
		if err != nil {
			return nil, fmt.Errorf("failed to detect app vulnerabilities: %w", err)
		}
		result.AppVulnerabilities = vulns
	}

	result.ScanDuration = time.Since(startTime)

	return result, nil
}

func (s *ImageScanner) extractImage() (string, error) {
	extractDir, err := os.MkdirTemp(s.config.TempDir, "image-scan-")
	if err != nil {
		return "", err
	}

	cmd := exec.Command("docker", "save", s.config.ImageName)
	output, err := cmd.StdoutPipe()
	if err != nil {
		os.RemoveAll(extractDir)
		return "", err
	}

	if err := cmd.Start(); err != nil {
		os.RemoveAll(extractDir)
		return "", err
	}

	layersDir := filepath.Join(extractDir, "layers")
	os.MkdirAll(layersDir, 0755)

	tr := tar.NewReader(output)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			cmd.Process.Kill()
			os.RemoveAll(extractDir)
			return "", err
		}

		if strings.HasSuffix(hdr.Name, "layer.tar") || strings.HasSuffix(hdr.Name, "/layer.tar") {
			layerFile := filepath.Join(layersDir, filepath.Base(hdr.Name))
			f, err := os.Create(layerFile)
			if err != nil {
				continue
			}
			io.Copy(f, tr)
			f.Close()
		}
	}

	cmd.Wait()

	fsDir := filepath.Join(extractDir, "fs")
	os.MkdirAll(fsDir, 0755)

	layerFiles, err := filepath.Glob(filepath.Join(layersDir, "*.tar"))
	if err != nil {
		return extractDir, nil
	}

	for _, layerFile := range layerFiles {
		s.extractLayer(layerFile, fsDir)
	}

	return extractDir, nil
}

func (s *ImageScanner) extractLayer(layerFile, destDir string) error {
	f, err := os.Open(layerFile)
	if err != nil {
		return err
	}
	defer f.Close()

	tr := tar.NewReader(f)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		targetPath := filepath.Join(destDir, hdr.Name)

		switch hdr.Typeflag {
		case tar.TypeDir:
			os.MkdirAll(targetPath, 0755)
		case tar.TypeReg:
			dir := filepath.Dir(targetPath)
			os.MkdirAll(dir, 0755)
			f, err := os.Create(targetPath)
			if err != nil {
				continue
			}
			io.Copy(f, tr)
			f.Close()
		case tar.TypeSymlink:
			os.Symlink(hdr.Linkname, targetPath)
		}
	}

	return nil
}

func (s *ImageScanner) scanOSPackages(extractDir string) (*OSInfo, []PackageInfo, error) {
	fsDir := filepath.Join(extractDir, "fs")

	osInfo := &OSInfo{}

	osReleasePath := filepath.Join(fsDir, "etc", "os-release")
	if data, err := os.ReadFile(osReleasePath); err == nil {
		osInfo = s.parseOSRelease(string(data))
	}

	var packages []PackageInfo

	dpkgStatusPath := filepath.Join(fsDir, "var", "lib", "dpkg", "status")
	if _, err := os.Stat(dpkgStatusPath); err == nil {
		if data, err := os.ReadFile(dpkgStatusPath); err == nil {
			packages = append(packages, s.parseDPKGStatus(string(data))...)
		}
	}

	rpmDBDir := filepath.Join(fsDir, "var", "lib", "rpm")
	if _, err := os.Stat(rpmDBDir); err == nil {
		rpmPackages, err := s.listRPMPackages(fsDir)
		if err == nil {
			packages = append(packages, rpmPackages...)
		}
	}

	apkDBPath := filepath.Join(fsDir, "lib", "apk", "db", "installed")
	if _, err := os.Stat(apkDBPath); err == nil {
		if data, err := os.ReadFile(apkDBPath); err == nil {
			packages = append(packages, s.parseAPKStatus(string(data))...)
		}
	}

	return osInfo, packages, nil
}

func (s *ImageScanner) parseOSRelease(content string) *OSInfo {
	info := &OSInfo{}
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "PRETTY_NAME=") {
			info.Name = strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
		} else if strings.HasPrefix(line, "VERSION_ID=") {
			info.Version = strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
		} else if strings.HasPrefix(line, "ID=") {
			info.ID = strings.Trim(strings.TrimPrefix(line, "ID="), "\"")
		} else if strings.HasPrefix(line, "ID_LIKE=") {
			info.IDLike = strings.Trim(strings.TrimPrefix(line, "ID_LIKE="), "\"")
		}
	}
	return info
}

func (s *ImageScanner) parseDPKGStatus(content string) []PackageInfo {
	var packages []PackageInfo
	var current *PackageInfo

	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			if current != nil && current.Name != "" {
				packages = append(packages, *current)
			}
			current = nil
			continue
		}

		if strings.HasPrefix(line, "Package: ") {
			if current == nil {
				current = &PackageInfo{}
			}
			current.Name = strings.TrimPrefix(line, "Package: ")
		} else if strings.HasPrefix(line, "Version: ") && current != nil {
			current.Version = strings.TrimPrefix(line, "Version: ")
		} else if strings.HasPrefix(line, "Architecture: ") && current != nil {
			current.Architecture = strings.TrimPrefix(line, "Architecture: ")
		} else if strings.HasPrefix(line, "Source: ") && current != nil {
			current.Source = strings.TrimPrefix(line, "Source: ")
		}
	}

	if current != nil && current.Name != "" {
		packages = append(packages, *current)
	}

	return packages
}

func (s *ImageScanner) parseAPKStatus(content string) []PackageInfo {
	var packages []PackageInfo
	var current *PackageInfo

	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "P:") {
			if current != nil && current.Name != "" {
				packages = append(packages, *current)
			}
			current = &PackageInfo{
				Name: strings.TrimPrefix(line, "P:"),
			}
		} else if strings.HasPrefix(line, "V:") && current != nil {
			current.Version = strings.TrimPrefix(line, "V:")
		} else if strings.HasPrefix(line, "A:") && current != nil {
			current.Architecture = strings.TrimPrefix(line, "A:")
		}
	}

	if current != nil && current.Name != "" {
		packages = append(packages, *current)
	}

	return packages
}

func (s *ImageScanner) listRPMPackages(fsDir string) ([]PackageInfo, error) {
	var packages []PackageInfo

	rpmDBDir := filepath.Join(fsDir, "var", "lib", "rpm")
	if _, err := os.Stat(rpmDBDir); err != nil {
		return packages, err
	}

	packages = append(packages, PackageInfo{
		Name:    "rpm-based-packages",
		Version: "detected",
	})

	return packages, nil
}

func (s *ImageScanner) scanAppDependencies(extractDir string) ([]AppDependency, error) {
	var deps []AppDependency
	fsDir := filepath.Join(extractDir, "fs")

	filepath.Walk(fsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		relPath, _ := filepath.Rel(fsDir, path)

		if info.Name() == "package.json" {
			if data, err := os.ReadFile(path); err == nil {
				npmDeps := s.parsePackageJSON(string(data), relPath)
				deps = append(deps, npmDeps...)
			}
		} else if info.Name() == "requirements.txt" ||
			strings.HasSuffix(info.Name(), ".txt") && strings.Contains(info.Name(), "requirements") {
			if data, err := os.ReadFile(path); err == nil {
				pipDeps := s.parseRequirementsTxt(string(data), relPath)
				deps = append(deps, pipDeps...)
			}
		} else if info.Name() == "go.mod" {
			if data, err := os.ReadFile(path); err == nil {
				goDeps := s.parseGoMod(string(data), relPath)
				deps = append(deps, goDeps...)
			}
		} else if info.Name() == "Gemfile.lock" {
			if data, err := os.ReadFile(path); err == nil {
				rubyDeps := s.parseGemfileLock(string(data), relPath)
				deps = append(deps, rubyDeps...)
			}
		} else if info.Name() == "pom.xml" {
			if data, err := os.ReadFile(path); err == nil {
				javaDeps := s.parsePomXML(string(data), relPath)
				deps = append(deps, javaDeps...)
			}
		}

		return nil
	})

	return deps, nil
}

func (s *ImageScanner) parsePackageJSON(content, relPath string) []AppDependency {
	var deps []AppDependency

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return deps
	}

	if depsMap, ok := data["dependencies"].(map[string]interface{}); ok {
		for name, version := range depsMap {
			verStr := fmt.Sprintf("%v", version)
			deps = append(deps, AppDependency{
				Manager:  "npm",
				Name:     name,
				Version:  verStr,
				FilePath: relPath,
			})
		}
	}

	if devDepsMap, ok := data["devDependencies"].(map[string]interface{}); ok {
		for name, version := range devDepsMap {
			verStr := fmt.Sprintf("%v", version)
			deps = append(deps, AppDependency{
				Manager:  "npm-dev",
				Name:     name,
				Version:  verStr,
				FilePath: relPath,
			})
		}
	}

	return deps
}

func (s *ImageScanner) parseRequirementsTxt(content, relPath string) []AppDependency {
	var deps []AppDependency

	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := scanner.Text()
		line = strings.TrimSpace(line)

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		var name, version string
		if idx := strings.IndexAny(line, "=<>~"); idx > 0 {
			name = strings.TrimSpace(line[:idx])
			version = strings.TrimSpace(line[idx:])
		} else {
			name = line
			version = "unknown"
		}

		if name != "" {
			deps = append(deps, AppDependency{
				Manager:  "pip",
				Name:     name,
				Version:  version,
				FilePath: relPath,
			})
		}
	}

	return deps
}

func (s *ImageScanner) parseGoMod(content, relPath string) []AppDependency {
	var deps []AppDependency

	scanner := bufio.NewScanner(strings.NewReader(content))
	inRequire := false

	for scanner.Scan() {
		line := scanner.Text()
		line = strings.TrimSpace(line)

		if strings.HasPrefix(line, "require (") {
			inRequire = true
			continue
		}
		if strings.HasPrefix(line, ")") && inRequire {
			inRequire = false
			continue
		}

		if inRequire && !strings.HasPrefix(line, "//") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				deps = append(deps, AppDependency{
					Manager:  "go",
					Name:     parts[0],
					Version:  parts[1],
					FilePath: relPath,
				})
			}
		}
	}

	return deps
}

func (s *ImageScanner) parseGemfileLock(content, relPath string) []AppDependency {
	var deps []AppDependency

	scanner := bufio.NewScanner(strings.NewReader(content))
	inGEM := false
	inSpecs := false

	for scanner.Scan() {
		line := scanner.Text()

		if line == "GEM" {
			inGEM = true
			continue
		}
		if inGEM && strings.HasPrefix(line, "  specs:") {
			inSpecs = true
			continue
		}
		if inSpecs && (line == "" || strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "    ")) {
			inSpecs = false
			continue
		}

		if inSpecs && strings.HasPrefix(line, "    ") {
			matched := regexp.MustCompile(`^\s+([a-zA-Z0-9_-]+)\s*\(([^)]+)\)`).FindStringSubmatch(line)
			if len(matched) >= 3 {
				deps = append(deps, AppDependency{
					Manager:  "bundler",
					Name:     matched[1],
					Version:  matched[2],
					FilePath: relPath,
				})
			}
		}
	}

	return deps
}

func (s *ImageScanner) parsePomXML(content, relPath string) []AppDependency {
	var deps []AppDependency

	depRegex := regexp.MustCompile(`<dependency>.*?</dependency>`)
	groupIdRegex := regexp.MustCompile(`<groupId>([^<]+)</groupId>`)
	artifactIdRegex := regexp.MustCompile(`<artifactId>([^<]+)</artifactId>`)
	versionRegex := regexp.MustCompile(`<version>([^<]+)</version>`)

	depsStr := depRegex.FindAllString(content, -1)
	for _, depStr := range depsStr {
		groupId := groupIdRegex.FindStringSubmatch(depStr)
		artifactId := artifactIdRegex.FindStringSubmatch(depStr)
		version := versionRegex.FindStringSubmatch(depStr)

		if len(artifactId) >= 2 {
			name := artifactId[1]
			if len(groupId) >= 2 {
				name = groupId[1] + ":" + name
			}
			ver := "unknown"
			if len(version) >= 2 {
				ver = version[1]
			}
			deps = append(deps, AppDependency{
				Manager:  "maven",
				Name:     name,
				Version:  ver,
				FilePath: relPath,
			})
		}
	}

	return deps
}

func (s *ImageScanner) detectOSVulnerabilities(packages []PackageInfo, osInfo *OSInfo) ([]OSVulnerability, error) {
	var vulns []OSVulnerability

	knownVulns := s.getKnownOSVulnerabilities()

	for _, pkg := range packages {
		if vuln, exists := knownVulns[pkg.Name]; exists {
			if s.versionCompare(pkg.Version, vuln.FixedVersion) < 0 {
				vulns = append(vulns, OSVulnerability{
					VulnerabilityID:  vuln.VulnerabilityID,
					PackageName:      pkg.Name,
					InstalledVersion: pkg.Version,
					FixedVersion:     vuln.FixedVersion,
					Severity:         vuln.Severity,
					Title:            vuln.Title,
					Description:      vuln.Description,
					References:       vuln.References,
					CVSS:             vuln.CVSS,
				})
			}
		}
	}

	return vulns, nil
}

func (s *ImageScanner) detectAppVulnerabilities(deps []AppDependency) ([]AppVulnerability, error) {
	var vulns []AppVulnerability

	knownVulns := s.getKnownAppVulnerabilities()

	for _, dep := range deps {
		if vulnList, exists := knownVulns[dep.Name]; exists {
			for _, vuln := range vulnList {
				if s.versionCompare(dep.Version, vuln.FixedVersion) < 0 {
					vulns = append(vulns, AppVulnerability{
						VulnerabilityID:  vuln.VulnerabilityID,
						PackageName:      dep.Name,
						InstalledVersion: dep.Version,
						FixedVersion:     vuln.FixedVersion,
						Severity:         vuln.Severity,
						Title:            vuln.Title,
						Description:      vuln.Description,
						Ecosystem:        dep.Manager,
						FilePath:         dep.FilePath,
						References:       vuln.References,
						CVSS:             vuln.CVSS,
					})
				}
			}
		}
	}

	return vulns, nil
}

func (s *ImageScanner) getKnownOSVulnerabilities() map[string]OSVulnerability {
	return map[string]OSVulnerability{
		"openssl": {
			VulnerabilityID: "CVE-2024-0001",
			FixedVersion:    "3.0.13",
			Severity:        SeverityHigh,
			Title:           "OpenSSL 缓冲区溢出漏洞",
			Description:     "OpenSSL 中存在缓冲区溢出漏洞，可能允许远程攻击者执行任意代码",
			References:      []string{"https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-0001"},
			CVSS: &CVSSInfo{
				Score:   8.8,
				Vector:  "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H",
				Version: "3.1",
			},
		},
		"libc6": {
			VulnerabilityID: "CVE-2024-0002",
			FixedVersion:    "2.38",
			Severity:        SeverityCritical,
			Title:           "glibc 本地提权漏洞",
			Description:     "glibc 的 ld.so 中存在本地提权漏洞",
			References:      []string{"https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-0002"},
			CVSS: &CVSSInfo{
				Score:   7.8,
				Vector:  "CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
				Version: "3.1",
			},
		},
		"curl": {
			VulnerabilityID: "CVE-2024-0003",
			FixedVersion:    "8.5.0",
			Severity:        SeverityHigh,
			Title:           "curl SOCKS5 代理缓冲区溢出",
			Description:     "curl 在处理 SOCKS5 代理响应时存在缓冲区溢出",
			References:      []string{"https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-0003"},
			CVSS: &CVSSInfo{
				Score:   7.5,
				Vector:  "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
				Version: "3.1",
			},
		},
	}
}

func (s *ImageScanner) getKnownAppVulnerabilities() map[string][]AppVulnerability {
	return map[string][]AppVulnerability{
		"lodash": {
			{
				VulnerabilityID: "CVE-2023-0001",
				FixedVersion:    "4.17.21",
				Severity:        SeverityHigh,
				Title:           "lodash 原型污染漏洞",
				Description:     "lodash 的 set 函数存在原型污染漏洞",
				References:      []string{"https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-0001"},
				CVSS: &CVSSInfo{
					Score:   7.5,
					Vector:  "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N",
					Version: "3.1",
				},
			},
		},
		"express": {
			{
				VulnerabilityID: "CVE-2023-0002",
				FixedVersion:    "4.18.2",
				Severity:        SeverityMedium,
				Title:           "Express.js qs 模块拒绝服务",
				Description:     "Express.js 使用的 qs 模块存在拒绝服务漏洞",
				References:      []string{"https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-0002"},
				CVSS: &CVSSInfo{
					Score:   5.3,
					Vector:  "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L",
					Version: "3.1",
				},
			},
		},
		"requests": {
			{
				VulnerabilityID: "CVE-2023-0003",
				FixedVersion:    "2.31.0",
				Severity:        SeverityLow,
				Title:           "requests 代理 URL 解析漏洞",
				Description:     "requests 在处理代理 URL 时存在解析漏洞",
				References:      []string{"https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-0003"},
				CVSS: &CVSSInfo{
					Score:   3.1,
					Vector:  "CVSS:3.1/AV:L/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N",
					Version: "3.1",
				},
			},
		},
		"django": {
			{
				VulnerabilityID: "CVE-2023-0004",
				FixedVersion:    "4.2.6",
				Severity:        SeverityCritical,
				Title:           "Django SQL注入漏洞",
				Description:     "Django 的 QuerySet 存在 SQL注入漏洞",
				References:      []string{"https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-0004"},
				CVSS: &CVSSInfo{
					Score:   9.8,
					Vector:  "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
					Version: "3.1",
				},
			},
		},
	}
}

func (s *ImageScanner) versionCompare(v1, v2 string) int {
	v1 = strings.TrimLeft(v1, "=<>~^v")
	v2 = strings.TrimLeft(v2, "=<>~^v")

	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	for i := 0; i < maxLen; i++ {
		var p1, p2 string
		if i < len(parts1) {
			p1 = parts1[i]
		}
		if i < len(parts2) {
			p2 = parts2[i]
		}

		num1 := s.parseVersionPart(p1)
		num2 := s.parseVersionPart(p2)

		if num1 < num2 {
			return -1
		} else if num1 > num2 {
			return 1
		}
	}

	return 0
}

func (s *ImageScanner) parseVersionPart(part string) int {
	var num int
	for _, c := range part {
		if c >= '0' && c <= '9' {
			num = num*10 + int(c-'0')
		} else {
			break
		}
	}
	return num
}

func PullImage(ctx context.Context, imageName string) error {
	cmd := exec.CommandContext(ctx, "docker", "pull", imageName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to pull image: %w, output: %s", err, string(output))
	}
	return nil
}

func ImageExists(imageName string) bool {
	cmd := exec.Command("docker", "image", "inspect", imageName)
	err := cmd.Run()
	return err == nil
}
