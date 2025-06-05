import { Router } from 'express';
import { 
  registerHandler, 
  loginHandler, 
  getMeHandler,
  refreshTokenHandler,
  logoutHandler 
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/refresh', refreshTokenHandler);

// Protected routes
router.get('/me', authenticate, getMeHandler);
router.post('/logout', authenticate, logoutHandler);

export default router;
