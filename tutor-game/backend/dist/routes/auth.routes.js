"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', auth_controller_1.registerHandler);
router.post('/login', auth_controller_1.loginHandler);
router.post('/refresh', auth_controller_1.refreshTokenHandler);
// Protected routes
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getMeHandler);
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.logoutHandler);
exports.default = router;
