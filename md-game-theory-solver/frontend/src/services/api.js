import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 分子动力学相关 API
export const mdApi = {
  // 开始新的模拟
  startSimulation: (config) => api.post('/md/simulate', config),
  // 获取模拟状态
  getSimulationStatus: (simId) => api.get(`/md/simulation/${simId}/status`),
  // 获取原子轨迹数据
  getTrajectory: (simId, frameStart, frameEnd) => 
    api.get(`/md/simulation/${simId}/trajectory`, {
      params: { frame_start: frameStart, frame_end: frameEnd }
    }),
  // 获取模拟统计数据
  getSimulationStats: (simId) => api.get(`/md/simulation/${simId}/stats`),
  // 获取所有模拟列表
  listSimulations: () => api.get('/md/simulations'),
};

// 博弈论相关 API
export const gameApi = {
  // 求解纳什均衡
  solveNashEquilibrium: (gameConfig) => api.post('/game/solve', gameConfig),
  // 获取经典博弈案例
  getGameTemplates: () => api.get('/game/templates'),
  // 获取所有已保存的游戏
  listGames: () => api.get('/game/games'),
  // 保存游戏配置
  saveGame: (gameConfig) => api.post('/game/save', gameConfig),
  // 获取指定游戏
  getGame: (gameId) => api.get(`/game/game/${gameId}`),
};

export default api;
