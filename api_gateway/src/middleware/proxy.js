const { createProxyMiddleware } = require('http-proxy-middleware');

const services = {
  users: {
    target: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: {
      '^/api/v1/users': '/api/v1/users'
    },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      }
      if (req.headers['x-user-email']) {
        proxyReq.setHeader('x-user-email', req.headers['x-user-email']);
      }
      if (req.headers['x-user-roles']) {
        proxyReq.setHeader('x-user-roles', req.headers['x-user-roles']);
      }
      if (req.headers['x-request-id']) {
        proxyReq.setHeader('x-request-id', req.headers['x-request-id']);
      }
    }
  },
  orders: {
    target: process.env.ORDERS_SERVICE_URL || 'http://localhost:3002',
    pathRewrite: {
      '^/api/v1/orders': '/api/v1/orders'
    },
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      }
      if (req.headers['x-user-email']) {
        proxyReq.setHeader('x-user-email', req.headers['x-user-email']);
      }
      if (req.headers['x-user-roles']) {
        proxyReq.setHeader('x-user-roles', req.headers['x-user-roles']);
      }
      if (req.headers['x-request-id']) {
        proxyReq.setHeader('x-request-id', req.headers['x-request-id']);
      }
    }
  }
};

const usersProxy = createProxyMiddleware(services.users);
const ordersProxy = createProxyMiddleware(services.orders);

module.exports = { usersProxy, ordersProxy };