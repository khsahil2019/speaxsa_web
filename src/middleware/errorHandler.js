function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry. Resource already exists.', code: 'DUPLICATE_ENTRY' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource does not exist.', code: 'FOREIGN_KEY_ERROR' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;
