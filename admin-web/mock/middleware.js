// json-server middleware to format responses as paginated
// This makes the mock API match your backend's response format

module.exports = (req, res, next) => {
  // Format /api/v1/admin/users as paginated response
  if (req.url.startsWith('/api/v1/admin/users') && req.method === 'GET' && !req.url.includes('/api/v1/admin/users/')) {
    // Return original response, then wrap it
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // If data is an array, wrap it in pagination format
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
  }

  // Format /api/v1/admin/audit-log as paginated response
  if (req.url.startsWith('/api/v1/admin/audit-log') && req.method === 'GET') {
    const originalJson = res.json.bind(res);
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
  }

  next();
};

