"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', (0, errors_1.asyncHandler)(auth_controller_1.registerHandler));
router.post('/login', (0, errors_1.asyncHandler)(auth_controller_1.loginHandler));
router.post('/refresh', (0, errors_1.asyncHandler)(auth_controller_1.refreshTokenHandler));
// Protected routes
router.get('/me', auth_middleware_1.authenticate, (0, errors_1.asyncHandler)(auth_controller_1.getMeHandler));
router.post('/logout', auth_middleware_1.authenticate, (0, errors_1.asyncHandler)(auth_controller_1.logoutHandler));
exports.default = router;
