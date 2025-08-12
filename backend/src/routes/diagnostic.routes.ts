import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';
import {
  startDiagnosticHandler,
  getDiagnosticSessionHandler,
  nextDiagnosticQuestionHandler,
  answerDiagnosticHandler,
  finishDiagnosticHandler,
  submitFirstAnswersHandler,
  submitFollowupAnswersHandler,
} from '../controllers/diagnostic.controller';

const router = Router();

// Protect all routes; only STUDENT can use diagnostics endpoints
router.use(authenticate, authorize('STUDENT'));

router.post('/start', asyncHandler(startDiagnosticHandler));
router.get('/:sessionId', asyncHandler(getDiagnosticSessionHandler));
router.post('/:sessionId/next', asyncHandler(nextDiagnosticQuestionHandler));
router.post('/:sessionId/answer', asyncHandler(answerDiagnosticHandler));
router.post('/:sessionId/finish', asyncHandler(finishDiagnosticHandler));
// New two-phase flow endpoints
router.post('/:sessionId/first-answers', asyncHandler(submitFirstAnswersHandler));
router.post('/:sessionId/followup-answers', asyncHandler(submitFollowupAnswersHandler));

export default router;
