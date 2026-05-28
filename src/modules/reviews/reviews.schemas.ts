/**
 * Zod schemas for review create/update payloads — aligned with client CreateReviewInput.
 */
import { z } from 'zod';

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

export const createReviewBodySchema = z.object({
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
    .min(1, 'At least one photo is required')
    .max(MAX_IMAGES),
});

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;

/** Same shape as create — used for PATCH /api/reviews/:id */
export const updateReviewBodySchema = createReviewBodySchema;
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

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type ListMyReviewsQuery = z.infer<typeof listMyReviewsQuerySchema>;
