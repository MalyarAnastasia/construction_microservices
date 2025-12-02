const express = require('express');
const pino = require('pino');
const pinoHttp = require('pino-http');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const httpLogger = pinoHttp({ logger });

app.use(httpLogger);
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (req.headers['x-user-id']) {
    req.log.debug('Headers from gateway:', {
      'x-user-id': req.headers['x-user-id'],
      'x-user-email': req.headers['x-user-email'],
      'x-request-id': req.headers['x-request-id']
    });
  }
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

app.use('/api/v1/users', authRoutes);
app.use('/api/v1/users', userRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      service: 'users', 
      status: 'ok',
      timestamp: new Date().toISOString()
    } 
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Users Service API',
    version: '1.0.0',
    docs: `http://localhost:${PORT}/api-docs`,
    endpoints: {
      auth: {
        register: 'POST /api/v1/users/register',
        login: 'POST /api/v1/users/login'
      },
      users: {
        profile: 'GET /api/v1/users/profile',
        list: 'GET /api/v1/users (admin only)'
      }
    }
  });
});

app.listen(PORT, () => {
  logger.info(`Users service running on port ${PORT}`);
  logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});