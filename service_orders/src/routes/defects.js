const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { projectRepository, defectRepository } = require('../db/queries');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const createDefectSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(5000).required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  location: Joi.string().min(3).max(500).required(),
  assigneeId: Joi.string().uuid().allow(null, '')
});

const updateDefectSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().min(10).max(5000),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
  status: Joi.string().valid('reported', 'in_progress', 'resolved', 'closed'),
  assigneeId: Joi.string().uuid().allow(null, ''),
  location: Joi.string().min(3).max(500)
});

/**
 * @swagger
 * /api/v1/orders/defects:
 *   post:
 *     summary: Создать новый дефект
 *     tags: [Defects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - title
 *               - description
 *               - location
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *                 example: Трещина в стене
 *               description:
 *                 type: string
 *                 example: Обнаружена трещина в несущей стене
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               location:
 *                 type: string
 *                 example: Корпус А, этаж 3, квартира 15
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Дефект успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Defect'
 */
router.post('/defects', authenticateToken, async (req, res) => {
  const { error, value } = createDefectSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }

  const { projectId, title, description, severity, location, assigneeId } = value;

  try {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        }
      });
    }

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

    const newDefect = await defectRepository.create({
      projectId,
      title,
      description,
      severity,
      reporterId: req.user.id,
      assigneeId: assigneeId || null,
      location
    });

    req.log.info(`Defect created: ${title} in project ${projectId}`);
    
    req.log.info(`Event: DEFECT_CREATED, payload: ${JSON.stringify({
      defectId: newDefect.id,
      projectId: newDefect.project_id,
      reporterId: newDefect.reporter_id,
      severity: newDefect.severity,
      timestamp: new Date().toISOString()
    })}`);

    res.status(201).json({
      success: true,
      data: newDefect
    });
  } catch (error) {
    req.log.error(error, 'Create defect error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при создании дефекта'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/orders/defects/{id}:
 *   get:
 *     summary: Получить дефект по ID
 *     tags: [Defects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID дефекта
 *     responses:
 *       200:
 *         description: Данные дефекта
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Defect'
 */
router.get('/defects/:id', authenticateToken, async (req, res) => {
  try {
    const defect = await defectRepository.findById(req.params.id);
    
    if (!defect) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEFECT_NOT_FOUND',
          message: 'Дефект не найден'
        }
      });
    }

    const project = await projectRepository.findById(defect.project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        }
      });
    }

    const hasAccess = 
      project.user_id === req.user.id ||
      defect.reporter_id === req.user.id ||
      defect.assignee_id === req.user.id ||
      req.user.roles.includes('manager') ||
      req.user.roles.includes('admin');

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет доступа к этому дефекту'
        }
      });
    }

    res.json({
      success: true,
      data: defect
    });
  } catch (error) {
    req.log.error(error, 'Get defect error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при получении дефекта'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/orders/defects/project/{projectId}:
 *   get:
 *     summary: Получить дефекты проекта
 *     tags: [Defects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID проекта
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
 *           enum: [reported, in_progress, resolved, closed]
 *         description: Фильтр по статусу
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Фильтр по критичности
 *     responses:
 *       200:
 *         description: Список дефектов проекта
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
 *                     defects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Defect'
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
router.get('/defects/project/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 10, status, severity } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  try {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        }
      });
    }

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

    const { defects, total } = await defectRepository.findByProjectId(projectId, {
      page: pageNum,
      limit: limitNum,
      status,
      severity
    });

    res.json({
      success: true,
      data: {
        defects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    req.log.error(error, 'Get project defects error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при получении дефектов проекта'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/orders/defects/{id}:
 *   put:
 *     summary: Обновить дефект
 *     tags: [Defects]
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
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               status:
 *                 type: string
 *                 enum: [reported, in_progress, resolved, closed]
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Дефект обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Defect'
 */
router.put('/defects/:id', authenticateToken, async (req, res) => {
  const { error, value } = updateDefectSchema.validate(req.body);
  
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
    const defect = await defectRepository.findById(req.params.id);
    
    if (!defect) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEFECT_NOT_FOUND',
          message: 'Дефект не найден'
        }
      });
    }

    const project = await projectRepository.findById(defect.project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        }
      });
    }

    const canUpdate = 
      defect.reporter_id === req.user.id ||
      defect.assignee_id === req.user.id ||
      project.user_id === req.user.id ||
      req.user.roles.includes('manager') ||
      req.user.roles.includes('admin');

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет прав на обновление дефекта'
        }
      });
    }

    const updatedDefect = await defectRepository.update(req.params.id, value);

    if (value.status && value.status !== defect.status) {
      req.log.info(`Event: DEFECT_STATUS_UPDATED, payload: ${JSON.stringify({
        defectId: defect.id,
        oldStatus: defect.status,
        newStatus: value.status,
        updatedBy: req.user.id,
        timestamp: new Date().toISOString()
      })}`);
    }

    res.json({
      success: true,
      data: updatedDefect
    });
  } catch (error) {
    req.log.error(error, 'Update defect error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при обновлении дефекта'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/orders/defects/{id}:
 *   delete:
 *     summary: Удалить дефект
 *     tags: [Defects]
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
 *         description: Дефект удален
 */
router.delete('/defects/:id', authenticateToken, async (req, res) => {
  try {
    const defect = await defectRepository.findById(req.params.id);
    
    if (!defect) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEFECT_NOT_FOUND',
          message: 'Дефект не найден'
        }
      });
    }

    const project = await projectRepository.findById(defect.project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        }
      });
    }

    const canDelete = 
      project.user_id === req.user.id ||
      req.user.roles.includes('manager') ||
      req.user.roles.includes('admin');

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет прав на удаление дефекта'
        }
      });
    }

    await defectRepository.delete(req.params.id);
    req.log.info(`Defect deleted: ${defect.id}`);

    res.json({
      success: true,
      data: { message: 'Дефект успешно удален' }
    });
  } catch (error) {
    req.log.error(error, 'Delete defect error');
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка при удалении дефекта'
      }
    });
  }
});

module.exports = router;