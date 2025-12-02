const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Orders Service API',
      version: '1.0.0',
      description: 'API для управления строительными проектами и дефектами',
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Локальный сервер',
      },
    ],
    tags: [
      {
        name: 'Projects',
        description: 'Управление строительными проектами',
      },
      {
        name: 'Defects',
        description: 'Управление дефектами в проектах',
      },
      {
        name: 'Health',
        description: 'Проверка состояния сервиса',
      },
    ],
    components: {
      schemas: {
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'ID создателя проекта'
            },
            title: {
              type: 'string',
              example: 'ЖК "Солнечный"'
            },
            description: {
              type: 'string',
              example: 'Строительство жилого комплекса'
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'completed', 'cancelled'],
              default: 'draft'
            },
            address: {
              type: 'string',
              example: 'ул. Строителей, д. 15'
            },
            startDate: {
              type: 'string',
              format: 'date'
            },
            endDate: {
              type: 'string',
              format: 'date'
            },
            budget: {
              type: 'number',
              example: 5000000
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