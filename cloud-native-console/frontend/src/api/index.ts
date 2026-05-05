import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Cluster {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  version: string
  nodes: number
  pods: number
  namespaces: string[]
}

export interface Node {
  name: string
  status: 'Ready' | 'NotReady' | 'Unknown'
  role: 'master' | 'worker'
  cpu: { used: number; total: number; percent: number }
  memory: { used: number; total: number; percent: number }
  pods: number
  ip: string
}

export interface Pod {
  name: string
  namespace: string
  status: 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown'
  node: string
  ip: string
  age: string
  containers: number
}

export interface Deployment {
  name: string
  namespace: string
  replicas: number
  readyReplicas: number
  availableReplicas: number
  age: string
}

export interface Service {
  name: string
  namespace: string
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName'
  clusterIP: string
  ports: { port: number; targetPort: number; protocol: string }[]
  age: string
}

export interface Ingress {
  name: string
  namespace: string
  hosts: string[]
  age: string
}

export interface AlertRule {
  id: string
  name: string
  metric: string
  condition: string
  threshold: number
  duration: string
  enabled: boolean
}

export interface DeployConfig {
  clusterId: string
  namespace: string
  deployment: {
    name: string
    replicas: number
    containers: {
      name: string
      image: string
      ports: { containerPort: number }[]
      env: { name: string; value: string }[]
      resources: {
        limits: { cpu: string; memory: string }
        requests: { cpu: string; memory: string }
      }
    }[]
  }
  service?: {
    name: string
    type: string
    ports: { port: number; targetPort: number; protocol: string }[]
  }
  ingress?: {
    name: string
    hosts: string[]
    paths: { path: string; serviceName: string; servicePort: number }[]
  }
  variables?: { [key: string]: string }
}

export interface DeployResult {
  success: boolean
  message: string
  logs?: string[]
}

export const clusterApi = {
  list: (): Promise<{ data: Cluster[] }> => api.get('/clusters'),
  get: (id: string): Promise<{ data: Cluster }> => api.get(`/clusters/${id}`),
  add: (config: { name: string; kubeconfig: string }): Promise<{ data: Cluster }> => 
    api.post('/clusters', config),
  remove: (id: string): Promise<void> => api.delete(`/clusters/${id}`),
}

export const resourceApi = {
  getNodes: (clusterId: string): Promise<{ data: Node[] }> => 
    api.get(`/clusters/${clusterId}/nodes`),
  getPods: (clusterId: string, namespace?: string): Promise<{ data: Pod[] }> => 
    api.get(`/clusters/${clusterId}/pods`, { params: { namespace } }),
  getDeployments: (clusterId: string, namespace?: string): Promise<{ data: Deployment[] }> => 
    api.get(`/clusters/${clusterId}/deployments`, { params: { namespace } }),
  getServices: (clusterId: string, namespace?: string): Promise<{ data: Service[] }> => 
    api.get(`/clusters/${clusterId}/services`, { params: { namespace } }),
  getIngresses: (clusterId: string, namespace?: string): Promise<{ data: Ingress[] }> => 
    api.get(`/clusters/${clusterId}/ingresses`, { params: { namespace } }),
  getPodLogs: (clusterId: string, namespace: string, podName: string, container?: string): Promise<{ data: string }> => 
    api.get(`/clusters/${clusterId}/namespaces/${namespace}/pods/${podName}/logs`, { 
      params: { container } 
    }),
}

export const deployApi = {
  deploy: (config: DeployConfig): Promise<{ data: DeployResult }> => 
    api.post('/deploy', config),
  preview: (config: DeployConfig): Promise<{ data: { yaml: string } }> => 
    api.post('/deploy/preview', config),
}

export const alertApi = {
  list: (clusterId: string): Promise<{ data: AlertRule[] }> => 
    api.get(`/clusters/${clusterId}/alerts`),
  create: (clusterId: string, rule: Omit<AlertRule, 'id'>): Promise<{ data: AlertRule }> => 
    api.post(`/clusters/${clusterId}/alerts`, rule),
  update: (clusterId: string, ruleId: string, rule: Partial<AlertRule>): Promise<{ data: AlertRule }> => 
    api.put(`/clusters/${clusterId}/alerts/${ruleId}`, rule),
  delete: (clusterId: string, ruleId: string): Promise<void> => 
    api.delete(`/clusters/${clusterId}/alerts/${ruleId}`),
}

export default api
