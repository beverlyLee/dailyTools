package types

import (
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
)

type ClusterStatus string

const (
	ClusterStatusConnected    ClusterStatus = "connected"
	ClusterStatusDisconnected ClusterStatus = "disconnected"
	ClusterStatusError        ClusterStatus = "error"
)

type Cluster struct {
	ID         string        `json:"id"`
	Name       string        `json:"name"`
	Status     ClusterStatus `json:"status"`
	Version    string        `json:"version"`
	Nodes      int           `json:"nodes"`
	Pods       int           `json:"pods"`
	Namespaces []string      `json:"namespaces"`
	KubeConfig string        `json:"kubeConfig,omitempty"`
	CreatedAt  time.Time     `json:"createdAt"`
	UpdatedAt  time.Time     `json:"updatedAt"`
}

type Node struct {
	Name     string        `json:"name"`
	Status   NodeStatus    `json:"status"`
	Role     NodeRole      `json:"role"`
	CPU      ResourceUsage `json:"cpu"`
	Memory   ResourceUsage `json:"memory"`
	Pods     int           `json:"pods"`
	IP       string        `json:"ip"`
	Age      string        `json:"age"`
	Creation time.Time     `json:"creation"`
}

type NodeStatus string

const (
	NodeStatusReady    NodeStatus = "Ready"
	NodeStatusNotReady NodeStatus = "NotReady"
	NodeStatusUnknown  NodeStatus = "Unknown"
)

type NodeRole string

const (
	NodeRoleMaster NodeRole = "master"
	NodeRoleWorker NodeRole = "worker"
)

type ResourceUsage struct {
	Used    float64 `json:"used"`
	Total   float64 `json:"total"`
	Percent float64 `json:"percent"`
}

type Pod struct {
	Name       string        `json:"name"`
	Namespace  string        `json:"namespace"`
	Status     PodStatus     `json:"status"`
	Node       string        `json:"node"`
	IP         string        `json:"ip"`
	Age        string        `json:"age"`
	Containers int           `json:"containers"`
	Creation   time.Time     `json:"creation"`
}

type PodStatus string

const (
	PodStatusRunning   PodStatus = "Running"
	PodStatusPending   PodStatus = "Pending"
	PodStatusSucceeded PodStatus = "Succeeded"
	PodStatusFailed    PodStatus = "Failed"
	PodStatusUnknown   PodStatus = "Unknown"
)

type Deployment struct {
	Name              string    `json:"name"`
	Namespace         string    `json:"namespace"`
	Replicas          int32     `json:"replicas"`
	ReadyReplicas     int32     `json:"readyReplicas"`
	AvailableReplicas int32     `json:"availableReplicas"`
	Age               string    `json:"age"`
	Creation          time.Time `json:"creation"`
}

type Service struct {
	Name      string              `json:"name"`
	Namespace string              `json:"namespace"`
	Type      ServiceType         `json:"type"`
	ClusterIP string              `json:"clusterIP"`
	Ports     []ServicePort       `json:"ports"`
	Age       string              `json:"age"`
	Creation  time.Time           `json:"creation"`
}

type ServiceType string

const (
	ServiceTypeClusterIP    ServiceType = "ClusterIP"
	ServiceTypeNodePort     ServiceType = "NodePort"
	ServiceTypeLoadBalancer ServiceType = "LoadBalancer"
	ServiceTypeExternalName ServiceType = "ExternalName"
)

type ServicePort struct {
	Port       int32  `json:"port"`
	TargetPort int32  `json:"targetPort"`
	Protocol   string `json:"protocol"`
}

type Ingress struct {
	Name      string    `json:"name"`
	Namespace string    `json:"namespace"`
	Hosts     []string  `json:"hosts"`
	Age       string    `json:"age"`
	Creation  time.Time `json:"creation"`
}

type AlertRule struct {
	ID        string    `json:"id"`
	ClusterID string    `json:"clusterId"`
	Name      string    `json:"name"`
	Metric    string    `json:"metric"`
	Condition string    `json:"condition"`
	Threshold float64   `json:"threshold"`
	Duration  string    `json:"duration"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type DeployConfig struct {
	ClusterID  string         `json:"clusterId"`
	Namespace  string         `json:"namespace"`
	Deployment DeploymentSpec `json:"deployment"`
	Service    *ServiceSpec   `json:"service,omitempty"`
	Ingress    *IngressSpec   `json:"ingress,omitempty"`
	Variables  map[string]string `json:"variables,omitempty"`
}

type DeploymentSpec struct {
	Name       string         `json:"name"`
	Replicas   int32          `json:"replicas"`
	Containers []ContainerSpec `json:"containers"`
}

type ContainerSpec struct {
	Name      string             `json:"name"`
	Image     string             `json:"image"`
	Ports     []ContainerPort    `json:"ports"`
	Env       []EnvVar           `json:"env"`
	Resources ResourceRequirements `json:"resources"`
}

type ContainerPort struct {
	ContainerPort int32 `json:"containerPort"`
}

type EnvVar struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ResourceRequirements struct {
	Limits   ResourceList `json:"limits"`
	Requests ResourceList `json:"requests"`
}

type ResourceList struct {
	CPU    string `json:"cpu"`
	Memory string `json:"memory"`
}

type ServiceSpec struct {
	Name  string            `json:"name"`
	Type  string            `json:"type"`
	Ports []ServicePortSpec `json:"ports"`
}

type ServicePortSpec struct {
	Port       int32  `json:"port"`
	TargetPort int32  `json:"targetPort"`
	Protocol   string `json:"protocol"`
}

type IngressSpec struct {
	Name  string          `json:"name"`
	Hosts []string        `json:"hosts"`
	Paths []IngressPath   `json:"paths"`
}

type IngressPath struct {
	Path        string `json:"path"`
	ServiceName string `json:"serviceName"`
	ServicePort int32  `json:"servicePort"`
}

type DeployResult struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Logs    []string `json:"logs,omitempty"`
}

type K8sClient interface {
	GetNodes() ([]Node, error)
	GetPods(namespace string) ([]Pod, error)
	GetDeployments(namespace string) ([]Deployment, error)
	GetServices(namespace string) ([]Service, error)
	GetIngresses(namespace string) ([]Ingress, error)
	GetPodLogs(namespace, podName, container string) (string, error)
	ApplyDeployment(deployment *appsv1.Deployment) error
	ApplyService(service *corev1.Service) error
	ApplyIngress(ingress *networkingv1.Ingress) error
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}
