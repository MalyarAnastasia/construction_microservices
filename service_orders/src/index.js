const express = require('express');
const pino = require('pino');
const pinoHttp = require('pino-http');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Логирование
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const httpLogger = pinoHttp({ logger });

app.use(httpLogger);
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Подключаем маршруты
const projectsRoutes = require('./routes/projects');

app.use('/api/v1/orders', projectsRoutes);

// Маршрут для проверки состояния
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      service: 'orders', 
      status: 'ok',
      timestamp: new Date().toISOString()
    } 
  });
});

// Базовый маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Orders Service API',
    version: '1.0.0',
    docs: `http://localhost:${PORT}/api-docs`,
    endpoints: {
      projects: {
        create: 'POST /api/v1/orders/projects',
        list: 'GET /api/v1/orders/projects',
        get: 'GET /api/v1/orders/projects/:id'
      }
    }
  });
});

app.listen(PORT, () => {
  logger.info(`Orders service running on port ${PORT}`);
  logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});