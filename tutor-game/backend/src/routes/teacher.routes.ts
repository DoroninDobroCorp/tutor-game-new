import { Router } from 'express';
import { 
  getTeacherDashboard,
  getStudentProgress,
  updateStudentRoadmap,
  assignBadge,
  connectStudentHandler,
  getMyStudents,
} from '../controllers/teacher.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { checkStudentAccess } from '../middlewares/teacher.middleware';

const router = Router();

// Protect all routes with authentication and teacher role
router.use(authenticate);
router.use(authorize('TEACHER'));

// Teacher dashboard
router.get('/dashboard', getTeacherDashboard);

// Get all students for the teacher
router.get('/students', getMyStudents);

// Connect student to teacher
router.post('/students/connect', connectStudentHandler);

// Student management
router.get('/students/:studentId', checkStudentAccess, getStudentProgress);
router.put('/students/:studentId/roadmap', checkStudentAccess, updateStudentRoadmap);
router.post('/students/:studentId/badges', checkStudentAccess, assignBadge);

export default router;
