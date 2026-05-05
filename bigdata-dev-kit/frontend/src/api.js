const API_BASE_URL = 'http://localhost:8080/api';

const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    },
    
    async checkHealth() {
        try {
            return await this.request('/health');
        } catch (error) {
            return null;
        }
    },
    
    jobs: {
        async getAll() {
            return api.request('/jobs');
        },
        
        async getById(id) {
            return api.request(`/jobs/${id}`);
        },
        
        async getByType(type) {
            return api.request(`/jobs/type/${type}`);
        },
        
        async create(job) {
            return api.request('/jobs', {
                method: 'POST',
                body: JSON.stringify(job)
            });
        },
        
        async updateStatus(id, status) {
            return api.request(`/jobs/${id}/status?status=${status}`, {
                method: 'PUT'
            });
        },
        
        async updateProgress(id, progress) {
            return api.request(`/jobs/${id}/progress?progress=${progress}`, {
                method: 'PUT'
            });
        },
        
        async updateDag(id, dagJson) {
            return api.request(`/jobs/${id}/dag`, {
                method: 'PUT',
                body: JSON.stringify({ dagJson })
            });
        },
        
        async delete(id) {
            return api.request(`/jobs/${id}`, {
                method: 'DELETE'
            });
        },
        
        async uploadJar(file) {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${API_BASE_URL}/jobs/upload-jar`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }
            
            return response.json();
        }
    },
    
    udfs: {
        async getAll() {
            return api.request('/udfs');
        },
        
        async getEnabled() {
            return api.request('/udfs/enabled');
        },
        
        async getById(id) {
            return api.request(`/udfs/${id}`);
        },
        
        async getByName(name) {
            return api.request(`/udfs/name/${name}`);
        },
        
        async create(udf) {
            return api.request('/udfs', {
                method: 'POST',
                body: JSON.stringify(udf)
            });
        },
        
        async update(id, udf) {
            return api.request(`/udfs/${id}`, {
                method: 'PUT',
                body: JSON.stringify(udf)
            });
        },
        
        async toggle(id, enabled) {
            return api.request(`/udfs/${id}/toggle?enabled=${enabled}`, {
                method: 'PUT'
            });
        },
        
        async delete(id) {
            return api.request(`/udfs/${id}`, {
                method: 'DELETE'
            });
        }
    },
    
    executors: {
        async getByJobId(jobId) {
            return api.request(`/executors/job/${jobId}`);
        },
        
        async create(executor) {
            return api.request('/executors', {
                method: 'POST',
                body: JSON.stringify(executor)
            });
        },
        
        async deleteByJobId(jobId) {
            return api.request(`/executors/job/${jobId}`, {
                method: 'DELETE'
            });
        }
    },
    
    logs: {
        async getByJobId(jobId) {
            return api.request(`/logs/job/${jobId}`);
        },
        
        async getByJobIdAndLevel(jobId, level) {
            return api.request(`/logs/job/${jobId}/level/${level}`);
        },
        
        async getByJobIdAndExecutorId(jobId, executorId) {
            return api.request(`/logs/job/${jobId}/executor/${executorId}`);
        },
        
        async add(log) {
            return api.request('/logs', {
                method: 'POST',
                body: JSON.stringify(log)
            });
        },
        
        async deleteByJobId(jobId) {
            return api.request(`/logs/job/${jobId}`, {
                method: 'DELETE'
            });
        }
    },
    
    sqlVersions: {
        async getBySqlName(sqlName) {
            return api.request(`/sql-versions/${sqlName}`);
        },
        
        async getLatest(sqlName) {
            return api.request(`/sql-versions/${sqlName}/latest`);
        },
        
        async getVersion(sqlName, version) {
            return api.request(`/sql-versions/${sqlName}/version/${version}`);
        },
        
        async save(params) {
            return api.request('/sql-versions', {
                method: 'POST',
                body: JSON.stringify(params)
            });
        },
        
        async deleteAll(sqlName) {
            return api.request(`/sql-versions/${sqlName}`, {
                method: 'DELETE'
            });
        }
    }
};

window.api = api;
