const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    const error = new Error('Admin access required');
    error.statusCode = 403;
    return next(error);
  }

  return next();
};

module.exports = verifyAdmin;
