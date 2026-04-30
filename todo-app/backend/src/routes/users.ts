import { Router } from 'express';
import authMiddleware from '../middlewares/auth';
import { getUserSettings, updateUserSettings } from '../controllers/userController';

const router = Router();

router.use(authMiddleware);
router.get('/settings', getUserSettings);
router.put('/settings', updateUserSettings);

export default router;

