import {
  SimulationConfig,
  SimulationResponse,
  StepResponse,
  SimulationState,
  SavedSimulation,
  FrameInfo,
  FrameDetails,
  PayoffMatrixData,
  NashEquilibriumResponse,
  GameExample
} from '../types';

const MD_BASE_URL = '/api/md';
const NASH_BASE_URL = '/api/nash';

class ApiService {
  private async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.fetchJson(`${MD_BASE_URL}/health`);
  }

  async createSimulation(config: SimulationConfig): Promise<SimulationResponse> {
    return this.fetchJson(`${MD_BASE_URL}/simulation/create`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getSimulationState(simulationId: string): Promise<{ state: SimulationState }> {
    return this.fetchJson(`${MD_BASE_URL}/simulation/${simulationId}/state`);
  }

  async stepSimulation(simulationId: string, steps: number = 1): Promise<StepResponse> {
    return this.fetchJson(`${MD_BASE_URL}/simulation/${simulationId}/step`, {
      method: 'POST',
      body: JSON.stringify({ steps }),
    });
  }

  async scaleTemperature(simulationId: string, targetTemperature: number): Promise<{ success: boolean }> {
    return this.fetchJson(`${MD_BASE_URL}/simulation/${simulationId}/scale-temperature`, {
      method: 'POST',
      body: JSON.stringify({ target_temperature: targetTemperature }),
    });
  }

  async closeSimulation(simulationId: string): Promise<{ success: boolean }> {
    return this.fetchJson(`${MD_BASE_URL}/simulation/${simulationId}/close`, {
      method: 'POST',
    });
  }

  async saveSimulation(simulationId: string, name?: string): Promise<{ id: number }> {
    return this.fetchJson(`${MD_BASE_URL}/trajectory/save`, {
      method: 'POST',
      body: JSON.stringify({ simulation_id: simulationId, name }),
    });
  }

  async listSavedSimulations(): Promise<{ simulations: SavedSimulation[] }> {
    return this.fetchJson(`${MD_BASE_URL}/trajectory/list`);
  }

  async getSavedSimulationInfo(dbId: number): Promise<{ simulation: SavedSimulation }> {
    return this.fetchJson(`${MD_BASE_URL}/trajectory/${dbId}/info`);
  }

  async getSavedFrames(dbId: number): Promise<{ frames: FrameInfo[]; box_size: number; num_atoms: number }> {
    return this.fetchJson(`${MD_BASE_URL}/trajectory/${dbId}/frames`);
  }

  async getSavedFrameDetails(dbId: number, frameNumber: number): Promise<FrameDetails> {
    return this.fetchJson(`${MD_BASE_URL}/trajectory/${dbId}/frames/${frameNumber}`);
  }

  async solveNashEquilibrium(data: PayoffMatrixData): Promise<NashEquilibriumResponse> {
    return this.fetchJson(`${NASH_BASE_URL}/solve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGameExamples(): Promise<GameExample[]> {
    return this.fetchJson(`${NASH_BASE_URL}/examples`);
  }

  async getGameExampleById(id: number): Promise<GameExample> {
    return this.fetchJson(`${NASH_BASE_URL}/examples/${id}`);
  }
}

export const api = new ApiService();
