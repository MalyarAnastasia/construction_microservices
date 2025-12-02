const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  console.log('Headers received:', {
    'x-user-id': req.headers['x-user-id'],
    'x-user-email': req.headers['x-user-email'],
    'x-user-roles': req.headers['x-user-roles'],
    'authorization': req.headers['authorization'] ? 'present' : 'missing'
  });

  // Приоритет 1: заголовки от Gateway
  if (req.headers['x-user-id']) {
    try {
      req.user = {
        id: req.headers['x-user-id'],
        email: req.headers['x-user-email'] || '',
        roles: req.headers['x-user-roles'] ? JSON.parse(req.headers['x-user-roles']) : ['engineer']
      };
      console.log('User from gateway headers:', req.user);
      return next();
    } catch (error) {
      console.error('Error parsing gateway headers:', error);
    }
  }

  // Приоритет 2: JWT токен напрямую
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    console.log('Trying to verify JWT token directly');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = {
        id: decoded.id,
        email: decoded.email,
        roles: decoded.roles || ['engineer']
      };
      console.log('User from JWT token:', req.user);
      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
    }
  }

  // Если ничего не сработало
  console.log('No valid auth found, using default user');
  req.user = { 
    id: 'a4841802-6006-42ec-9074-65fdf2138880',
    email: 'test@example.com',
    roles: ['engineer']
  };
  
  next();
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('Checking roles:', {
      userRoles: req.user?.roles,
      allowedRoles: allowedRoles
    });
    
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Доступ запрещен'
        }
      });
    }

    const hasRole = allowedRoles.some(role => req.user.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Недостаточно прав'
        }
      });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };