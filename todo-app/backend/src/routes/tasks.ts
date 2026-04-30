import { Router } from 'express';
import { getTasks, getTaskSummary, createTask, updateTask, deleteTask } from '../controllers/taskController';
import authMiddleware from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/summary', getTaskSummary);
router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;