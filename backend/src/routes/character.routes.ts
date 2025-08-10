import { Router } from "express";
import {
  generateCharacterHandler,
  uploadCharacterImageHandler,
  updateCharacterPromptHandler,
} from "../controllers/character.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { upload } from "../utils/fileUpload";
import { asyncHandler } from "../utils/errors";

const router = Router();
router.use(authenticate, authorize("TEACHER"));

// Роуты для управления персонажем внутри цели
router.post(
  "/:goalId/generate-character",
  asyncHandler(generateCharacterHandler),
);
router.post(
  "/:goalId/upload-character",
  upload.single("image"),
  asyncHandler(uploadCharacterImageHandler),
);
router.put(
  "/:goalId/character-prompt",
  asyncHandler(updateCharacterPromptHandler),
);

export default router;
