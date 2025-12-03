const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const publicRoutes = [
    '/api/v1/users/register', 
    '/api/v1/users/login', 
    '/health',
    '/',
    '/api-docs',
    '/api-docs/',
    '/api-docs/swagger-ui.css',
    '/api-docs/swagger-ui-bundle.js',
    '/api-docs/swagger-ui-standalone-preset.js',
    '/api-docs/favicon-32x32.png'
  ];
  
  if (publicRoutes.some(route => req.path === route || req.path.startsWith(route))) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_REQUIRED',
        message: 'Требуется токен авторизации'
      }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Неверный или просроченный токен'
        }
      });
    }
    
    req.user = user;
    
    req.headers['x-user-id'] = user.id;
    req.headers['x-user-email'] = user.email;
    req.headers['x-user-roles'] = JSON.stringify(user.roles);
    
    next();
  });
};

module.exports = { authenticateToken };