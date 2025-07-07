import { Router } from 'express';
import { 
    generateCharacterHandler, 
    uploadCharacterImageHandler 
} from '../controllers/character.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { upload } from '../utils/fileUpload';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Роуты для управления персонажем внутри цели
router.post('/:goalId/generate-character', generateCharacterHandler);
router.post('/:goalId/upload-character', upload.single('image'), uploadCharacterImageHandler);

export default router;
