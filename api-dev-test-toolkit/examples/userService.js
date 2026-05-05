/**
 * 用户服务模块 - 处理用户相关的业务逻辑
 * @module UserService
 */

/**
 * 创建新用户
 * @param {string} username - 用户名 (3-20 个字符)
 * @param {string} email - 用户邮箱地址
 * @param {string} password - 用户密码 (至少 8 个字符)
 * @param {object} [options={}] - 可选配置项
 * @param {string} [options.role='user'] - 用户角色 (user/admin/editor)
 * @param {boolean} [options.active=true] - 用户是否激活
 * @returns {Promise<object>} 创建的用户对象
 * @throws {ValidationError} 当参数验证失败时抛出
 * @throws {DuplicateError} 当用户名或邮箱已存在时抛出
 * @example
 * const user = await createUser('john_doe', 'john@example.com', 'secret123', {
 *   role: 'admin'
 * });
 * console.log(user.id);
 */
export async function createUser(username, email, password, options = {}) {
  if (!username || username.length < 3 || username.length > 20) {
    throw new ValidationError('用户名必须是 3-20 个字符');
  }
  
  if (!email || !isValidEmail(email)) {
    throw new ValidationError('请提供有效的邮箱地址');
  }
  
  if (!password || password.length < 8) {
    throw new ValidationError('密码至少需要 8 个字符');
  }
  
  const existingUser = await findUserByUsernameOrEmail(username, email);
  if (existingUser) {
    throw new DuplicateError('用户名或邮箱已存在');
  }
  
  const hashedPassword = await hashPassword(password);
  const user = {
    id: generateId(),
    username,
    email,
    password: hashedPassword,
    role: options.role || 'user',
    active: options.active !== undefined ? options.active : true,
    createdAt: new Date()
  };
  
  await saveUser(user);
  
  return user;
}

/**
 * 根据 ID 获取用户信息
 * @param {string} userId - 用户唯一标识符
 * @returns {Promise<object|null>} 用户对象，如果不存在则返回 null
 * @example
 * const user = await getUserById('123e4567-e89b-12d3-a456-426614174000');
 * if (user) {
 *   console.log(user.username);
 * }
 */
export async function getUserById(userId) {
  if (!userId) {
    return null;
  }
  
  return await findUserById(userId);
}

/**
 * 更新用户信息
 * @param {string} userId - 用户 ID
 * @param {object} updates - 要更新的字段
 * @param {string} [updates.email] - 新邮箱
 * @param {string} [updates.password] - 新密码
 * @param {string} [updates.role] - 新角色
 * @returns {Promise<object>} 更新后的用户对象
 * @throws {NotFoundError} 当用户不存在时抛出
 */
export async function updateUser(userId, updates) {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError('用户不存在');
  }
  
  const allowedUpdates = ['email', 'password', 'role'];
  const validUpdates = {};
  
  for (const key of Object.keys(updates)) {
    if (allowedUpdates.includes(key)) {
      validUpdates[key] = updates[key];
    }
  }
  
  if (validUpdates.password) {
    if (validUpdates.password.length < 8) {
      throw new ValidationError('密码至少需要 8 个字符');
    }
    validUpdates.password = await hashPassword(validUpdates.password);
  }
  
  if (validUpdates.email && !isValidEmail(validUpdates.email)) {
    throw new ValidationError('请提供有效的邮箱地址');
  }
  
  const updatedUser = { ...user, ...validUpdates, updatedAt: new Date() };
  await saveUser(updatedUser);
  
  return updatedUser;
}

/**
 * 删除用户
 * @param {string} userId - 用户 ID
 * @returns {Promise<boolean>} 删除成功返回 true
 * @throws {NotFoundError} 当用户不存在时抛出
 */
export async function deleteUser(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError('用户不存在');
  }
  
  await removeUser(userId);
  
  return true;
}

/**
 * 搜索用户
 * @param {object} query - 搜索条件
 * @param {string} [query.username] - 用户名关键字
 * @param {string} [query.email] - 邮箱关键字
 * @param {string} [query.role] - 角色过滤
 * @param {number} [query.page=1] - 页码
 * @param {number} [query.limit=10] - 每页数量
 * @returns {Promise<{users: object[], total: number, page: number, limit: number}>} 搜索结果
 */
export async function searchUsers(query = {}) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const offset = (page - 1) * limit;
  
  const { users, total } = await findUsersWithPagination(query, offset, limit);
  
  return {
    users,
    total,
    page,
    limit
  };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class DuplicateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateError';
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

async function hashPassword(password) {
  return `hashed_${password}`;
}

async function findUserById(userId) {
  return null;
}

async function findUserByUsernameOrEmail(username, email) {
  return null;
}

async function saveUser(user) {
  return user;
}

async function removeUser(userId) {
  return true;
}

async function findUsersWithPagination(query, offset, limit) {
  return {
    users: [],
    total: 0
  };
}

export {
  ValidationError,
  DuplicateError,
  NotFoundError
};
