package k8s

import (
	"sync"
	"time"

	"cloud-native-console/pkg/types"

	"github.com/google/uuid"
)

type ClusterManager struct {
	clusters map[string]*types.Cluster
	clients  map[string]*Client
	mu       sync.RWMutex
}

func NewClusterManager() *ClusterManager {
	return &ClusterManager{
		clusters: make(map[string]*types.Cluster),
		clients:  make(map[string]*Client),
	}
}

func (m *ClusterManager) AddCluster(name string, kubeConfig string) (*types.Cluster, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	clusterID := uuid.New().String()

	client, err := NewClient(kubeConfig, clusterID)
	if err != nil {
		return nil, err
	}

	if err := client.TestConnection(); err != nil {
		return nil, err
	}

	version, err := client.GetVersion()
	if err != nil {
		version = "unknown"
	}

	namespaces, err := client.GetNamespaces()
	if err != nil {
		namespaces = []string{"default"}
	}

	nodeCount, _ := client.CountNodes()
	podCount, _ := client.CountPods("")

	cluster := &types.Cluster{
		ID:         clusterID,
		Name:       name,
		Status:     types.ClusterStatusConnected,
		Version:    version,
		Nodes:      nodeCount,
		Pods:       podCount,
		Namespaces: namespaces,
		KubeConfig: kubeConfig,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	m.clusters[clusterID] = cluster
	m.clients[clusterID] = client

	return cluster, nil
}

func (m *ClusterManager) GetCluster(clusterID string) (*types.Cluster, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	cluster, exists := m.clusters[clusterID]
	if !exists {
		return nil, false
	}

	clusterCopy := *cluster
	clusterCopy.KubeConfig = ""
	return &clusterCopy, true
}

func (m *ClusterManager) GetClusters() []types.Cluster {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]types.Cluster, 0, len(m.clusters))
	for _, cluster := range m.clusters {
		clusterCopy := *cluster
		clusterCopy.KubeConfig = ""
		result = append(result, clusterCopy)
	}
	return result
}

func (m *ClusterManager) UpdateCluster(clusterID, name string, kubeConfig *string) (*types.Cluster, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	cluster, exists := m.clusters[clusterID]
	if !exists {
		return nil, nil
	}

	cluster.Name = name
	cluster.UpdatedAt = time.Now()

	if kubeConfig != nil {
		client, err := NewClient(*kubeConfig, clusterID)
		if err != nil {
			return nil, err
		}

		if err := client.TestConnection(); err != nil {
			cluster.Status = types.ClusterStatusError
		} else {
			cluster.Status = types.ClusterStatusConnected
			version, _ := client.GetVersion()
			namespaces, _ := client.GetNamespaces()
			nodeCount, _ := client.CountNodes()
			podCount, _ := client.CountPods("")

			cluster.Version = version
			cluster.Namespaces = namespaces
			cluster.Nodes = nodeCount
			cluster.Pods = podCount
			cluster.KubeConfig = *kubeConfig
			m.clients[clusterID] = client
		}
	}

	clusterCopy := *cluster
	clusterCopy.KubeConfig = ""
	return &clusterCopy, nil
}

func (m *ClusterManager) DeleteCluster(clusterID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.clusters[clusterID]; !exists {
		return false
	}

	delete(m.clusters, clusterID)
	delete(m.clients, clusterID)
	return true
}

func (m *ClusterManager) GetClient(clusterID string) (*Client, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, exists := m.clients[clusterID]
	return client, exists
}

func (m *ClusterManager) RefreshCluster(clusterID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	cluster, exists := m.clusters[clusterID]
	if !exists {
		return nil
	}

	client, exists := m.clients[clusterID]
	if !exists {
		cluster.Status = types.ClusterStatusDisconnected
		return nil
	}

	if err := client.TestConnection(); err != nil {
		cluster.Status = types.ClusterStatusDisconnected
		return err
	}

	cluster.Status = types.ClusterStatusConnected
	version, _ := client.GetVersion()
	namespaces, _ := client.GetNamespaces()
	nodeCount, _ := client.CountNodes()
	podCount, _ := client.CountPods("")

	cluster.Version = version
	cluster.Namespaces = namespaces
	cluster.Nodes = nodeCount
	cluster.Pods = podCount
	cluster.UpdatedAt = time.Now()

	return nil
}

func (m *ClusterManager) RefreshAllClusters() {
	clusterIDs := make([]string, 0)
	m.mu.RLock()
	for id := range m.clusters {
		clusterIDs = append(clusterIDs, id)
	}
	m.mu.RUnlock()

	for _, id := range clusterIDs {
		m.RefreshCluster(id)
	}
}
