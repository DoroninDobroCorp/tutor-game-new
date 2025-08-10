import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  getMeHandler,
  refreshTokenHandler,
  logoutHandler,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/errors";

const router = Router();

// Public routes
router.post("/register", asyncHandler(registerHandler));
router.post("/login", asyncHandler(loginHandler));
router.post("/refresh", asyncHandler(refreshTokenHandler));

// Protected routes
router.get("/me", authenticate, asyncHandler(getMeHandler));
router.post("/logout", authenticate, asyncHandler(logoutHandler));

export default router;
