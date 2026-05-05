import axios from 'axios';

const API_BASE_URL = '/api/governance';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 规则类型
export const RULE_TYPES = {
  CANARY: 'canary',
  BLUE_GREEN: 'blue-green',
  CIRCUIT_BREAKER: 'circuit-breaker',
  ACCESS_CONTROL: 'access-control',
};

// 金丝雀发布规则
export const getCanaryRules = async () => {
  try {
    const response = await api.get('/canary');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取金丝雀规则失败');
  } catch (error) {
    console.error('获取金丝雀规则失败:', error);
    throw error;
  }
};

export const createCanaryRule = async (rule) => {
  try {
    const response = await api.post('/canary', rule);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '创建金丝雀规则失败');
  } catch (error) {
    console.error('创建金丝雀规则失败:', error);
    throw error;
  }
};

export const updateCanaryRule = async (name, rule) => {
  try {
    const response = await api.put(`/canary/${name}`, rule);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '更新金丝雀规则失败');
  } catch (error) {
    console.error('更新金丝雀规则失败:', error);
    throw error;
  }
};

export const deleteCanaryRule = async (name) => {
  try {
    const response = await api.delete(`/canary/${name}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '删除金丝雀规则失败');
  } catch (error) {
    console.error('删除金丝雀规则失败:', error);
    throw error;
  }
};

// 蓝绿部署规则
export const getBlueGreenRules = async () => {
  try {
    const response = await api.get('/blue-green');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取蓝绿规则失败');
  } catch (error) {
    console.error('获取蓝绿规则失败:', error);
    throw error;
  }
};

export const createBlueGreenRule = async (rule) => {
  try {
    const response = await api.post('/blue-green', rule);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '创建蓝绿规则失败');
  } catch (error) {
    console.error('创建蓝绿规则失败:', error);
    throw error;
  }
};

export const updateBlueGreenRule = async (name, rule) => {
  try {
    const response = await api.put(`/blue-green/${name}`, rule);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '更新蓝绿规则失败');
  } catch (error) {
    console.error('更新蓝绿规则失败:', error);
    throw error;
  }
};

export const deleteBlueGreenRule = async (name) => {
  try {
    const response = await api.delete(`/blue-green/${name}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '删除蓝绿规则失败');
  } catch (error) {
    console.error('删除蓝绿规则失败:', error);
    throw error;
  }
};

// 熔断降级规则
export const getCircuitBreakerRules = async () => {
  try {
    const response = await api.get('/circuit-breaker');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取熔断规则失败');
  } catch (error) {
    console.error('获取熔断规则失败:', error);
    throw error;
  }
};

export const createCircuitBreakerRule = async (rule) => {
  try {
    const response = await api.post('/circuit-breaker', rule);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '创建熔断规则失败');
  } catch (error) {
    console.error('创建熔断规则失败:', error);
    throw error;
  }
};

export const updateCircuitBreakerRule = async (name, rule) => {
  try {
    const response = await api.put(`/circuit-breaker/${name}`, rule);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '更新熔断规则失败');
  } catch (error) {
    console.error('更新熔断规则失败:', error);
    throw error;
  }
};

export const deleteCircuitBreakerRule = async (name) => {
  try {
    const response = await api.delete(`/circuit-breaker/${name}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '删除熔断规则失败');
  } catch (error) {
    console.error('删除熔断规则失败:', error);
    throw error;
  }
};

// 黑白名单规则
export const getAccessControlRules = async () => {
  try {
    const response = await api.get('/access-control');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取访问控制规则失败');
  } catch (error) {
    console.error('获取访问控制规则失败:', error);
    throw error;
  }
};

export const createAccessControlRule = async (rule) => {
  try {
    const response = await api.post('/access-control', rule);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '创建访问控制规则失败');
  } catch (error) {
    console.error('创建访问控制规则失败:', error);
    throw error;
  }
};

export const updateAccessControlRule = async (name, rule) => {
  try {
    const response = await api.put(`/access-control/${name}`, rule);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '更新访问控制规则失败');
  } catch (error) {
    console.error('更新访问控制规则失败:', error);
    throw error;
  }
};

export const deleteAccessControlRule = async (name) => {
  try {
    const response = await api.delete(`/access-control/${name}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '删除访问控制规则失败');
  } catch (error) {
    console.error('删除访问控制规则失败:', error);
    throw error;
  }
};

// YAML 同步
export const getRuleYAML = async (ruleType, name) => {
  try {
    const response = await api.get(`/yaml/${ruleType}/${name}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取规则 YAML 失败');
  } catch (error) {
    console.error('获取规则 YAML 失败:', error);
    throw error;
  }
};

export const applyRuleYAML = async (ruleType, yaml) => {
  try {
    const response = await api.post(`/yaml/${ruleType}`, { yaml });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '应用 YAML 规则失败');
  } catch (error) {
    console.error('应用 YAML 规则失败:', error);
    throw error;
  }
};

// 根据规则类型获取对应的 API 函数
export const getRuleApiByType = (ruleType) => {
  switch (ruleType) {
    case RULE_TYPES.CANARY:
      return {
        get: getCanaryRules,
        create: createCanaryRule,
        update: updateCanaryRule,
        delete: deleteCanaryRule,
      };
    case RULE_TYPES.BLUE_GREEN:
      return {
        get: getBlueGreenRules,
        create: createBlueGreenRule,
        update: updateBlueGreenRule,
        delete: deleteBlueGreenRule,
      };
    case RULE_TYPES.CIRCUIT_BREAKER:
      return {
        get: getCircuitBreakerRules,
        create: createCircuitBreakerRule,
        update: updateCircuitBreakerRule,
        delete: deleteCircuitBreakerRule,
      };
    case RULE_TYPES.ACCESS_CONTROL:
      return {
        get: getAccessControlRules,
        create: createAccessControlRule,
        update: updateAccessControlRule,
        delete: deleteAccessControlRule,
      };
    default:
      throw new Error(`不支持的规则类型: ${ruleType}`);
  }
};

export default {
  getCanaryRules,
  createCanaryRule,
  updateCanaryRule,
  deleteCanaryRule,
  getBlueGreenRules,
  createBlueGreenRule,
  updateBlueGreenRule,
  deleteBlueGreenRule,
  getCircuitBreakerRules,
  createCircuitBreakerRule,
  updateCircuitBreakerRule,
  deleteCircuitBreakerRule,
  getAccessControlRules,
  createAccessControlRule,
  updateAccessControlRule,
  deleteAccessControlRule,
  getRuleYAML,
  applyRuleYAML,
  getRuleApiByType,
  RULE_TYPES,
};
