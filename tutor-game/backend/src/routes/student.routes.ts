import { Router } from 'express';
import { 
  getStudentProfile,
  setStudentGoal,
  getRoadmap,
  generateMathProblemHandler,
  submitAnswer,
} from '../controllers/student.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// Student profile routes
router.get('/profile', getStudentProfile);
router.post('/goal', setStudentGoal);
router.get('/roadmap', getRoadmap);

// Math problem routes
router.get('/math-problem', generateMathProblemHandler);
router.post('/submit-answer', submitAnswer);

export default router;
