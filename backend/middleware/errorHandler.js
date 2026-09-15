const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  if (err.code === 'GAP_DAY_LOCKED') {
    return res.status(403).json({
      success: false,
      code: 'GAP_DAY_LOCKED',
      message: err.message || 'This content was published during a gap in your subscription access window.'
    });
  }

  const payload = {
    success: false,
    message: err.message || 'Internal server error'
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  notFound,
  errorHandler
};
