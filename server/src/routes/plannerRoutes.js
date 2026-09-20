import { Router } from 'express';
import * as plannerController from '../controllers/plannerController.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { planInputSchema } from '../validators/plannerValidators.js';

const router = Router();

router.post('/preview', validate({ body: planInputSchema }), asyncHandler(plannerController.preview));

export default router;
