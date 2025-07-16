import { Router } from 'express';
import { getUnreadSummary } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

// Protect all chat routes with authentication
router.use(authenticate);

// New endpoint for getting unread messages summary
router.get('/unread-summary', asyncHandler(getUnreadSummary));

export default router;
