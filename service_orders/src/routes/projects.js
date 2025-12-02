const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Middleware для проверки JWT (упрощенный, позже вынесем в отдельный файл)
const authenticateToken = (req, res, next) => {
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

  // В реальном приложении здесь будет проверка JWT
  // Для тестирования просто декодируем
  try {
    // Простая заглушка - в реальности нужно проверять подпись
    req.user = { id: 'user-id-from-token' };
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Неверный токен'
      }
    });
  }
};

// Временное хранилище проектов
const projects = [];

// Схема валидации создания проекта
const createProjectSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  address: Joi.string().min(5).required(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  budget: Joi.number().min(0)
});

/**
 * @swagger
 * /api/v1/orders/projects:
 *   post:
 *     summary: Создать новый проект
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - address
 *             properties:
 *               title:
 *                 type: string
 *                 example: ЖК "Солнечный"
 *               description:
 *                 type: string
 *                 example: Строительство жилого комплекса
 *               address:
 *                 type: string
 *                 example: ул. Строителей, д. 15
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               budget:
 *                 type: number
 *                 example: 5000000
 *     responses:
 *       201:
 *         description: Проект успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 */
router.post('/projects', authenticateToken, (req, res) => {
  const { error, value } = createProjectSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }

  const newProject = {
    id: uuidv4(),
    userId: req.user.id,
    ...value,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projects.push(newProject);
  req.log.info(`Project created: ${newProject.title} by user ${req.user.id}`);

  res.status(201).json({
    success: true,
    data: newProject
  });
});

/**
 * @swagger
 * /api/v1/orders/projects/{id}:
 *   get:
 *     summary: Получить проект по ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID проекта
 *     responses:
 *       200:
 *         description: Данные проекта
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Проект не найден
 */
router.get('/projects/:id', authenticateToken, (req, res) => {
  const project = projects.find(p => p.id === req.params.id);
  
  if (!project) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'Проект не найден'
      }
    });
  }

  // Проверка прав доступа (только создатель)
  if (project.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Нет доступа к этому проекту'
      }
    });
  }

  res.json({
    success: true,
    data: project
  });
});

/**
 * @swagger
 * /api/v1/orders/projects:
 *   get:
 *     summary: Получить список проектов пользователя
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Количество записей на странице
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, completed, cancelled]
 *         description: Фильтр по статусу
 *     responses:
 *       200:
 *         description: Список проектов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Project'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 */
router.get('/projects', authenticateToken, (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // Фильтрация проектов пользователя
  let userProjects = projects.filter(p => p.userId === req.user.id);
  
  if (status) {
    userProjects = userProjects.filter(p => p.status === status);
  }

  // Пагинация
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = pageNum * limitNum;
  const paginatedProjects = userProjects.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      projects: paginatedProjects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: userProjects.length,
        totalPages: Math.ceil(userProjects.length / limitNum)
      }
    }
  });
});

module.exports = router;