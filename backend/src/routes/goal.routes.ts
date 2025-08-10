import { Router } from "express";
import {
  createGoalHandler,
  getGoalsHandler,
  deleteGoalHandler,
  getGoalByIdHandler,
  getGoalStoryHistoryHandler,
} from "../controllers/goal.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/errors";

const router = Router();
router.use(authenticate, authorize("TEACHER"));

// Routes for managing LearningGoal entity
router.get("/", asyncHandler(getGoalsHandler));
router.get("/:goalId", asyncHandler(getGoalByIdHandler));
router.get("/:goalId/story-history", asyncHandler(getGoalStoryHistoryHandler));
router.post("/", asyncHandler(createGoalHandler));
router.delete("/:goalId", asyncHandler(deleteGoalHandler));

export default router;
