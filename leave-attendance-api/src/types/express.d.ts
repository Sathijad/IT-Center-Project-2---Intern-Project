import { UserContext } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export {};

