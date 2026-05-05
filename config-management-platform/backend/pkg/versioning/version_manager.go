package versioning

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type ConfigVersion struct {
	ID          string            `json:"id"`
	Version     int               `json:"version"`
	ConfigID    string            `json:"config_id"`
	Environment string            `json:"environment"`
	Content     string            `json:"content"`
	Format      string            `json:"format"`
	Hash        string            `json:"hash"`
	CreatedBy   string            `json:"created_by"`
	CreatedAt   time.Time         `json:"created_at"`
	Comment     string            `json:"comment"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	PreviousID  string            `json:"previous_id,omitempty"`
}

type VersionManager struct {
	storageDir string
	mu         sync.RWMutex
}

type VersionHistory struct {
	ConfigID    string          `json:"config_id"`
	Environment string          `json:"environment"`
	Versions    []ConfigVersion `json:"versions"`
	Latest      int             `json:"latest"`
}

type RollbackResult struct {
	Success        bool          `json:"success"`
	RolledBackTo   ConfigVersion `json:"rolled_back_to"`
	NewVersion     ConfigVersion `json:"new_version"`
	Message        string        `json:"message"`
}

type DiffResult struct {
	LeftVersion   int      `json:"left_version"`
	RightVersion  int      `json:"right_version"`
	AddedLines    int      `json:"added_lines"`
	RemovedLines  int      `json:"removed_lines"`
	DiffContent   string   `json:"diff_content"`
	Changes       []Change `json:"changes"`
}

type Change struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	Line    int    `json:"line"`
}

func NewVersionManager(storageDir string) (*VersionManager, error) {
	absPath, err := filepath.Abs(storageDir)
	if err != nil {
		return nil, fmt.Errorf("无效的存储路径: %w", err)
	}
	
	if err := os.MkdirAll(absPath, 0755); err != nil {
		return nil, fmt.Errorf("创建存储目录失败: %w", err)
	}
	
	return &VersionManager{
		storageDir: absPath,
	}, nil
}

func (vm *VersionManager) CreateVersion(
	configID, environment, content, format, createdBy, comment string,
	metadata map[string]string,
) (*ConfigVersion, error) {
	vm.mu.Lock()
	defer vm.mu.Unlock()
	
	if configID == "" {
		return nil, errors.New("配置 ID 不能为空")
	}
	
	if content == "" {
		return nil, errors.New("配置内容不能为空")
	}
	
	environmentDir := vm.getEnvironmentDir(environment)
	if err := os.MkdirAll(environmentDir, 0755); err != nil {
		return nil, fmt.Errorf("创建环境目录失败: %w", err)
	}
	
	nextVersion := vm.getNextVersion(configID, environment)
	
	hash := computeHash(content)
	
	versionID := generateVersionID(configID, environment, nextVersion)
	
	version := &ConfigVersion{
		ID:          versionID,
		Version:     nextVersion,
		ConfigID:    configID,
		Environment: environment,
		Content:     content,
		Format:      format,
		Hash:        hash,
		CreatedBy:   createdBy,
		CreatedAt:   time.Now(),
		Comment:     comment,
		Metadata:    metadata,
	}
	
	if nextVersion > 1 {
		prevVersion, err := vm.getVersion(configID, environment, nextVersion-1)
		if err == nil {
			version.PreviousID = prevVersion.ID
		}
	}
	
	if err := vm.saveVersion(version); err != nil {
		return nil, fmt.Errorf("保存版本失败: %w", err)
	}
	
	if err := vm.updateLatestVersion(configID, environment, nextVersion); err != nil {
		return nil, fmt.Errorf("更新最新版本失败: %w", err)
	}
	
	return version, nil
}

func (vm *VersionManager) GetVersion(configID, environment string, version int) (*ConfigVersion, error) {
	vm.mu.RLock()
	defer vm.mu.RUnlock()
	
	return vm.getVersion(configID, environment, version)
}

func (vm *VersionManager) GetLatestVersion(configID, environment string) (*ConfigVersion, error) {
	vm.mu.RLock()
	defer vm.mu.RUnlock()
	
	latestVersion := vm.getLatestVersionNumber(configID, environment)
	if latestVersion == 0 {
		return nil, errors.New("没有找到该配置的版本历史")
	}
	
	return vm.getVersion(configID, environment, latestVersion)
}

func (vm *VersionManager) GetVersionHistory(configID, environment string) (*VersionHistory, error) {
	vm.mu.RLock()
	defer vm.mu.RUnlock()
	
	versionsDir := vm.getVersionsDir(configID, environment)
	
	entries, err := os.ReadDir(versionsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return &VersionHistory{
				ConfigID:    configID,
				Environment: environment,
				Versions:    []ConfigVersion{},
				Latest:      0,
			}, nil
		}
		return nil, fmt.Errorf("读取版本目录失败: %w", err)
	}
	
	var versions []ConfigVersion
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		
		name := entry.Name()
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		
		versionStr := strings.TrimSuffix(name, ".json")
		versionNum, err := strconv.Atoi(versionStr)
		if err != nil {
			continue
		}
		
		version, err := vm.getVersion(configID, environment, versionNum)
		if err != nil {
			continue
		}
		
		versions = append(versions, *version)
	}
	
	sort.Slice(versions, func(i, j int) bool {
		return versions[i].Version < versions[j].Version
	})
	
	latest := 0
	if len(versions) > 0 {
		latest = versions[len(versions)-1].Version
	}
	
	return &VersionHistory{
		ConfigID:    configID,
		Environment: environment,
		Versions:    versions,
		Latest:      latest,
	}, nil
}

func (vm *VersionManager) RollbackToVersion(
	configID, environment string,
	targetVersion int,
	createdBy, reason string,
) (*RollbackResult, error) {
	vm.mu.Lock()
	defer vm.mu.Unlock()
	
	targetVer, err := vm.getVersion(configID, environment, targetVersion)
	if err != nil {
		return nil, fmt.Errorf("目标版本不存在: %w", err)
	}
	
	latestVersion := vm.getLatestVersionNumber(configID, environment)
	
	if targetVersion == latestVersion {
		return nil, errors.New("目标版本已经是当前最新版本")
	}
	
	comment := fmt.Sprintf("回滚到版本 %d. 原因: %s", targetVersion, reason)
	
	metadata := map[string]string{
		"rollback_from": fmt.Sprintf("v%d", latestVersion),
		"rollback_to":   fmt.Sprintf("v%d", targetVersion),
		"rollback_reason": reason,
	}
	
	newVersion, err := vm.createVersionInternal(
		configID,
		environment,
		targetVer.Content,
		targetVer.Format,
		createdBy,
		comment,
		metadata,
	)
	if err != nil {
		return nil, fmt.Errorf("创建回滚版本失败: %w", err)
	}
	
	return &RollbackResult{
		Success:      true,
		RolledBackTo: *targetVer,
		NewVersion:   *newVersion,
		Message:      fmt.Sprintf("已成功回滚到版本 %d，新版本号: %d", targetVersion, newVersion.Version),
	}, nil
}

func (vm *VersionManager) CompareVersions(
	configID, environment string,
	leftVersion, rightVersion int,
) (*DiffResult, error) {
	vm.mu.RLock()
	defer vm.mu.RUnlock()
	
	leftVer, err := vm.getVersion(configID, environment, leftVersion)
	if err != nil {
		return nil, fmt.Errorf("左侧版本不存在: %w", err)
	}
	
	rightVer, err := vm.getVersion(configID, environment, rightVersion)
	if err != nil {
		return nil, fmt.Errorf("右侧版本不存在: %w", err)
	}
	
	return computeTextDiff(leftVer.Content, rightVer.Content, leftVersion, rightVersion), nil
}

func (vm *VersionManager) DeleteVersion(configID, environment string, version int) error {
	vm.mu.Lock()
	defer vm.mu.Unlock()
	
	versionFile := vm.getVersionFilePath(configID, environment, version)
	
	if _, err := os.Stat(versionFile); os.IsNotExist(err) {
		return errors.New("版本不存在")
	}
	
	if err := os.Remove(versionFile); err != nil {
		return fmt.Errorf("删除版本文件失败: %w", err)
	}
	
	return nil
}

func (vm *VersionManager) getVersion(configID, environment string, version int) (*ConfigVersion, error) {
	versionFile := vm.getVersionFilePath(configID, environment, version)
	
	data, err := os.ReadFile(versionFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, errors.New("版本不存在")
		}
		return nil, fmt.Errorf("读取版本文件失败: %w", err)
	}
	
	var versionObj ConfigVersion
	if err := json.Unmarshal(data, &versionObj); err != nil {
		return nil, fmt.Errorf("解析版本数据失败: %w", err)
	}
	
	return &versionObj, nil
}

func (vm *VersionManager) getNextVersion(configID, environment string) int {
	latest := vm.getLatestVersionNumber(configID, environment)
	return latest + 1
}

func (vm *VersionManager) getLatestVersionNumber(configID, environment string) int {
	latestFile := vm.getLatestFilePath(configID, environment)
	
	data, err := os.ReadFile(latestFile)
	if err != nil {
		return 0
	}
	
	var latest int
	if err := json.Unmarshal(data, &latest); err != nil {
		return 0
	}
	
	return latest
}

func (vm *VersionManager) updateLatestVersion(configID, environment string, version int) error {
	latestFile := vm.getLatestFilePath(configID, environment)
	
	data, err := json.Marshal(version)
	if err != nil {
		return fmt.Errorf("序列化最新版本号失败: %w", err)
	}
	
	if err := os.WriteFile(latestFile, data, 0644); err != nil {
		return fmt.Errorf("写入最新版本文件失败: %w", err)
	}
	
	return nil
}

func (vm *VersionManager) saveVersion(version *ConfigVersion) error {
	versionFile := vm.getVersionFilePath(version.ConfigID, version.Environment, version.Version)
	
	data, err := json.MarshalIndent(version, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化版本数据失败: %w", err)
	}
	
	dir := filepath.Dir(versionFile)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("创建版本目录失败: %w", err)
	}
	
	if err := os.WriteFile(versionFile, data, 0644); err != nil {
		return fmt.Errorf("写入版本文件失败: %w", err)
	}
	
	return nil
}

func (vm *VersionManager) createVersionInternal(
	configID, environment, content, format, createdBy, comment string,
	metadata map[string]string,
) (*ConfigVersion, error) {
	if configID == "" {
		return nil, errors.New("配置 ID 不能为空")
	}
	
	if content == "" {
		return nil, errors.New("配置内容不能为空")
	}
	
	environmentDir := vm.getEnvironmentDir(environment)
	if err := os.MkdirAll(environmentDir, 0755); err != nil {
		return nil, fmt.Errorf("创建环境目录失败: %w", err)
	}
	
	nextVersion := vm.getNextVersion(configID, environment)
	
	hash := computeHash(content)
	
	versionID := generateVersionID(configID, environment, nextVersion)
	
	version := &ConfigVersion{
		ID:          versionID,
		Version:     nextVersion,
		ConfigID:    configID,
		Environment: environment,
		Content:     content,
		Format:      format,
		Hash:        hash,
		CreatedBy:   createdBy,
		CreatedAt:   time.Now(),
		Comment:     comment,
		Metadata:    metadata,
	}
	
	if nextVersion > 1 {
		prevVersion, err := vm.getVersion(configID, environment, nextVersion-1)
		if err == nil {
			version.PreviousID = prevVersion.ID
		}
	}
	
	if err := vm.saveVersion(version); err != nil {
		return nil, fmt.Errorf("保存版本失败: %w", err)
	}
	
	if err := vm.updateLatestVersion(configID, environment, nextVersion); err != nil {
		return nil, fmt.Errorf("更新最新版本失败: %w", err)
	}
	
	return version, nil
}

func (vm *VersionManager) getEnvironmentDir(environment string) string {
	return filepath.Join(vm.storageDir, "environments", environment)
}

func (vm *VersionManager) getVersionsDir(configID, environment string) string {
	return filepath.Join(vm.getEnvironmentDir(environment), "configs", configID, "versions")
}

func (vm *VersionManager) getVersionFilePath(configID, environment string, version int) string {
	return filepath.Join(vm.getVersionsDir(configID, environment), fmt.Sprintf("%d.json", version))
}

func (vm *VersionManager) getLatestFilePath(configID, environment string) string {
	return filepath.Join(vm.getVersionsDir(configID, environment), "latest")
}

func computeHash(content string) string {
	hasher := sha256.New()
	hasher.Write([]byte(content))
	return hex.EncodeToString(hasher.Sum(nil))
}

func generateVersionID(configID, environment string, version int) string {
	timestamp := time.Now().UnixNano()
	hashData := fmt.Sprintf("%s:%s:%d:%d", configID, environment, version, timestamp)
	hasher := sha256.New()
	hasher.Write([]byte(hashData))
	return "v_" + hex.EncodeToString(hasher.Sum(nil))[:16]
}

func computeTextDiff(leftText, rightText string, leftVersion, rightVersion int) *DiffResult {
	leftLines := strings.Split(leftText, "\n")
	rightLines := strings.Split(rightText, "\n")
	
	added := 0
	removed := 0
	var changes []Change
	var diffLines []string
	
	maxLen := max(len(leftLines), len(rightLines))
	
	for i := 0; i < maxLen; i++ {
		var leftLine, rightLine string
		if i < len(leftLines) {
			leftLine = leftLines[i]
		}
		if i < len(rightLines) {
			rightLine = rightLines[i]
		}
		
		if i >= len(leftLines) {
			added++
			changes = append(changes, Change{
				Type:    "added",
				Content: rightLine,
				Line:    i + 1,
			})
			diffLines = append(diffLines, fmt.Sprintf("+ %s", rightLine))
		} else if i >= len(rightLines) {
			removed++
			changes = append(changes, Change{
				Type:    "removed",
				Content: leftLine,
				Line:    i + 1,
			})
			diffLines = append(diffLines, fmt.Sprintf("- %s", leftLine))
		} else if leftLine != rightLine {
			removed++
			added++
			changes = append(changes, Change{
				Type:    "removed",
				Content: leftLine,
				Line:    i + 1,
			})
			changes = append(changes, Change{
				Type:    "added",
				Content: rightLine,
				Line:    i + 1,
			})
			diffLines = append(diffLines, fmt.Sprintf("- %s", leftLine))
			diffLines = append(diffLines, fmt.Sprintf("+ %s", rightLine))
		} else {
			diffLines = append(diffLines, fmt.Sprintf("  %s", leftLine))
		}
	}
	
	return &DiffResult{
		LeftVersion:  leftVersion,
		RightVersion: rightVersion,
		AddedLines:   added,
		RemovedLines: removed,
		DiffContent:  strings.Join(diffLines, "\n"),
		Changes:      changes,
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
