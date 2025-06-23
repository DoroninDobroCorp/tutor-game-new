import { Router } from 'express';
import { 
  getStudentProfile,
  setStudentGoal,
  getRoadmap,
  generateMathProblemHandler,
  submitAnswer,
  getCurrentLessonHandler,
  submitLessonHandler,
  checkAnswerHandler,
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

// Adventure routes
router.get('/current-lesson', getCurrentLessonHandler);
router.post('/lessons/:lessonId/check-answer', authorize('STUDENT'), checkAnswerHandler);
router.post('/lessons/:lessonId/submit', authorize('STUDENT'), submitLessonHandler);

export default router;
