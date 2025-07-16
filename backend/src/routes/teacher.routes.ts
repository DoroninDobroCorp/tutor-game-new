import { Router } from 'express';
import { 
  connectStudentHandler,
  getMyStudents,
} from '../controllers/teacher.controller';
import { getStudentPerformanceLogs } from '../controllers/performanceLogs.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { checkStudentAccess } from '../middlewares/teacher.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

// Protect all routes with authentication and teacher role
router.use(authenticate);
router.use(authorize('TEACHER'));

// Get all students for the teacher
router.get('/students', asyncHandler(getMyStudents));

// Connect student to teacher
router.post('/students/connect', asyncHandler(connectStudentHandler));

// Get student performance logs for a specific goal
router.get(
  '/goals/:goalId/students/:studentId/logs',
  checkStudentAccess,
  asyncHandler(getStudentPerformanceLogs)
);

export default router;
