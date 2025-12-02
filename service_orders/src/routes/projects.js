const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { projectRepository } = require('../db/queries');
const { authenticateToken, authorizeRoles } = require('../middleware/auth'); // Добавляем


const createProjectSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  address: Joi.string().min(5).required(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
    'date.min': 'Дата окончания должна быть не раньше даты начала'
  }),
  budget: Joi.number().min(0),
  status: Joi.string().valid('draft', 'active', 'completed', 'cancelled').default('draft')
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
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, cancelled]
 *                 default: draft
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
router.post('/projects', authenticateToken, async (req, res) => {
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

  try {
    const newProject = await projectRepository.create({
      userId: req.user.id,
      ...value
    });

    req.log.info(`Project created: ${newProject.title} by user ${req.user.id}`);
    
    // Публикация события
    req.log.info(`Event: PROJECT_CREATED, payload: ${JSON.stringify({
      projectId: newProject.id,
      userId: newProject.user_id,
      title: newProject.title,
      status: newProject.status,
      timestamp: new Date().toISOString()
    })}`);

    res.status(201).json({
      success: true,
      data: newProject
    });
  } catch (error) {
    req.log.error(error, 'Create project error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при создании проекта'
      }
    });
  }
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
 *       403:
 *         description: Нет доступа
 *       404:
 *         description: Проект не найден
 */
router.get('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await projectRepository.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        }
      });
    }

    // Проверка прав доступа (только создатель, менеджер или админ)
    const hasAccess = 
      project.user_id === req.user.id ||
      req.user.roles.includes('manager') ||
      req.user.roles.includes('admin');

    if (!hasAccess) {
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
  } catch (error) {
    req.log.error(error, 'Get project error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при получении проекта'
      }
    });
  }
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
 *                         totalPages:
 *                           type: integer
 */
router.get('/projects', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  try {
    const { projects, total } = await projectRepository.findByUserId(req.user.id, {
      page: pageNum,
      limit: limitNum,
      status
    });

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    req.log.error(error, 'Get projects list error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при получении списка проектов'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/orders/projects/{id}:
 *   put:
 *     summary: Обновить проект
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Обновленное название
 *               description:
 *                 type: string
 *                 example: Обновленное описание
 *               address:
 *                 type: string
 *                 example: Новый адрес
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, cancelled]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               budget:
 *                 type: number
 *     responses:
 *       200:
 *         description: Проект обновлен
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
 *       403:
 *         description: Нет прав на обновление
 */
router.put('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await projectRepository.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        }
      });
    }

    // Проверка прав (только создатель, менеджер или админ)
    const canUpdate = 
      project.user_id === req.user.id ||
      req.user.roles.includes('manager') ||
      req.user.roles.includes('admin');

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет прав на обновление проекта'
        }
      });
    }

    const updateSchema = Joi.object({
      title: Joi.string().min(3).max(100),
      description: Joi.string().min(10).max(1000),
      address: Joi.string().min(5),
      status: Joi.string().valid('draft', 'active', 'completed', 'cancelled'),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
        'date.min': 'Дата окончания должна быть не раньше даты начала'
      }),
      budget: Joi.number().min(0)
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const updatedProject = await projectRepository.update(req.params.id, value);

    // Публикация события обновления статуса
    if (value.status && value.status !== project.status) {
      req.log.info(`Event: PROJECT_STATUS_UPDATED, payload: ${JSON.stringify({
        projectId: project.id,
        oldStatus: project.status,
        newStatus: value.status,
        updatedBy: req.user.id,
        timestamp: new Date().toISOString()
      })}`);
    }

    res.json({
      success: true,
      data: updatedProject
    });
  } catch (error) {
    req.log.error(error, 'Update project error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при обновлении проекта'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/orders/projects/{id}:
 *   delete:
 *     summary: Удалить проект
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
 *     responses:
 *       200:
 *         description: Проект удален
 *       403:
 *         description: Нет прав на удаление
 *       404:
 *         description: Проект не найден
 */
router.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await projectRepository.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        }
      });
    }

    // Удалять могут только создатель или админ
    const canDelete = 
      project.user_id === req.user.id ||
      req.user.roles.includes('admin');

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет прав на удаление проекта'
        }
      });
    }

    await projectRepository.delete(req.params.id);
    req.log.info(`Project deleted: ${project.id}`);

    res.json({
      success: true,
      data: { message: 'Проект успешно удален' }
    });
  } catch (error) {
    req.log.error(error, 'Delete project error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при удалении проекта'
      }
    });
  }
});

module.exports = router;