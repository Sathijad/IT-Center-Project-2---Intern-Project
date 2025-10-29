// json-server custom server to handle routes and middleware
// This works with json-server stable version (0.17.x)

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('mock/db.json');
const middlewares = jsonServer.defaults();

// Custom middleware to handle routing and format paginated responses
server.use((req, res, next) => {
  // Parse query string from req.url
  const urlParts = req.url.split('?');
  const pathname = urlParts[0];
  const queryString = urlParts[1] ? '?' + urlParts[1] : '';
  
  // Route /api/v1/me to /me
  if (pathname === '/api/v1/me' && req.method === 'GET') {
    req.url = '/me' + queryString;
    return next();
  }
  
  // Route /api/v1/admin/users/:id/roles to /users/:id
  const userIdMatch = pathname.match(/^\/api\/v1\/admin\/users\/(\d+)\/roles$/);
  if (userIdMatch && req.method === 'PUT') {
    req.url = `/users/${userIdMatch[1]}` + queryString;
    return next();
  }
  
  // Route /api/v1/admin/users/:id to /users/:id
  const userDetailMatch = pathname.match(/^\/api\/v1\/admin\/users\/(\d+)$/);
  if (userDetailMatch && req.method === 'GET') {
    req.url = `/users/${userDetailMatch[1]}` + queryString;
    return next();
  }

  // Handle paginated list endpoints - intercept response
  if (pathname === '/api/v1/admin/users' && req.method === 'GET' && !pathname.match(/\/\d+$/)) {
    req.url = '/users' + queryString;
    
    // Intercept both res.json and res.send
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    res.json = function(data) {
      if (Array.isArray(data)) {
        return originalJson({
          content: data,
          totalElements: data.length,
          totalPages: 1,
          page: 0,
          size: 20
        });
      }
      return originalJson(data);
    };
    
    res.send = function(data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) {
          return originalSend(JSON.stringify({
            content: parsed,
            totalElements: parsed.length,
            totalPages: 1,
            page: 0,
            size: 20
          }));
        }
      } catch (e) {
        // Not JSON, send as-is
      }
      return originalSend(data);
    };
    
    return next();
  }
  
  if (pathname === '/api/v1/admin/audit-log' && req.method === 'GET') {
    req.url = '/auditLogs' + queryString;
    
    // Intercept both res.json and res.send
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    res.json = function(data) {
      if (Array.isArray(data)) {
        return originalJson({
          content: data,
          totalElements: data.length,
          totalPages: 1,
          page: 0,
          size: 50
        });
      }
      return originalJson(data);
    };
    
    res.send = function(data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) {
          return originalSend(JSON.stringify({
            content: parsed,
            totalElements: parsed.length,
            totalPages: 1,
            page: 0,
            size: 50
          }));
        }
      } catch (e) {
        // Not JSON, send as-is
      }
      return originalSend(data);
    };
    
    return next();
  }

  next();
});

server.use(middlewares);

// Post-middleware: Re-apply response interceptors after json-server middlewares
// This ensures our interceptors work even after json-server sets up its own response handling
server.use((req, res, next) => {
  const urlParts = req.url.split('?');
  const pathname = urlParts[0];
  
  // Re-intercept for paginated endpoints (middlewares might have reset res methods)
  if ((pathname === '/users' || pathname === '/auditLogs') && req.method === 'GET') {
    const isAuditLog = pathname === '/auditLogs';
    const size = isAuditLog ? 50 : 20;
    
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Override res.json
    res.json = function(data) {
      if (Array.isArray(data)) {
        return originalJson.call(this, {
          content: data,
          totalElements: data.length,
          totalPages: 1,
          page: 0,
          size: size
        });
      }
      return originalJson.call(this, data);
    };
    
    // Override res.send (json-server often uses this)
    res.send = function(data) {
      try {
        let parsed = data;
        if (typeof data === 'string') {
          parsed = JSON.parse(data);
        }
        if (Array.isArray(parsed)) {
          res.setHeader('Content-Type', 'application/json');
          const formatted = {
            content: parsed,
            totalElements: parsed.length,
            totalPages: 1,
            page: 0,
            size: size
          };
          return originalSend.call(this, JSON.stringify(formatted));
        }
      } catch (e) {
        // Not JSON or parse error, send as-is
      }
      return originalSend.call(this, data);
    };
  }
  
  next();
});

// Use json-server router (routes are handled by middleware above)
server.use(router);

const PORT = 5050;
server.listen(PORT, () => {
  console.log(`JSON Server is running on http://localhost:${PORT}`);
});

