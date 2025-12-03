const express = require('express');
const pino = require('pino');
const pinoHttp = require('pino-http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { authenticateToken } = require('./middleware/auth');
const { usersProxy, ordersProxy } = require('./middleware/proxy');
const rTracer = require('cls-rtracer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const logger = pino({ 
  level: process.env.LOG_LEVEL || 'info',
  mixin: () => {
    return { requestId: rTracer.id() };
  }
});

const httpLogger = pinoHttp({ 
  logger,
  genReqId: (req) => req.headers['x-request-id'] || rTracer.id() || require('crypto').randomUUID()
});

app.use(rTracer.expressMiddleware());

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || rTracer.id() || require('crypto').randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  req.log = logger.child({ requestId });
  next();
});

app.use(httpLogger);

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много запросов с вашего IP, попробуйте позже'
    }
  }
});

app.use(limiter);

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const gatewayRouter = require('./routes/gateway'); 

app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: { 
      service: 'api-gateway', 
      status: 'ok',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    } 
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Construction Management API Gateway',
      version: '1.0.0',
      docs: `http://localhost:${PORT}/api-docs`,
      services: {
        users: '/api/v1/users',
        orders: '/api/v1/orders'
      },
      requestId: req.headers['x-request-id']
    }
  });
});

app.use('/api/v1', gatewayRouter); 

app.use(authenticateToken);

app.use('/api/v1/users', usersProxy);
app.use('/api/v1/orders', ordersProxy);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Маршрут не найден'
    },
    requestId: req.headers['x-request-id']
  });
});

app.use((err, req, res, next) => {
  logger.error(err, 'Unhandled error');
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Внутренняя ошибка сервера'
    },
    requestId: req.headers['x-request-id']
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`);
  logger.info('Services:');
  logger.info(`  Users: ${process.env.USERS_SERVICE_URL || 'http://localhost:3001'}`);
  logger.info(`  Orders: ${process.env.ORDERS_SERVICE_URL || 'http://localhost:3002'}`);
});