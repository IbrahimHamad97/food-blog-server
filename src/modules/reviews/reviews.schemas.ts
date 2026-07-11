/**
 * Zod schemas for review create/update payloads — aligned with client CreateReviewInput.
 */
import { z } from 'zod';
import { BLOCKED_LANGUAGE_MESSAGE, findBlockedTerm } from '../../lib/content-filter.js';

const MAX_MEALS = 10;
const MAX_IMAGES = 5;
const MAX_TAGS = 20;

export const mealItemSchema = z.object({
  name: z.string().trim().min(1, 'Meal name is required'),
  quantity: z.number().int().min(1),
  price: z.number().min(0).nullable(),
  notes: z.string().default(''),
});

export const nutritionSchema = z
  .object({
    calories: z.string().optional(),
    protein: z.string().optional(),
    carbs: z.string().optional(),
    fat: z.string().optional(),
    fiber: z.string().optional(),
    sugar: z.string().optional(),
    sodium: z.string().optional(),
    saturatedFat: z.string().optional(),
    allergens: z.string().optional(),
    notes: z.string().optional(),
  })
  .nullable()
  .optional();

const reviewFieldsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  body: z.string().trim().min(1, 'Review text is required'),
  placeName: z.string().trim().min(1, 'Restaurant name is required'),
  serviceType: z.enum(['dine_in', 'delivery']),
  partySize: z.number().int().min(1).nullable().optional(),
  meals: z.array(mealItemSchema).min(1, 'At least one meal is required').max(MAX_MEALS),
  nutrition: nutritionSchema,
  currency: z.enum(['USD', 'QAR']),
  rating: z.number().int().min(1).max(5),
  cuisineTags: z.array(z.string().trim().min(1)).max(MAX_TAGS).default([]),
  foodTypeTags: z.array(z.string().trim().min(1)).max(MAX_TAGS).default([]),
  imageUrls: z
    .array(z.string().trim().url('Each photo must be a valid URL'))
    .max(MAX_IMAGES)
    .default([]),
});

type ReviewFields = z.infer<typeof reviewFieldsSchema>;

/** Collect every user-written string that should be moderated. */
function reviewTextSnippets(
  data: ReviewFields,
): Array<{ path: (string | number)[]; value: string }> {
  const snippets: Array<{ path: (string | number)[]; value: string }> = [
    { path: ['title'], value: data.title },
    { path: ['body'], value: data.body },
    { path: ['placeName'], value: data.placeName },
  ];

  data.cuisineTags.forEach((tag, i) => {
    snippets.push({ path: ['cuisineTags', i], value: tag });
  });
  data.foodTypeTags.forEach((tag, i) => {
    snippets.push({ path: ['foodTypeTags', i], value: tag });
  });
  data.meals.forEach((meal, i) => {
    snippets.push({ path: ['meals', i, 'name'], value: meal.name });
    if (meal.notes) {
      snippets.push({ path: ['meals', i, 'notes'], value: meal.notes });
    }
  });

  if (data.nutrition?.allergens) {
    snippets.push({ path: ['nutrition', 'allergens'], value: data.nutrition.allergens });
  }
  if (data.nutrition?.notes) {
    snippets.push({ path: ['nutrition', 'notes'], value: data.nutrition.notes });
  }

  return snippets;
}

function rejectBlockedLanguage(data: ReviewFields, ctx: z.RefinementCtx): void {
  for (const snippet of reviewTextSnippets(data)) {
    if (findBlockedTerm(snippet.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: BLOCKED_LANGUAGE_MESSAGE,
        path: snippet.path,
      });
      return;
    }
  }
}

export const createReviewBodySchema = reviewFieldsSchema.superRefine(rejectBlockedLanguage);

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;

/** Same shape as create — used for PATCH /api/reviews/:id */
export const updateReviewBodySchema = reviewFieldsSchema.superRefine(rejectBlockedLanguage);
export type UpdateReviewBody = CreateReviewBody;

export const listReviewsQuerySchema = z.object({
  sort: z.enum(['latest', 'popular']).default('latest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const listMyReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const listMyLikedReviewsQuerySchema = listMyReviewsQuerySchema;

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type ListMyReviewsQuery = z.infer<typeof listMyReviewsQuerySchema>;
export type ListMyLikedReviewsQuery = z.infer<typeof listMyLikedReviewsQuerySchema>;
