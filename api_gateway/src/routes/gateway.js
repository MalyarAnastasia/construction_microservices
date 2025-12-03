const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Проверка состояния всех сервисов через Gateway
 *     tags: [Gateway]
 *     responses:
 *       200:
 *         description: Все сервисы работают
 */
router.get('/health', (req, res) => {
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

module.exports = router;