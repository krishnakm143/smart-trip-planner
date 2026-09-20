import { Router } from 'express';
import * as plannerController from '../controllers/plannerController.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { budgetEstimateSchema } from '../validators/plannerValidators.js';

const router = Router();

router.post(
  '/estimate',
  validate({ body: budgetEstimateSchema }),
  asyncHandler(plannerController.estimateBudget),
);

export default router;
