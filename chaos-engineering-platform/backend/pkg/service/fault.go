package service

import (
	"sync"

	"chaos-engineering-platform/pkg/model"
)

type FaultInjectionService struct {
	faultTypes map[string]*model.FaultType
	namespaces []string
	pods       map[string][]map[string]interface{}
	services   map[string][]map[string]interface{}
	mu         sync.RWMutex
}

func NewFaultInjectionService() *FaultInjectionService {
	service := &FaultInjectionService{
		faultTypes: make(map[string]*model.FaultType),
		namespaces: []string{"default", "kube-system", "production", "staging"},
		pods:       make(map[string][]map[string]interface{}),
		services:   make(map[string][]map[string]interface{}),
	}

	service.initFaultTypes()
	service.initMockData()

	return service
}

func (s *FaultInjectionService) initFaultTypes() {
	faultTypes := []*model.FaultType{
		{
			ID:          "pod-delete",
			Name:        "Pod 删除",
			Category:    model.FaultCategoryContainer,
			Icon:        "Delete",
			Description: "删除指定 Pod，模拟容器故障",
			ConfigSchema: map[string]interface{}{
				"namespace": map[string]interface{}{"type": "string", "required": true, "default": "default"},
				"labelSelector": map[string]interface{}{"type": "string", "required": false},
				"podName": map[string]interface{}{"type": "string", "required": false},
				"count": map[string]interface{}{"type": "number", "required": true, "default": 1, "min": 1},
			},
		},
		{
			ID:          "network-delay",
			Name:        "网络延迟",
			Category:    model.FaultCategoryNetwork,
			Icon:        "Timer",
			Description: "在指定容器中注入网络延迟",
			ConfigSchema: map[string]interface{}{
				"namespace": map[string]interface{}{"type": "string", "required": true, "default": "default"},
				"labelSelector": map[string]interface{}{"type": "string", "required": false},
				"delay": map[string]interface{}{"type": "number", "required": true, "default": 500, "unit": "ms", "min": 0},
				"jitter": map[string]interface{}{"type": "number", "required": false, "default": 0, "unit": "ms", "min": 0},
				"duration": map[string]interface{}{"type": "number", "required": true, "default": 60, "unit": "s", "min": 1},
			},
		},
		{
			ID:          "network-loss",
			Name:        "网络丢包",
			Category:    model.FaultCategoryNetwork,
			Icon:        "Connection",
			Description: "在指定容器中模拟网络丢包",
			ConfigSchema: map[string]interface{}{
				"namespace": map[string]interface{}{"type": "string", "required": true, "default": "default"},
				"labelSelector": map[string]interface{}{"type": "string", "required": false},
				"percentage": map[string]interface{}{"type": "number", "required": true, "default": 20, "unit": "%", "min": 0, "max": 100},
				"duration": map[string]interface{}{"type": "number", "required": true, "default": 60, "unit": "s", "min": 1},
			},
		},
		{
			ID:          "cpu-stress",
			Name:        "CPU 满负荷",
			Category:    model.FaultCategoryResource,
			Icon:        "Cpu",
			Description: "在指定容器中使 CPU 达到满负荷",
			ConfigSchema: map[string]interface{}{
				"namespace": map[string]interface{}{"type": "string", "required": true, "default": "default"},
				"labelSelector": map[string]interface{}{"type": "string", "required": false},
				"percentage": map[string]interface{}{"type": "number", "required": true, "default": 100, "unit": "%", "min": 1, "max": 100},
				"cores": map[string]interface{}{"type": "number", "required": false, "default": 1, "min": 1},
				"duration": map[string]interface{}{"type": "number", "required": true, "default": 60, "unit": "s", "min": 1},
			},
		},
		{
			ID:          "memory-stress",
			Name:        "内存压力",
			Category:    model.FaultCategoryResource,
			Icon:        "Coin",
			Description: "在指定容器中消耗内存资源",
			ConfigSchema: map[string]interface{}{
				"namespace": map[string]interface{}{"type": "string", "required": true, "default": "default"},
				"labelSelector": map[string]interface{}{"type": "string", "required": false},
				"percentage": map[string]interface{}{"type": "number", "required": true, "default": 80, "unit": "%", "min": 1, "max": 100},
				"duration": map[string]interface{}{"type": "number", "required": true, "default": 60, "unit": "s", "min": 1},
			},
		},
		{
			ID:          "disk-io-stress",
			Name:        "磁盘 IO 压力",
			Category:    model.FaultCategoryResource,
			Icon:        "DataLine",
			Description: "在指定容器中产生磁盘 IO 压力",
			ConfigSchema: map[string]interface{}{
				"namespace": map[string]interface{}{"type": "string", "required": true, "default": "default"},
				"labelSelector": map[string]interface{}{"type": "string", "required": false},
				"mode": map[string]interface{}{"type": "string", "required": true, "default": "read", "enum": []string{"read", "write", "readwrite"}},
				"blockSize": map[string]interface{}{"type": "number", "required": false, "default": 4, "unit": "KB", "min": 1},
				"duration": map[string]interface{}{"type": "number", "required": true, "default": 60, "unit": "s", "min": 1},
			},
		},
		{
			ID:          "process-kill",
			Name:        "进程终止",
			Category:    model.FaultCategoryApplication,
			Icon:        "Warning",
			Description: "终止指定容器中的特定进程",
			ConfigSchema: map[string]interface{}{
				"namespace": map[string]interface{}{"type": "string", "required": true, "default": "default"},
				"labelSelector": map[string]interface{}{"type": "string", "required": false},
				"processName": map[string]interface{}{"type": "string", "required": true},
				"signal": map[string]interface{}{"type": "string", "required": false, "default": "SIGTERM", "enum": []string{"SIGTERM", "SIGKILL", "SIGINT"}},
				"count": map[string]interface{}{"type": "number", "required": true, "default": 1, "min": 1},
			},
		},
		{
			ID:          "latency-injection",
			Name:        "服务延迟",
			Category:    model.FaultCategoryApplication,
			Icon:        "Clock",
			Description: "在服务调用中注入延迟",
			ConfigSchema: map[string]interface{}{
				"namespace": map[string]interface{}{"type": "string", "required": true, "default": "default"},
				"labelSelector": map[string]interface{}{"type": "string", "required": false},
				"serviceName": map[string]interface{}{"type": "string", "required": true},
				"endpoint": map[string]interface{}{"type": "string", "required": true},
				"delay": map[string]interface{}{"type": "number", "required": true, "default": 1000, "unit": "ms", "min": 0},
				"duration": map[string]interface{}{"type": "number", "required": true, "default": 60, "unit": "s", "min": 1},
			},
		},
	}

	for _, ft := range faultTypes {
		s.faultTypes[ft.ID] = ft
	}
}

func (s *FaultInjectionService) initMockData() {
	s.pods["default"] = []map[string]interface{}{
		{"name": "nginx-78d45f979c-abcde", "namespace": "default", "status": "Running", "labels": map[string]string{"app": "nginx"}},
		{"name": "redis-65b89c7654-fghij", "namespace": "default", "status": "Running", "labels": map[string]string{"app": "redis"}},
		{"name": "mysql-6979b7d85f-klmno", "namespace": "default", "status": "Running", "labels": map[string]string{"app": "mysql"}},
	}

	s.pods["production"] = []map[string]interface{}{
		{"name": "api-gateway-7d845f979c-12345", "namespace": "production", "status": "Running", "labels": map[string]string{"app": "api-gateway"}},
		{"name": "user-service-6b89c76545-67890", "namespace": "production", "status": "Running", "labels": map[string]string{"app": "user-service"}},
		{"name": "order-service-979b7d85f1-abcde", "namespace": "production", "status": "Running", "labels": map[string]string{"app": "order-service"}},
	}

	s.services["default"] = []map[string]interface{}{
		{"name": "nginx-service", "namespace": "default", "type": "ClusterIP", "ports": []int{80}},
		{"name": "redis-service", "namespace": "default", "type": "ClusterIP", "ports": []int{6379}},
		{"name": "mysql-service", "namespace": "default", "type": "ClusterIP", "ports": []int{3306}},
	}

	s.services["production"] = []map[string]interface{}{
		{"name": "api-gateway", "namespace": "production", "type": "LoadBalancer", "ports": []int{80, 443}},
		{"name": "user-service", "namespace": "production", "type": "ClusterIP", "ports": []int{8080}},
		{"name": "order-service", "namespace": "production", "type": "ClusterIP", "ports": []int{8081}},
	}
}

func (s *FaultInjectionService) ListFaultTypes() []*model.FaultType {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*model.FaultType
	for _, ft := range s.faultTypes {
		result = append(result, ft)
	}

	return result
}

func (s *FaultInjectionService) GetFaultType(id string) (*model.FaultType, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ft, exists := s.faultTypes[id]
	return ft, exists
}

func (s *FaultInjectionService) ListNamespaces() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.namespaces
}

func (s *FaultInjectionService) ListPods(namespace, labelSelector string) []map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pods, exists := s.pods[namespace]
	if !exists {
		return []map[string]interface{}{}
	}

	if labelSelector == "" {
		return pods
	}

	var result []map[string]interface{}
	for _, pod := range pods {
		labels, ok := pod["labels"].(map[string]string)
		if ok {
			for k, v := range labels {
				if k+"="+v == labelSelector {
					result = append(result, pod)
					break
				}
			}
		}
	}

	return result
}

func (s *FaultInjectionService) ListServices(namespace string) []map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	services, exists := s.services[namespace]
	if !exists {
		return []map[string]interface{}{}
	}

	return services
}

func (s *FaultInjectionService) InjectFault(faultType string, config map[string]interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return nil
}

func (s *FaultInjectionService) RollbackFault(faultType string, config map[string]interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return nil
}
