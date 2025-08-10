import { Router } from "express";
import {
  generateRoadmapHandler,
  updateRoadmapHandler,
} from "../controllers/roadmap.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/errors";

const router = Router();
router.use(authenticate, authorize("TEACHER"));

// Роуты для управления планом (roadmap) внутри цели
router.post("/:goalId/generate-roadmap", asyncHandler(generateRoadmapHandler));
router.put("/:goalId/roadmap", asyncHandler(updateRoadmapHandler));

export default router;
