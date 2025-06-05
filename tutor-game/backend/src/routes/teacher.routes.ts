import { Router } from 'express';
import { 
  getTeacherDashboard,
  getStudentProgress,
  updateStudentRoadmap,
  assignBadge,
} from '../controllers/teacher.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Protect all routes with authentication and teacher role
router.use(authenticate);
router.use(authorize('TEACHER'));

// Teacher dashboard
router.get('/dashboard', getTeacherDashboard);

// Student management
router.get('/students/:studentId', getStudentProgress);
router.put('/students/:studentId/roadmap', updateStudentRoadmap);
router.post('/students/:studentId/badges', assignBadge);

export default router;
