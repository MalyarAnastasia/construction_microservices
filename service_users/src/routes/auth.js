const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();


const users = [];

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('engineer', 'manager', 'admin', 'client').default('engineer')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: Иван Иванов
 *               role:
 *                 type: string
 *                 enum: [engineer, manager, admin, client]
 *                 default: engineer
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Пользователь с таким email уже существует
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'VALIDATION_ERROR', 
        message: error.details[0].message 
      }
    });
  }

  const { email, password, name, role } = value;

  if (users.find(u => u.email === email)) {
    return res.status(409).json({
      success: false,
      error: { 
        code: 'USER_EXISTS', 
        message: 'Пользователь с таким email уже существует' 
      }
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    email,
    passwordHash: hashedPassword,
    name,
    roles: [role],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.push(newUser);
  req.log.info(`User registered: ${email}`);

  res.status(201).json({
    success: true,
    data: { 
      id: newUser.id, 
      email: newUser.email, 
      name: newUser.name,
      role: newUser.roles[0]
    }
  });
});

/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Успешный вход
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
 *                     token:
 *                       type: string
 *                       description: JWT токен
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *       401:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }

  const { email, password } = value;

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Неверный email или пароль'
      }
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Неверный email или пароль'
      }
    });
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles
  };

  const token = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  req.log.info(`User logged in: ${email}`);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles
      }
    }
  });
});

/**
 * @swagger
 * /api/v1/users/health:
 *   get:
 *     summary: Проверка состояния сервиса
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Сервис работает
 */
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      service: 'users-auth', 
      status: 'ok' 
    } 
  });
});

module.exports = {
  router,
  users
};