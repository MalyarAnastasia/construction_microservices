const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Construction Management API Gateway',
      version: '1.0.0',
      description: 'Единый API шлюз для системы управления строительными проектами',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Локальный сервер (Gateway)',
      },
    ],
    tags: [
        {
  name: 'Defects',
  description: 'Управление дефектами в проектах',
},
      {
        name: 'Gateway',
        description: 'Информация о шлюзе',
      },
      {
        name: 'Auth',
        description: 'Аутентификация и авторизация',
      },
      {
        name: 'Users',
        description: 'Управление пользователями',
      },
      {
        name: 'Projects',
        description: 'Управление строительными проектами',
      }
    ],
    components: {
      schemas: {
        Defect: {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid'
    },
    projectId: {
      type: 'string',
      format: 'uuid'
    },
    title: {
      type: 'string',
      example: 'Трещина в стене'
    },
    description: {
      type: 'string',
      example: 'Обнаружена трещина в несущей стене'
    },
    severity: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: 'string',
      enum: ['reported', 'in_progress', 'resolved', 'closed'],
      default: 'reported'
    },
    reporterId: {
      type: 'string',
      format: 'uuid'
    },
    assigneeId: {
      type: 'string',
      format: 'uuid',
      nullable: true
    },
    location: {
      type: 'string',
      example: 'Корпус А, этаж 3, квартира 15'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    }
  }
},
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Некорректные данные'
                }
              }
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;