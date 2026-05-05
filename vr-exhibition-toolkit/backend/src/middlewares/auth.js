const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { AppError } = require('./errorHandler');
const config = require('../config/config');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('您未登录，请先登录以获取访问权限', 401));
  }

  try {
    const decoded = await promisify(jwt.verify)(token, config.jwtSecret);
    
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role || 'user'
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('无效的令牌，请重新登录', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('您的令牌已过期，请重新登录', 401));
    }
    return next(new AppError('认证失败，请重试', 401));
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('您没有权限执行此操作', 403)
      );
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    try {
      const decoded = await promisify(jwt.verify)(token, config.jwtSecret);
      
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role || 'user'
      };
    } catch (error) {
      // Token 无效，但不阻止请求继续
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
};

module.exports = {
  protect,
  restrictTo,
  optionalAuth
};
