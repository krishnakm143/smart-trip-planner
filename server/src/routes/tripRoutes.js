import { Router } from 'express';
import * as tripController from '../controllers/tripController.js';
import * as expenseController from '../controllers/expenseController.js';
import * as aiController from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { expenseIdParamSchema, idParamSchema } from '../validators/common.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expenseValidators.js';
import {
  createTripSchema,
  listTripsQuerySchema,
  updateTripSchema,
} from '../validators/tripValidators.js';

const router = Router();

router.use(requireAuth);

router
  .route('/')
  .post(validate({ body: createTripSchema }), asyncHandler(tripController.create))
  .get(validate({ query: listTripsQuerySchema }), asyncHandler(tripController.list));

router
  .route('/:id')
  .get(validate({ params: idParamSchema }), asyncHandler(tripController.getById))
  .patch(
    validate({ params: idParamSchema, body: updateTripSchema }),
    asyncHandler(tripController.update),
  )
  .delete(validate({ params: idParamSchema }), asyncHandler(tripController.remove));

router
  .route('/:id/expenses')
  .get(validate({ params: idParamSchema }), asyncHandler(expenseController.list))
  .post(validate({ params: idParamSchema, body: createExpenseSchema }), asyncHandler(expenseController.create));

router.get('/:id/expenses/summary', validate({ params: idParamSchema }), asyncHandler(expenseController.summary));

router
  .route('/:id/expenses/:expenseId')
  .patch(validate({ params: expenseIdParamSchema, body: updateExpenseSchema }), asyncHandler(expenseController.update))
  .delete(validate({ params: expenseIdParamSchema }), asyncHandler(expenseController.remove));

router.post('/:id/duplicate', validate({ params: idParamSchema }), asyncHandler(tripController.duplicate));
router.post('/:id/email', validate({ params: idParamSchema }), asyncHandler(tripController.emailTrip));
router.post('/:id/assistant', validate({ params: idParamSchema }), asyncHandler(aiController.askTrip));

export default router;
