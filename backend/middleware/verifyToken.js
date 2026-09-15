const jwt = require('jsonwebtoken');
const env = require('../config/env');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      const error = new Error('Authentication token is required');
      error.statusCode = 401;
      throw error;
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: decoded.id || decoded.userId,
      role: decoded.role || 'USER'
    };

    return next();
  } catch (error) {
    const status = error.statusCode || 401;
    return res.status(status).json({
      success: false,
      message: error.message || 'Invalid or expired token'
    });
  }
};

module.exports = verifyToken;
