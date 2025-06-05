import { Router } from 'express';
import { 
  generateNewStory, 
  continueStory, 
  generateImageForStory 
} from '../controllers/generate.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// Story generation routes
router.post('/story', generateNewStory);
router.post('/story/continue', continueStory);
router.post('/story/image', generateImageForStory);

export default router;
