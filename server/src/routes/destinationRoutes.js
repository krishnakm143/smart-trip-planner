import { Router } from 'express';
import * as destinationController from '../controllers/destinationController.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  discoverQuerySchema,
  dynamicDestinationSchema,
  listDestinationsQuerySchema,
  searchExternalQuerySchema,
  slugParamSchema,
} from '../validators/destinationValidators.js';

const router = Router();

router.get(
  '/',
  validate({ query: listDestinationsQuerySchema }),
  asyncHandler(destinationController.list),
);
router.get(
  '/external/search',
  validate({ query: searchExternalQuerySchema }),
  asyncHandler(destinationController.searchExternal),
);
router.post(
  '/dynamic',
  validate({ body: dynamicDestinationSchema }),
  asyncHandler(destinationController.createDynamic),
);
router.get(
  '/places/photo',
  asyncHandler(destinationController.getPlacePhoto),
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
