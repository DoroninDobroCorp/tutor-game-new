"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generate_controller_1 = require("../controllers/generate.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Protect all routes with authentication
router.use(auth_middleware_1.authenticate);
// Story generation routes
router.post('/story', generate_controller_1.generateNewStory);
router.post('/story/continue', generate_controller_1.continueStory);
router.post('/story/image', generate_controller_1.generateImageForStory);
exports.default = router;
