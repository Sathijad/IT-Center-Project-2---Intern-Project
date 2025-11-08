import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (req, res, next) => {
  req.traceId = req.headers['x-trace-id'] || uuidv4();
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    console.log(JSON.stringify({
      traceId: req.traceId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    }));
  });
  
  next();
};

