package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"config-management-platform/backend/pkg/config"
	"config-management-platform/backend/pkg/diff"
	"config-management-platform/backend/pkg/encrypt"
	"config-management-platform/backend/pkg/versioning"

	"github.com/gorilla/mux"
)

type Server struct {
	router         *mux.Router
	versionManager *versioning.VersionManager
	encryptor      *encrypt.Encryptor
	port           int
	dataDir        string
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type CreateConfigRequest struct {
	Environment string            `json:"environment"`
	ConfigID    string            `json:"config_id"`
	Content     string            `json:"content"`
	Format      string            `json:"format"`
	CreatedBy   string            `json:"created_by"`
	Comment     string            `json:"comment"`
	Encrypt     bool              `json:"encrypt"`
	Metadata    map[string]string `json:"metadata"`
}

type RollbackRequest struct {
	TargetVersion int    `json:"target_version"`
	CreatedBy     string `json:"created_by"`
	Reason        string `json:"reason"`
}

type CompareVersionsRequest struct {
	LeftVersion  int    `json:"left_version"`
	RightVersion int    `json:"right_version"`
	Environment  string `json:"environment"`
	ConfigID     string `json:"config_id"`
}

type DiffTextRequest struct {
	LeftText  string `json:"left_text"`
	RightText string `json:"right_text"`
}

type FolderDiffRequest struct {
	LeftPath  string `json:"left_path"`
	RightPath string `json:"right_path"`
	Recursive bool   `json:"recursive"`
}

type MergeRequest struct {
	LeftText  string `json:"left_text"`
	RightText string `json:"right_text"`
	BaseText  string `json:"base_text"`
}

type ConfigFormatRequest struct {
	Content string `json:"content"`
	From    string `json:"from"`
	To      string `json:"to"`
}

func NewServer(port int, dataDir string) (*Server, error) {
	absDataDir, err := filepath.Abs(dataDir)
	if err != nil {
		return nil, fmt.Errorf("无效的数据目录: %w", err)
	}
	
	if err := os.MkdirAll(absDataDir, 0755); err != nil {
		return nil, fmt.Errorf("创建数据目录失败: %w", err)
	}
	
	versionDir := filepath.Join(absDataDir, "versions")
	vm, err := versioning.NewVersionManager(versionDir)
	if err != nil {
		return nil, fmt.Errorf("初始化版本管理器失败: %w", err)
	}
	
	masterKey := os.Getenv("MASTER_KEY")
	if masterKey == "" {
		masterKey, err = encrypt.GenerateMasterKey()
		if err != nil {
			return nil, fmt.Errorf("生成主密钥失败: %w", err)
		}
		log.Printf("警告: 使用临时生成的主密钥。请设置 MASTER_KEY 环境变量以保持密钥持久化。")
	}
	
	enc, err := encrypt.NewEncryptorFromHexKey(masterKey)
	if err != nil {
		return nil, fmt.Errorf("初始化加密器失败: %w", err)
	}
	
	r := mux.NewRouter()
	
	server := &Server{
		router:         r,
		versionManager: vm,
		encryptor:      enc,
		port:           port,
		dataDir:        absDataDir,
	}
	
	server.setupRoutes()
	
	return server, nil
}

func (s *Server) setupRoutes() {
	s.router.Use(s.corsMiddleware)
	s.router.Use(s.loggingMiddleware)
	
	api := s.router.PathPrefix("/api/v1").Subrouter()
	
	configAPI := api.PathPrefix("/configs").Subrouter()
	configAPI.HandleFunc("", s.listConfigs).Methods("GET", "OPTIONS")
	configAPI.HandleFunc("/{environment:[a-zA-Z0-9_-]+}", s.listConfigsByEnvironment).Methods("GET", "OPTIONS")
	configAPI.HandleFunc("/{environment:[a-zA-Z0-9_-]+}/{config_id:[a-zA-Z0-9_-]+}", s.getConfig).Methods("GET", "OPTIONS")
	configAPI.HandleFunc("", s.createConfig).Methods("POST", "OPTIONS")
	configAPI.HandleFunc("/{environment:[a-zA-Z0-9_-]+}/{config_id:[a-zA-Z0-9_-]+}/rollback", s.rollbackConfig).Methods("POST", "OPTIONS")
	configAPI.HandleFunc("/{environment:[a-zA-Z0-9_-]+}/{config_id:[a-zA-Z0-9_-]+}/versions", s.getConfigVersions).Methods("GET", "OPTIONS")
	configAPI.HandleFunc("/{environment:[a-zA-Z0-9_-]+}/{config_id:[a-zA-Z0-9_-]+}/compare", s.compareVersions).Methods("POST", "OPTIONS")
	
	diffAPI := api.PathPrefix("/diff").Subrouter()
	diffAPI.HandleFunc("/text", s.diffText).Methods("POST", "OPTIONS")
	diffAPI.HandleFunc("/word", s.diffWord).Methods("POST", "OPTIONS")
	diffAPI.HandleFunc("/folder", s.diffFolder).Methods("POST", "OPTIONS")
	
	mergeAPI := api.PathPrefix("/merge").Subrouter()
	mergeAPI.HandleFunc("/text", s.mergeText).Methods("POST", "OPTIONS")
	
	toolsAPI := api.PathPrefix("/tools").Subrouter()
	toolsAPI.HandleFunc("/format/convert", s.convertFormat).Methods("POST", "OPTIONS")
	toolsAPI.HandleFunc("/encrypt", s.encryptValue).Methods("POST", "OPTIONS")
	toolsAPI.HandleFunc("/decrypt", s.decryptValue).Methods("POST", "OPTIONS")
	
	envAPI := api.PathPrefix("/environments").Subrouter()
	envAPI.HandleFunc("", s.listEnvironments).Methods("GET", "OPTIONS")
	envAPI.HandleFunc("/{name:[a-zA-Z0-9_-]+}", s.createEnvironment).Methods("POST", "OPTIONS")
	envAPI.HandleFunc("/{name:[a-zA-Z0-9_-]+}", s.deleteEnvironment).Methods("DELETE", "OPTIONS")
	
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")
}

func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.port)
	log.Printf("服务器启动在端口 %d", s.port)
	log.Printf("API 端点: http://localhost:%d/api/v1/", s.port)
	return http.ListenAndServe(addr, s.router)
}

func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "OK",
		Data: map[string]interface{}{
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   "1.0.0",
		},
	})
}

func (s *Server) listConfigs(w http.ResponseWriter, r *http.Request) {
	environments, err := s.listAllEnvironments()
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	allConfigs := make(map[string][]map[string]interface{})
	
	for _, env := range environments {
		configs, err := s.listConfigsInEnvironment(env)
		if err != nil {
			continue
		}
		allConfigs[env] = configs
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    allConfigs,
	})
}

func (s *Server) listConfigsByEnvironment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	environment := vars["environment"]
	
	configs, err := s.listConfigsInEnvironment(environment)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    configs,
	})
}

func (s *Server) getConfig(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	environment := vars["environment"]
	configID := vars["config_id"]
	
	versionStr := r.URL.Query().Get("version")
	
	var version *versioning.ConfigVersion
	var err error
	
	if versionStr != "" {
		versionNum, convErr := strconv.Atoi(versionStr)
		if convErr != nil {
			s.sendError(w, http.StatusBadRequest, "无效的版本号")
			return
		}
		version, err = s.versionManager.GetVersion(configID, environment, versionNum)
	} else {
		version, err = s.versionManager.GetLatestVersion(configID, environment)
	}
	
	if err != nil {
		s.sendError(w, http.StatusNotFound, err.Error())
		return
	}
	
	decrypt := r.URL.Query().Get("decrypt") == "true"
	content := version.Content
	
	if decrypt {
		decryptedContent, err := s.encryptor.DecryptAllEncryptedFields(content)
		if err == nil {
			content = decryptedContent
		}
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":          version.ID,
			"version":     version.Version,
			"config_id":   version.ConfigID,
			"environment": version.Environment,
			"content":     content,
			"format":      version.Format,
			"hash":        version.Hash,
			"created_by":  version.CreatedBy,
			"created_at":  version.CreatedAt,
			"comment":     version.Comment,
			"metadata":    version.Metadata,
		},
	})
}

func (s *Server) createConfig(w http.ResponseWriter, r *http.Request) {
	var req CreateConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	if req.Environment == "" || req.ConfigID == "" || req.Content == "" {
		s.sendError(w, http.StatusBadRequest, "environment, config_id 和 content 都是必填字段")
		return
	}
	
	if req.Format == "" {
		req.Format = "json"
	}
	
	content := req.Content
	
	if req.Encrypt {
		encryptedContent, err := s.encryptor.EncryptSensitiveFields(content, req.Format)
		if err != nil {
			s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("加密敏感字段失败: %v", err))
			return
		}
		content = encryptedContent
	}
	
	version, err := s.versionManager.CreateVersion(
		req.ConfigID,
		req.Environment,
		content,
		req.Format,
		req.CreatedBy,
		req.Comment,
		req.Metadata,
	)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("创建版本失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "配置创建成功",
		Data: map[string]interface{}{
			"version": version.Version,
			"id":      version.ID,
		},
	})
}

func (s *Server) rollbackConfig(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	environment := vars["environment"]
	configID := vars["config_id"]
	
	var req RollbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	if req.TargetVersion <= 0 {
		s.sendError(w, http.StatusBadRequest, "target_version 必须大于 0")
		return
	}
	
	result, err := s.versionManager.RollbackToVersion(
		configID,
		environment,
		req.TargetVersion,
		req.CreatedBy,
		req.Reason,
	)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("回滚失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: result.Message,
		Data: map[string]interface{}{
			"rolled_back_to": result.RolledBackTo.Version,
			"new_version":     result.NewVersion.Version,
		},
	})
}

func (s *Server) getConfigVersions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	environment := vars["environment"]
	configID := vars["config_id"]
	
	history, err := s.versionManager.GetVersionHistory(configID, environment)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	versionSummaries := make([]map[string]interface{}, len(history.Versions))
	for i, v := range history.Versions {
		versionSummaries[i] = map[string]interface{}{
			"id":         v.ID,
			"version":    v.Version,
			"format":     v.Format,
			"hash":       v.Hash,
			"created_by": v.CreatedBy,
			"created_at": v.CreatedAt,
			"comment":    v.Comment,
			"previous_id": v.PreviousID,
		}
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"config_id":   history.ConfigID,
			"environment": history.Environment,
			"latest":      history.Latest,
			"total":       len(history.Versions),
			"versions":    versionSummaries,
		},
	})
}

func (s *Server) compareVersions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	environment := vars["environment"]
	configID := vars["config_id"]
	
	var req CompareVersionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	if req.LeftVersion <= 0 || req.RightVersion <= 0 {
		s.sendError(w, http.StatusBadRequest, "left_version 和 right_version 必须大于 0")
		return
	}
	
	diffResult, err := s.versionManager.CompareVersions(
		configID,
		environment,
		req.LeftVersion,
		req.RightVersion,
	)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("版本对比失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    diffResult,
	})
}

func (s *Server) diffText(w http.ResponseWriter, r *http.Request) {
	var req DiffTextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	result := diff.ComputeTextDiff(req.LeftText, req.RightText)
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    result,
	})
}

func (s *Server) diffWord(w http.ResponseWriter, r *http.Request) {
	var req DiffTextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	result := diff.ComputeWordDiff(req.LeftText, req.RightText)
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    result,
	})
}

func (s *Server) diffFolder(w http.ResponseWriter, r *http.Request) {
	var req FolderDiffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	if req.LeftPath == "" || req.RightPath == "" {
		s.sendError(w, http.StatusBadRequest, "left_path 和 right_path 都是必填字段")
		return
	}
	
	result, err := diff.ComputeFolderDiff(req.LeftPath, req.RightPath, req.Recursive)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("文件夹对比失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    result,
	})
}

func (s *Server) mergeText(w http.ResponseWriter, r *http.Request) {
	var req MergeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	if req.LeftText == "" || req.RightText == "" {
		s.sendError(w, http.StatusBadRequest, "left_text 和 right_text 都是必填字段")
		return
	}
	
	result := diff.MergeTexts(req.LeftText, req.RightText, req.BaseText)
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    result,
	})
}

func (s *Server) convertFormat(w http.ResponseWriter, r *http.Request) {
	var req ConfigFormatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	if req.Content == "" || req.From == "" || req.To == "" {
		s.sendError(w, http.StatusBadRequest, "content, from 和 to 都是必填字段")
		return
	}
	
	result, err := config.ConvertFormat(req.Content, req.From, req.To)
	if err != nil {
		s.sendError(w, http.StatusBadRequest, fmt.Sprintf("格式转换失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"from":   req.From,
			"to":     req.To,
			"result": result,
		},
	})
}

func (s *Server) encryptValue(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	value := body["value"]
	if value == "" {
		s.sendError(w, http.StatusBadRequest, "value 是必填字段")
		return
	}
	
	encrypted, err := s.encryptor.Encrypt(value)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("加密失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]string{
			"encrypted": encrypted,
		},
	})
}

func (s *Server) decryptValue(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.sendError(w, http.StatusBadRequest, "无效的请求体")
		return
	}
	
	value := body["value"]
	if value == "" {
		s.sendError(w, http.StatusBadRequest, "value 是必填字段")
		return
	}
	
	decrypted, err := s.encryptor.Decrypt(value)
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("解密失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]string{
			"decrypted": decrypted,
		},
	})
}

func (s *Server) listEnvironments(w http.ResponseWriter, r *http.Request) {
	environments, err := s.listAllEnvironments()
	if err != nil {
		s.sendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    environments,
	})
}

func (s *Server) createEnvironment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	name := vars["name"]
	
	envDir := filepath.Join(s.dataDir, "versions", "environments", name)
	if err := os.MkdirAll(envDir, 0755); err != nil {
		s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("创建环境失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: fmt.Sprintf("环境 '%s' 创建成功", name),
	})
}

func (s *Server) deleteEnvironment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	name := vars["name"]
	
	envDir := filepath.Join(s.dataDir, "versions", "environments", name)
	if _, err := os.Stat(envDir); os.IsNotExist(err) {
		s.sendError(w, http.StatusNotFound, "环境不存在")
		return
	}
	
	if err := os.RemoveAll(envDir); err != nil {
		s.sendError(w, http.StatusInternalServerError, fmt.Sprintf("删除环境失败: %v", err))
		return
	}
	
	s.sendJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: fmt.Sprintf("环境 '%s' 已删除", name),
	})
}

func (s *Server) listAllEnvironments() ([]string, error) {
	envsDir := filepath.Join(s.dataDir, "versions", "environments")
	
	entries, err := os.ReadDir(envsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	
	var environments []string
	for _, entry := range entries {
		if entry.IsDir() {
			environments = append(environments, entry.Name())
		}
	}
	
	return environments, nil
}

func (s *Server) listConfigsInEnvironment(environment string) ([]map[string]interface{}, error) {
	configsDir := filepath.Join(s.dataDir, "versions", "environments", environment, "configs")
	
	entries, err := os.ReadDir(configsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []map[string]interface{}{}, nil
		}
		return nil, err
	}
	
	var configs []map[string]interface{}
	for _, entry := range entries {
		if entry.IsDir() {
			history, err := s.versionManager.GetVersionHistory(entry.Name(), environment)
			if err != nil {
				continue
			}
			
			configInfo := map[string]interface{}{
				"config_id":    entry.Name(),
				"environment":  environment,
				"latest_version": history.Latest,
				"total_versions": len(history.Versions),
			}
			
			if len(history.Versions) > 0 {
				latest := history.Versions[len(history.Versions)-1]
				configInfo["format"] = latest.Format
				configInfo["updated_at"] = latest.CreatedAt
				configInfo["updated_by"] = latest.CreatedBy
			}
			
			configs = append(configs, configInfo)
		}
	}
	
	return configs, nil
}

func (s *Server) sendJSON(w http.ResponseWriter, status int, response APIResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}

func (s *Server) sendError(w http.ResponseWriter, status int, message string) {
	s.sendJSON(w, status, APIResponse{
		Success: false,
		Error:   message,
	})
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf("%s %s 开始", r.Method, r.URL.Path)
		
		next.ServeHTTP(w, r)
		
		log.Printf("%s %s 完成，耗时 %v", r.Method, r.URL.Path, time.Since(start))
	})
}
