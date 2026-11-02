import { z } from 'zod';
import * as aiService from '../services/aiService.js';
import * as tripService from '../services/tripService.js';
import { sendSuccess } from '../utils/respond.js';

const questionSchema = z.object({ question: z.string().trim().min(3).max(1000) });
export async function askTrip(req, res) {
  const { question } = questionSchema.parse(req.body);
  const trip = await tripService.getTrip(req.user, req.params.id, req.accessToken);
  const answer = await aiService.answerTripQuestion({ question, trip });
  sendSuccess(res, { answer });
}

export async function recommend(req, res) {
  const recommendations = await aiService.recommendDestinations(req.body || {});
  sendSuccess(res, { recommendations });
}
