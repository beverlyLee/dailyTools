const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const config = require('../config/config');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

const users = new Map();

const signToken = (id, username, role) => {
  return jwt.sign(
    { id, username, role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id, user.username, user.role);
  
  const cookieOptions = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };
  
  res.cookie('jwt', token, cookieOptions);
  
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

const signup = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      return next(new AppError('请提供用户名、邮箱和密码', 400));
    }
    
    const emailExists = Array.from(users.values()).some(u => u.email === email);
    if (emailExists) {
      return next(new AppError('该邮箱已被注册', 400));
    }
    
    const usernameExists = Array.from(users.values()).some(u => u.username === username);
    if (usernameExists) {
      return next(new AppError('该用户名已被使用', 400));
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      role: role || 'user',
      avatar: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLogin: null
    };
    
    users.set(newUser.id, newUser);
    
    logger.info(`用户注册成功: ${newUser.id} - ${username}`);
    
    createSendToken(newUser, 201, req, res);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    
    if ((!email && !username) || !password) {
      return next(new AppError('请提供邮箱/用户名和密码', 400));
    }
    
    let user = null;
    
    if (email) {
      user = Array.from(users.values()).find(u => u.email === email);
    } else if (username) {
      user = Array.from(users.values()).find(u => u.username === username);
    }
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('邮箱/用户名或密码错误', 401));
    }
    
    user.lastLogin = Date.now();
    users.set(user.id, user);
    
    logger.info(`用户登录成功: ${user.id} - ${user.username}`);
    
    createSendToken(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    status: 'success',
    message: '已登出'
  });
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next(new AppError('请提供邮箱', 400));
    }
    
    const user = Array.from(users.values()).find(u => u.email === email);
    
    if (!user) {
      return next(new AppError('该邮箱未注册', 404));
    }
    
    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    
    users.set(user.id, user);
    
    logger.info(`密码重置令牌已生成: ${user.id} - ${resetToken}`);
    
    res.status(200).json({
      status: 'success',
      message: '密码重置令牌已发送到您的邮箱',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return next(new AppError('请提供新密码', 400));
    }
    
    const user = Array.from(users.values()).find(
      u => u.resetPasswordToken === token && u.resetPasswordExpires > Date.now()
    );
    
    if (!user) {
      return next(new AppError('令牌无效或已过期', 400));
    }
    
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = Date.now();
    
    users.set(user.id, user);
    
    logger.info(`密码重置成功: ${user.id}`);
    
    createSendToken(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

const getMe = (req, res, next) => {
  try {
    const user = users.get(req.user.id);
    
    if (!user) {
      return next(new AppError('用户不存在', 404));
    }
    
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return next(new AppError('请提供当前密码和新密码', 400));
    }
    
    const user = users.get(req.user.id);
    
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return next(new AppError('当前密码错误', 401));
    }
    
    user.password = await bcrypt.hash(newPassword, 12);
    user.updatedAt = Date.now();
    
    users.set(user.id, user);
    
    logger.info(`密码更新成功: ${user.id}`);
    
    createSendToken(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { username, email, avatar } = req.body;
    
    const user = users.get(req.user.id);
    
    if (username && username !== user.username) {
      const usernameExists = Array.from(users.values()).some(
        u => u.username === username && u.id !== user.id
      );
      if (usernameExists) {
        return next(new AppError('该用户名已被使用', 400));
      }
      user.username = username;
    }
    
    if (email && email !== user.email) {
      const emailExists = Array.from(users.values()).some(
        u => u.email === email && u.id !== user.id
      );
      if (emailExists) {
        return next(new AppError('该邮箱已被注册', 400));
      }
      user.email = email;
    }
    
    if (avatar !== undefined) {
      user.avatar = avatar;
    }
    
    user.updatedAt = Date.now();
    users.set(user.id, user);
    
    logger.info(`用户信息更新成功: ${user.id}`);
    
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteMe = async (req, res, next) => {
  try {
    const user = users.get(req.user.id);
    
    if (!user) {
      return next(new AppError('用户不存在', 404));
    }
    
    users.delete(req.user.id);
    
    logger.info(`用户已删除: ${req.user.id}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = (req, res, next) => {
  try {
    const userList = Array.from(users.values()).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
    
    res.status(200).json({
      status: 'success',
      results: userList.length,
      data: {
        users: userList
      }
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      return next(new AppError('请提供用户名、邮箱和密码', 400));
    }
    
    const emailExists = Array.from(users.values()).some(u => u.email === email);
    if (emailExists) {
      return next(new AppError('该邮箱已被注册', 400));
    }
    
    const usernameExists = Array.from(users.values()).some(u => u.username === username);
    if (usernameExists) {
      return next(new AppError('该用户名已被使用', 400));
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      role: role || 'user',
      avatar: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLogin: null
    };
    
    users.set(newUser.id, newUser);
    
    logger.info(`管理员创建用户成功: ${newUser.id} - ${username}`);
    
    newUser.password = undefined;
    
    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUser = (req, res, next) => {
  try {
    const user = users.get(req.params.id);
    
    if (!user) {
      return next(new AppError('用户不存在', 404));
    }
    
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = users.get(req.params.id);
    
    if (!user) {
      return next(new AppError('用户不存在', 404));
    }
    
    const { username, email, role, avatar } = req.body;
    
    if (username && username !== user.username) {
      const usernameExists = Array.from(users.values()).some(
        u => u.username === username && u.id !== user.id
      );
      if (usernameExists) {
        return next(new AppError('该用户名已被使用', 400));
      }
      user.username = username;
    }
    
    if (email && email !== user.email) {
      const emailExists = Array.from(users.values()).some(
        u => u.email === email && u.id !== user.id
      );
      if (emailExists) {
        return next(new AppError('该邮箱已被注册', 400));
      }
      user.email = email;
    }
    
    if (role) {
      user.role = role;
    }
    
    if (avatar !== undefined) {
      user.avatar = avatar;
    }
    
    user.updatedAt = Date.now();
    users.set(user.id, user);
    
    logger.info(`管理员更新用户信息成功: ${user.id}`);
    
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = (req, res, next) => {
  try {
    const user = users.get(req.params.id);
    
    if (!user) {
      return next(new AppError('用户不存在', 404));
    }
    
    users.delete(req.params.id);
    
    logger.info(`管理员删除用户成功: ${req.params.id}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updatePassword,
  updateMe,
  deleteMe,
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser
};
