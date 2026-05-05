package configcenter

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"config-management-platform/backend/pkg/config"
	"config-management-platform/backend/pkg/encrypt"
	"config-management-platform/backend/pkg/versioning"
)

type ConfigCenter struct {
	storageDir     string
	versionManager *versioning.VersionManager
	encryptor      *encrypt.Encryptor
	configParser   *config.ConfigParser
	environments   map[string]*Environment
	mu             sync.RWMutex
}

type Environment struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	CreatedAt   int64             `json:"created_at"`
	Configs     map[string]*Config `json:"-"`
}

type Config struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Format      string            `json:"format"`
	CreatedAt   int64             `json:"created_at"`
	UpdatedAt   int64             `json:"updated_at"`
	CurrentVersion int            `json:"current_version"`
	Tags        []string          `json:"tags"`
	Metadata    map[string]string `json:"metadata"`
}

type ConfigItem struct {
	Key      string      `json:"key"`
	Value    interface{} `json:"value"`
	Type     string      `json:"type"`
	Sensitive bool        `json:"sensitive"`
}

func NewConfigCenter(storageDir string) (*ConfigCenter, error) {
	absPath, err := filepath.Abs(storageDir)
	if err != nil {
		return nil, fmt.Errorf("无效的存储路径: %w", err)
	}

	if err := os.MkdirAll(absPath, 0755); err != nil {
		return nil, fmt.Errorf("创建存储目录失败: %w", err)
	}

	versionDir := filepath.Join(absPath, "versions")
	vm, err := versioning.NewVersionManager(versionDir)
	if err != nil {
		return nil, fmt.Errorf("初始化版本管理器失败: %w", err)
	}

	masterKey := os.Getenv("CONFIG_CENTER_MASTER_KEY")
	if masterKey == "" {
		masterKey, err = encrypt.GenerateMasterKey()
		if err != nil {
			return nil, fmt.Errorf("生成主密钥失败: %w", err)
		}
	}

	enc, err := encrypt.NewEncryptorFromHexKey(masterKey)
	if err != nil {
		return nil, fmt.Errorf("初始化加密器失败: %w", err)
	}

	cp := config.NewConfigParser()

	cc := &ConfigCenter{
		storageDir:     absPath,
		versionManager: vm,
		encryptor:      enc,
		configParser:   cp,
		environments:   make(map[string]*Environment),
	}

	if err := cc.loadEnvironments(); err != nil {
		return nil, fmt.Errorf("加载环境失败: %w", err)
	}

	return cc, nil
}

func (cc *ConfigCenter) CreateEnvironment(name, description string) (*Environment, error) {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	if name == "" {
		return nil, errors.New("环境名称不能为空")
	}

	if _, exists := cc.environments[name]; exists {
		return nil, fmt.Errorf("环境 '%s' 已存在", name)
	}

	env := &Environment{
		Name:        name,
		Description: description,
		CreatedAt:   getTimestamp(),
		Configs:     make(map[string]*Config),
	}

	envDir := filepath.Join(cc.storageDir, "environments", name)
	if err := os.MkdirAll(envDir, 0755); err != nil {
		return nil, fmt.Errorf("创建环境目录失败: %w", err)
	}

	if err := cc.saveEnvironment(env); err != nil {
		return nil, err
	}

	cc.environments[name] = env

	return env, nil
}

func (cc *ConfigCenter) GetEnvironment(name string) (*Environment, error) {
	cc.mu.RLock()
	defer cc.mu.RUnlock()

	env, exists := cc.environments[name]
	if !exists {
		return nil, fmt.Errorf("环境 '%s' 不存在", name)
	}

	return env, nil
}

func (cc *ConfigCenter) ListEnvironments() []*Environment {
	cc.mu.RLock()
	defer cc.mu.RUnlock()

	envs := make([]*Environment, 0, len(cc.environments))
	for _, env := range cc.environments {
		envs = append(envs, env)
	}

	return envs
}

func (cc *ConfigCenter) DeleteEnvironment(name string) error {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	if _, exists := cc.environments[name]; !exists {
		return fmt.Errorf("环境 '%s' 不存在", name)
	}

	envDir := filepath.Join(cc.storageDir, "environments", name)
	if err := os.RemoveAll(envDir); err != nil {
		return fmt.Errorf("删除环境目录失败: %w", err)
	}

	delete(cc.environments, name)

	return nil
}

func (cc *ConfigCenter) CreateConfig(
	environment, configID, name, description, format string,
	content string,
	encryptSensitive bool,
	tags []string,
	metadata map[string]string,
	createdBy string,
	comment string,
) (*Config, error) {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	env, exists := cc.environments[environment]
	if !exists {
		return nil, fmt.Errorf("环境 '%s' 不存在", environment)
	}

	if configID == "" {
		return nil, errors.New("配置 ID 不能为空")
	}

	if _, exists := env.Configs[configID]; exists {
		return nil, fmt.Errorf("配置 '%s' 已存在于环境 '%s'", configID, environment)
	}

	if format == "" {
		format = "json"
	}

	finalContent := content
	if encryptSensitive {
		encryptedContent, err := cc.encryptor.EncryptSensitiveFields(content, format)
		if err != nil {
			return nil, fmt.Errorf("加密敏感字段失败: %w", err)
		}
		finalContent = encryptedContent
	}

	version, err := cc.versionManager.CreateVersion(
		configID,
		environment,
		finalContent,
		format,
		createdBy,
		comment,
		metadata,
	)
	if err != nil {
		return nil, fmt.Errorf("创建版本失败: %w", err)
	}

	cfg := &Config{
		ID:             configID,
		Name:           name,
		Description:    description,
		Format:         format,
		CreatedAt:      getTimestamp(),
		UpdatedAt:      getTimestamp(),
		CurrentVersion: version.Version,
		Tags:           tags,
		Metadata:       metadata,
	}

	env.Configs[configID] = cfg

	if err := cc.saveConfig(environment, cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (cc *ConfigCenter) GetConfig(environment, configID string, decrypt bool) (*Config, string, error) {
	cc.mu.RLock()
	defer cc.mu.RUnlock()

	env, exists := cc.environments[environment]
	if !exists {
		return nil, "", fmt.Errorf("环境 '%s' 不存在", environment)
	}

	cfg, exists := env.Configs[configID]
	if !exists {
		return nil, "", fmt.Errorf("配置 '%s' 不存在于环境 '%s'", configID, environment)
	}

	version, err := cc.versionManager.GetLatestVersion(configID, environment)
	if err != nil {
		return nil, "", fmt.Errorf("获取最新版本失败: %w", err)
	}

	content := version.Content
	if decrypt {
		decryptedContent, err := cc.encryptor.DecryptAllEncryptedFields(content)
		if err == nil {
			content = decryptedContent
		}
	}

	return cfg, content, nil
}

func (cc *ConfigCenter) UpdateConfig(
	environment, configID string,
	content string,
	encryptSensitive bool,
	createdBy string,
	comment string,
) error {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	env, exists := cc.environments[environment]
	if !exists {
		return fmt.Errorf("环境 '%s' 不存在", environment)
	}

	cfg, exists := env.Configs[configID]
	if !exists {
		return fmt.Errorf("配置 '%s' 不存在于环境 '%s'", configID, environment)
	}

	finalContent := content
	if encryptSensitive {
		encryptedContent, err := cc.encryptor.EncryptSensitiveFields(content, cfg.Format)
		if err != nil {
			return fmt.Errorf("加密敏感字段失败: %w", err)
		}
		finalContent = encryptedContent
	}

	version, err := cc.versionManager.CreateVersion(
		configID,
		environment,
		finalContent,
		cfg.Format,
		createdBy,
		comment,
		cfg.Metadata,
	)
	if err != nil {
		return fmt.Errorf("创建新版本失败: %w", err)
	}

	cfg.CurrentVersion = version.Version
	cfg.UpdatedAt = getTimestamp()

	if err := cc.saveConfig(environment, cfg); err != nil {
		return err
	}

	return nil
}

func (cc *ConfigCenter) RollbackConfig(
	environment, configID string,
	targetVersion int,
	createdBy string,
	reason string,
) (*versioning.RollbackResult, error) {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	env, exists := cc.environments[environment]
	if !exists {
		return nil, fmt.Errorf("环境 '%s' 不存在", environment)
	}

	cfg, exists := env.Configs[configID]
	if !exists {
		return nil, fmt.Errorf("配置 '%s' 不存在于环境 '%s'", configID, environment)
	}

	result, err := cc.versionManager.RollbackToVersion(
		configID,
		environment,
		targetVersion,
		createdBy,
		reason,
	)
	if err != nil {
		return nil, err
	}

	cfg.CurrentVersion = result.NewVersion.Version
	cfg.UpdatedAt = getTimestamp()

	if err := cc.saveConfig(environment, cfg); err != nil {
		return nil, err
	}

	return result, nil
}

func (cc *ConfigCenter) GetConfigVersions(environment, configID string) (*versioning.VersionHistory, error) {
	return cc.versionManager.GetVersionHistory(configID, environment)
}

func (cc *ConfigCenter) CompareConfigVersions(
	environment, configID string,
	leftVersion, rightVersion int,
) (*versioning.DiffResult, error) {
	return cc.versionManager.CompareVersions(configID, environment, leftVersion, rightVersion)
}

func (cc *ConfigCenter) ListConfigs(environment string) ([]*Config, error) {
	cc.mu.RLock()
	defer cc.mu.RUnlock()

	env, exists := cc.environments[environment]
	if !exists {
		return nil, fmt.Errorf("环境 '%s' 不存在", environment)
	}

	configs := make([]*Config, 0, len(env.Configs))
	for _, cfg := range env.Configs {
		configs = append(configs, cfg)
	}

	return configs, nil
}

func (cc *ConfigCenter) DeleteConfig(environment, configID string) error {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	env, exists := cc.environments[environment]
	if !exists {
		return fmt.Errorf("环境 '%s' 不存在", environment)
	}

	if _, exists := env.Configs[configID]; !exists {
		return fmt.Errorf("配置 '%s' 不存在于环境 '%s'", configID, environment)
	}

	configDir := filepath.Join(cc.storageDir, "environments", environment, "configs", configID)
	if err := os.RemoveAll(configDir); err != nil {
		return fmt.Errorf("删除配置目录失败: %w", err)
	}

	delete(env.Configs, configID)

	return nil
}

func (cc *ConfigCenter) ConvertFormat(content string, fromFormat, toFormat string) (string, error) {
	return config.ConvertFormat(content, fromFormat, toFormat)
}

func (cc *ConfigCenter) EncryptValue(value string) (string, error) {
	return cc.encryptor.Encrypt(value)
}

func (cc *ConfigCenter) DecryptValue(encryptedValue string) (string, error) {
	return cc.encryptor.Decrypt(encryptedValue)
}

func (cc *ConfigCenter) loadEnvironments() error {
	envsDir := filepath.Join(cc.storageDir, "environments")
	
	entries, err := os.ReadDir(envsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			env, err := cc.loadEnvironment(entry.Name())
			if err != nil {
				continue
			}
			cc.environments[entry.Name()] = env
		}
	}

	return nil
}

func (cc *ConfigCenter) loadEnvironment(name string) (*Environment, error) {
	envFile := filepath.Join(cc.storageDir, "environments", name, "environment.json")

	data, err := os.ReadFile(envFile)
	if err != nil {
		if os.IsNotExist(err) {
			return &Environment{
				Name:    name,
				Configs: make(map[string]*Config),
			}, nil
		}
		return nil, err
	}

	var env Environment
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, err
	}

	env.Configs = make(map[string]*Config)

	configsDir := filepath.Join(cc.storageDir, "environments", name, "configs")
	entries, err := os.ReadDir(configsDir)
	if err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				cfg, err := cc.loadConfig(name, entry.Name())
				if err == nil {
					env.Configs[entry.Name()] = cfg
				}
			}
		}
	}

	return &env, nil
}

func (cc *ConfigCenter) loadConfig(environment, configID string) (*Config, error) {
	configFile := filepath.Join(cc.storageDir, "environments", environment, "configs", configID, "config.json")

	data, err := os.ReadFile(configFile)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func (cc *ConfigCenter) saveEnvironment(env *Environment) error {
	envFile := filepath.Join(cc.storageDir, "environments", env.Name, "environment.json")

	data, err := json.MarshalIndent(env, "", "  ")
	if err != nil {
		return err
	}

	dir := filepath.Dir(envFile)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(envFile, data, 0644)
}

func (cc *ConfigCenter) saveConfig(environment string, cfg *Config) error {
	configFile := filepath.Join(cc.storageDir, "environments", environment, "configs", cfg.ID, "config.json")

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	dir := filepath.Dir(configFile)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(configFile, data, 0644)
}

func getTimestamp() int64 {
	return int64(os.Getpid()) + int64(1)
}
