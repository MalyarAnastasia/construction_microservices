const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { users } = require('./auth'); 

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Получить профиль текущего пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Пользователь не найден'
      }
    });
  }

  const { passwordHash, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: userWithoutPassword
  });
});

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Обновить профиль текущего пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Новое имя
 *     responses:
 *       200:
 *         description: Профиль обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 */
router.put('/profile', authenticateToken, (req, res) => {
  const { name } = req.body;
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Пользователь не найден'
      }
    });
  }

  if (name) {
    users[userIndex].name = name;
    users[userIndex].updatedAt = new Date().toISOString();
  }

  const { passwordHash, ...updatedUser } = users[userIndex];
  
  res.json({
    success: true,
    data: updatedUser
  });
});

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Получить список пользователей (только для админов)
 *     tags: [Users]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [engineer, manager, admin, client]
 *         description: Фильтр по роли
 *     responses:
 *       200:
 *         description: Список пользователей
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *       403:
 *         description: Недостаточно прав
 */
router.get('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { page = 1, limit = 10, role } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  let filteredUsers = users;
  if (role) {
    filteredUsers = users.filter(u => u.roles.includes(role));
  }

  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = pageNum * limitNum;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const usersWithoutPasswords = paginatedUsers.map(user => {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  res.json({
    success: true,
    data: {
      users: usersWithoutPasswords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limitNum)
      }
    }
  });
});

module.exports = router;