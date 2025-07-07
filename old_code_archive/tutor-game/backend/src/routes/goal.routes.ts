import { Router } from 'express';
import {
    createGoalHandler,
    getGoalsHandler,
    deleteGoalHandler,
    generateRoadmapHandler,
    updateRoadmapHandler,
    generateCharacterHandler,
    approveCharacterHandler,
    generateLessonContentHandler,
    updateLessonContentHandler,
    generateStorySnippetHandler,
    approveStorySnippetHandler,
    regenerateStoryImageHandler,
    approveStorySnippetWithUploadHandler
} from '../controllers/goal.controller';
import { upload } from '../utils/fileUpload';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication and TEACHER role
router.use(authenticate, authorize('TEACHER'));

// Goal routes
router.get('/', getGoalsHandler);
router.post('/', createGoalHandler);
router.delete('/:goalId', deleteGoalHandler);

// Roadmap routes
router.post('/:goalId/generate-roadmap', generateRoadmapHandler);
router.put('/:goalId/roadmap', updateRoadmapHandler);

// Story snippet routes
router.post('/lessons/:lessonId/story', generateStorySnippetHandler);
router.put('/lessons/:lessonId/story/approve', approveStorySnippetHandler);
router.post('/lessons/:lessonId/regenerate-image', regenerateStoryImageHandler);
router.put('/lessons/:lessonId/approve-with-upload', 
    upload.single('image'), 
    approveStorySnippetWithUploadHandler
);

// Lesson content routes
router.post('/lessons/:lessonId/generate-content', generateLessonContentHandler);
router.put('/lessons/:lessonId/content', updateLessonContentHandler);

// Character routes
router.post('/:goalId/generate-character', generateCharacterHandler);
router.post('/:goalId/approve-character', approveCharacterHandler);

export default router;
