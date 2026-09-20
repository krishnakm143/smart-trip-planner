import { Router } from 'express';
import * as destinationController from '../controllers/destinationController.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  discoverQuerySchema,
  listDestinationsQuerySchema,
  slugParamSchema,
} from '../validators/destinationValidators.js';

const router = Router();

router.get(
  '/',
  validate({ query: listDestinationsQuerySchema }),
  asyncHandler(destinationController.list),
);
router.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  asyncHandler(destinationController.getBySlug),
);
router.get(
  '/:slug/discover',
  validate({ params: slugParamSchema, query: discoverQuerySchema }),
  asyncHandler(destinationController.discover),
);

export default router;
