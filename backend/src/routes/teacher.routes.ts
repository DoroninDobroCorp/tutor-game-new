import { Router } from 'express';
import { 
  connectStudentHandler,
  getMyStudents,
} from '../controllers/teacher.controller';
import { getStudentPerformanceLogs } from '../controllers/performanceLogs.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { checkStudentAccess } from '../middlewares/teacher.middleware';
import { asyncHandler } from '../utils/errors';
import { upload } from '../utils/fileUpload';
import {
  getStudentAchievementsForTeacher,
  generateAchievementImage,
  createAchievement,
  uploadAchievementImage,
} from '../controllers/achievement.controller';

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

// Achievements management (protected)
router.get('/achievements', asyncHandler(getStudentAchievementsForTeacher)); // expects ?studentId=
router.post('/achievements/generate-image', asyncHandler(generateAchievementImage));
router.post('/achievements', asyncHandler(createAchievement));
router.post('/achievements/upload', upload.single('image'), asyncHandler(uploadAchievementImage));

export default router;
