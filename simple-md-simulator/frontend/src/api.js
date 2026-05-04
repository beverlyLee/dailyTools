const API_BASE = 'http://localhost:8000';

export const api = {
    async createSimulation(config) {
        const response = await fetch(`${API_BASE}/api/simulation/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        return this.handleResponse(response);
    },
    
    async stepSimulation(simulationId, steps, saveInterval = 1) {
        const response = await fetch(`${API_BASE}/api/simulation/${simulationId}/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                n_steps: steps,
                save_interval: saveInterval,
            }),
        });
        return this.handleResponse(response);
    },
    
    async getSimulationState(simulationId) {
        const response = await fetch(`${API_BASE}/api/simulation/${simulationId}/state`);
        return this.handleResponse(response);
    },
    
    async getTrajectory(simulationId) {
        const response = await fetch(`${API_BASE}/api/simulation/${simulationId}/trajectory`);
        return this.handleResponse(response);
    },
    
    async getTrajectoryFrame(simulationId, frameIndex) {
        const response = await fetch(`${API_BASE}/api/simulation/${simulationId}/trajectory/${frameIndex}`);
        return this.handleResponse(response);
    },
    
    async scaleTemperature(simulationId, targetTemp) {
        const response = await fetch(`${API_BASE}/api/simulation/${simulationId}/scale-temperature`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_temperature: targetTemp }),
        });
        return this.handleResponse(response);
    },
    
    async closeSimulation(simulationId) {
        const response = await fetch(`${API_BASE}/api/simulation/${simulationId}`, {
            method: 'DELETE',
        });
        return this.handleResponse(response);
    },
    
    async listActiveSimulations() {
        const response = await fetch(`${API_BASE}/api/simulation/`);
        return this.handleResponse(response);
    },
    
    async listSavedSimulations() {
        const response = await fetch(`${API_BASE}/api/trajectory/simulations`);
        return this.handleResponse(response);
    },
    
    async getSavedSimulationInfo(dbId) {
        const response = await fetch(`${API_BASE}/api/trajectory/simulation/${dbId}`);
        return this.handleResponse(response);
    },
    
    async getSavedFrames(dbId) {
        const response = await fetch(`${API_BASE}/api/trajectory/simulation/${dbId}/frames`);
        return this.handleResponse(response);
    },
    
    async getSavedFrameDetails(dbId, frameNumber) {
        const response = await fetch(`${API_BASE}/api/trajectory/simulation/${dbId}/frame/${frameNumber}`);
        return this.handleResponse(response);
    },
    
    async deleteSavedSimulation(dbId) {
        const response = await fetch(`${API_BASE}/api/trajectory/simulation/${dbId}`, {
            method: 'DELETE',
        });
        return this.handleResponse(response);
    },
    
    async healthCheck() {
        const response = await fetch(`${API_BASE}/api/health`);
        return this.handleResponse(response);
    },
    
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || error.error || `HTTP ${response.status}`);
        }
        return response.json();
    },
};
