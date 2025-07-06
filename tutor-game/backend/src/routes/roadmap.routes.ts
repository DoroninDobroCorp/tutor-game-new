import { Router } from 'express';
import { generateRoadmapHandler, updateRoadmapHandler } from '../controllers/roadmap.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Роуты для управления планом (roadmap) внутри цели
router.post('/:goalId/generate-roadmap', generateRoadmapHandler);
router.put('/:goalId/roadmap', updateRoadmapHandler);

export default router;
