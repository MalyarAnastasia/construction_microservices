const express = require('express');
const pino = require('pino');
const pinoHttp = require('pino-http');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

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

const projectsRoutes = require('./routes/projects');
const defectsRoutes = require('./routes/defects');

app.use('/api/v1/orders', projectsRoutes);
app.use('/api/v1/orders', defectsRoutes);

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

app.get('/', (req, res) => {
  res.json({
    message: 'Orders Service API',
    version: '1.0.0',
    docs: `http://localhost:${PORT}/api-docs`,
    endpoints: {
      projects: {
        create: 'POST /api/v1/orders/projects',
        list: 'GET /api/v1/orders/projects',
        get: 'GET /api/v1/orders/projects/:id',
        update: 'PUT /api/v1/orders/projects/:id',
        delete: 'DELETE /api/v1/orders/projects/:id'
      },
      defects: {
        create: 'POST /api/v1/orders/defects',
        get: 'GET /api/v1/orders/defects/:id',
        list: 'GET /api/v1/orders/defects/project/:projectId',
        update: 'PUT /api/v1/orders/defects/:id',
        delete: 'DELETE /api/v1/orders/defects/:id'
      }
    }
  });
});

app.listen(PORT, () => {
  logger.info(`Orders service running on port ${PORT}`);
  logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});