import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import authRoutes from './authRoutes.js';
import budgetRoutes from './budgetRoutes.js';
import destinationRoutes from './destinationRoutes.js';
import plannerRoutes from './plannerRoutes.js';
import tripRoutes from './tripRoutes.js';

const router = Router();

router.get('/health', getHealth);
router.use('/auth', authRoutes);
router.use('/destinations', destinationRoutes);
router.use('/planner', plannerRoutes);
router.use('/budget', budgetRoutes);
router.use('/trips', tripRoutes);

export default router;
