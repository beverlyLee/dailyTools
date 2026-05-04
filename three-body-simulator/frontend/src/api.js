const API_BASE = '/api';

export class ThreeBodyAPI {
    static async getPresets() {
        const response = await fetch(`${API_BASE}/presets`);
        if (!response.ok) throw new Error('Failed to fetch presets');
        return await response.json();
    }

    static async initializeSimulation(config) {
        const response = await fetch(`${API_BASE}/simulation/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to initialize simulation');
        }
        return await response.json();
    }

    static async runSimulationStep(steps = 1) {
        const response = await fetch(`${API_BASE}/simulation/step?steps=${steps}`, {
            method: 'POST'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to run simulation step');
        }
        return await response.json();
    }

    static async getSimulationState() {
        const response = await fetch(`${API_BASE}/simulation/state`);
        if (!response.ok) throw new Error('Failed to get simulation state');
        return await response.json();
    }

    static async getTrajectoryHistory(limit = 1000) {
        const response = await fetch(`${API_BASE}/simulation/trajectory?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to get trajectory history');
        return await response.json();
    }

    static async resetSimulation() {
        const response = await fetch(`${API_BASE}/simulation/reset`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to reset simulation');
        return await response.json();
    }

    static async saveSimulation(simulationName, notes = '') {
        const response = await fetch(`${API_BASE}/simulation/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                simulation_name: simulationName,
                notes: notes
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save simulation');
        }
        return await response.json();
    }

    static async getAllSimulations(limit = 100) {
        const response = await fetch(`${API_BASE}/simulations?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to get simulations');
        return await response.json();
    }

    static async getSimulation(simulationId) {
        const response = await fetch(`${API_BASE}/simulations/${simulationId}`);
        if (!response.ok) throw new Error('Failed to get simulation');
        return await response.json();
    }

    static async deleteSimulation(simulationId) {
        const response = await fetch(`${API_BASE}/simulations/${simulationId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete simulation');
        return await response.json();
    }

    static async analyzeSimulation(simulationId) {
        const response = await fetch(`${API_BASE}/analysis/${simulationId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to analyze simulation');
        }
        return await response.json();
    }
}
