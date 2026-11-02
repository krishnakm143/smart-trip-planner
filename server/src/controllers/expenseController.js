import * as expenseService from '../services/expenseService.js';
import { sendSuccess } from '../utils/respond.js';

export async function list(req, res) {
  const items = await expenseService.listExpenses(req.user, req.valid.params.id, req.accessToken);
  sendSuccess(res, { items });
}
export async function summary(req, res) {
  const data = await expenseService.getExpenseSummary(req.user, req.valid.params.id, req.accessToken);
  sendSuccess(res, data);
}
export async function create(req, res) {
  const expense = await expenseService.createExpense(req.user, req.valid.params.id, req.valid.body, req.accessToken);
  sendSuccess(res, { expense }, { status: 201 });
}
export async function update(req, res) {
  const expense = await expenseService.updateExpense(req.user, req.valid.params.expenseId, req.valid.body, req.accessToken);
  sendSuccess(res, { expense });
}
export async function remove(req, res) {
  const id = await expenseService.deleteExpense(req.user, req.valid.params.expenseId, req.accessToken);
  sendSuccess(res, { id });
}
