import { Router } from 'express';
import { 
  getStudentProfile,
  setStudentGoal,
  getRoadmap,
  generateMathProblemHandler,
  submitAnswer,
  getCurrentLessonHandler,
  submitLessonHandler,
} from '../controllers/student.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// Student profile routes
router.post('/goal', asyncHandler(setStudentGoal));
router.get('/roadmap', asyncHandler(getRoadmap));

// Math problem routes (mock routes)
router.get('/math-problem', asyncHandler(generateMathProblemHandler));
router.post('/submit-answer', asyncHandler(submitAnswer));

// Adventure routes
router.get('/current-lesson', asyncHandler(getCurrentLessonHandler));
router.post('/lessons/:lessonId/submit', authorize('STUDENT'), asyncHandler(submitLessonHandler));

// Keep profile route at the end to avoid route conflicts
router.get('/profile', asyncHandler(getStudentProfile));

export default router;
