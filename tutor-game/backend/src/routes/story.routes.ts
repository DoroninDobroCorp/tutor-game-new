import { Router } from 'express';
import { 
  generateStorySnippetHandler, 
  regenerateStoryImageHandler, 
  approveStorySnippetHandler, 
  approveStorySnippetWithUploadHandler 
} from '../controllers/story.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { upload } from '../utils/fileUpload';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Роуты для управления историей (story chapter), связанной с уроком
router.post('/lessons/:lessonId/story/generate', generateStorySnippetHandler);
router.put('/lessons/:lessonId/story/approve', approveStorySnippetHandler);
router.post('/lessons/:lessonId/story/regenerate-image', regenerateStoryImageHandler);
router.put('/lessons/:lessonId/story/approve-with-upload', 
    upload.single('image'), 
    approveStorySnippetWithUploadHandler
);

export default router;
