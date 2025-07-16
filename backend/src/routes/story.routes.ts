import { Router } from 'express';
import { 
  generateStorySnippetHandler, 
  regenerateStoryImageHandler, 
  approveStorySnippetHandler, 
  approveStorySnippetWithUploadHandler
} from '../controllers/story.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { upload } from '../utils/fileUpload';
import { asyncHandler } from '../utils/errors';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Роуты для управления историей (story chapter), связанной с уроком
router.post('/:lessonId/story/generate', asyncHandler(generateStorySnippetHandler));
router.put('/:lessonId/story/approve', asyncHandler(approveStorySnippetHandler));
router.post('/:lessonId/story/regenerate-image', asyncHandler(regenerateStoryImageHandler));
router.put('/:lessonId/story/approve-with-upload', 
    upload.single('image'), 
    asyncHandler(approveStorySnippetWithUploadHandler)
);


export default router;
