/**
 * Review business logic — create and DTO mapping for the client Review shape.
 */
import type { Prisma, Review as PrismaReview, User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { CreateReviewBody } from './reviews.schemas.js';

export interface MealItemDto {
  name: string;
  quantity: number;
  price: number | null;
  notes: string;
}

export interface NutritionInfoDto {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
  saturatedFat?: string;
  allergens?: string;
  notes?: string;
}

export interface UserSummaryDto {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface ReviewDto {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  placeName: string;
  serviceType: 'dine_in' | 'delivery';
  partySize: number | null;
  meals: MealItemDto[];
  nutrition: NutritionInfoDto | null;
  currency: 'USD' | 'QAR';
  totalAmount: number | null;
  rating: number;
  cuisineTags: string[];
  foodTypeTags: string[];
  imageUrls: string[];
  likeCount: number;
  author: UserSummaryDto;
  publishedAt: string;
}

const NUTRITION_KEYS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'sodium',
  'saturatedFat',
  'allergens',
  'notes',
] as const;

function normalizeMeals(meals: CreateReviewBody['meals']): MealItemDto[] {
  return meals.map((meal) => ({
    name: meal.name.trim(),
    quantity: meal.quantity >= 1 ? meal.quantity : 1,
    price: meal.price,
    notes: meal.notes?.trim() ?? '',
  }));
}

function normalizeNutrition(raw: CreateReviewBody['nutrition']): NutritionInfoDto | null {
  if (!raw) {
    return null;
  }

  const result: NutritionInfoDto = {};
  for (const key of NUTRITION_KEYS) {
    const value = raw[key]?.trim();
    if (value) {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/** Sum line totals (price × quantity); null if no priced items. */
export function computeTotalAmount(meals: MealItemDto[]): number | null {
  const priced = meals.filter((m) => m.price != null && !Number.isNaN(m.price));
  if (priced.length === 0) {
    return null;
  }
  return priced.reduce((sum, m) => sum + (m.price ?? 0) * Math.max(1, m.quantity), 0);
}

function authorAvatar(user: Pick<User, 'name' | 'avatarUrl'>): string {
  return (
    user.avatarUrl ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
  );
}

function toAuthorDto(user: Pick<User, 'id' | 'name' | 'avatarUrl'>): UserSummaryDto {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: authorAvatar(user),
  };
}

function parseMealsJson(value: Prisma.JsonValue): MealItemDto[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value as unknown as MealItemDto[];
}

function parseNutritionJson(value: Prisma.JsonValue | null): NutritionInfoDto | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as NutritionInfoDto;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ReviewListResult {
  reviews: ReviewDto[];
  pagination: PaginationMeta;
}

function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

const reviewInclude = { user: true } as const;

export function toReviewDto(review: PrismaReview & { user: User }): ReviewDto {
  return {
    id: review.id,
    title: review.title,
    excerpt: review.excerpt,
    body: review.body,
    placeName: review.placeName,
    serviceType: review.serviceType,
    partySize: review.partySize,
    meals: parseMealsJson(review.meals),
    nutrition: parseNutritionJson(review.nutrition),
    currency: review.currency,
    totalAmount: review.totalAmount,
    rating: review.rating,
    cuisineTags: review.cuisineTags,
    foodTypeTags: (review as unknown as { foodTypeTags: string[] }).foodTypeTags ?? [],
    imageUrls: review.imageUrls,
    likeCount: review.likeCount,
    author: toAuthorDto(review.user),
    publishedAt: review.createdAt.toISOString(),
  };
}

/** Create a review owned by the signed-in user. */
export async function createReview(userId: string, input: CreateReviewBody): Promise<ReviewDto> {
  const body = input.body.trim();
  const meals = normalizeMeals(input.meals);
  const nutrition = normalizeNutrition(input.nutrition);
  const partySize = input.partySize != null && input.partySize >= 1 ? input.partySize : null;
  // NOTE: Prisma client in this repo might not be able to regenerate immediately
  // after schema changes (local `prisma generate` can fail with EPERM).
  // To keep POST /api/reviews working, we currently persist food types by merging
  // them into the existing `cuisineTags` column.
  const combinedCuisineTags = [...input.cuisineTags, ...input.foodTypeTags].slice(0, 20);

  const review = await prisma.review.create({
    data: {
      userId,
      title: input.title.trim(),
      excerpt: body,
      body,
      placeName: input.placeName.trim(),
      serviceType: input.serviceType,
      partySize,
      meals: meals as unknown as Prisma.InputJsonValue,
      nutrition: nutrition as unknown as Prisma.InputJsonValue | undefined,
      currency: input.currency,
      totalAmount: computeTotalAmount(meals),
      rating: input.rating,
      cuisineTags: combinedCuisineTags,
      imageUrls: input.imageUrls,
    } as any,
    include: { user: true },
  });

  const dto = toReviewDto(review as any);
  return {
    ...dto,
    // Keep the response split so the UI can render correctly right away.
    cuisineTags: input.cuisineTags,
    foodTypeTags: input.foodTypeTags,
  };
}

/** Load a single review by id (public). */
export async function getReviewById(reviewId: string): Promise<ReviewDto | null> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: reviewInclude,
  });
  return review ? toReviewDto(review) : null;
}

/** Public feed — latest or most liked. */
export async function listReviews(query: {
  sort: 'latest' | 'popular';
  page: number;
  limit: number;
}): Promise<ReviewListResult> {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const orderBy =
    query.sort === 'popular'
      ? [{ likeCount: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }];

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      skip,
      take: limit,
      orderBy,
      include: reviewInclude,
    }),
    prisma.review.count(),
  ]);

  return {
    reviews: rows.map(toReviewDto),
    pagination: buildPagination(page, limit, total),
  };
}

/** Update a review — only the owner may edit. */
export async function updateReview(
  userId: string,
  reviewId: string,
  input: CreateReviewBody,
): Promise<ReviewDto | 'not_found' | 'forbidden'> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    return 'not_found';
  }
  if (existing.userId !== userId) {
    return 'forbidden';
  }

  const body = input.body.trim();
  const meals = normalizeMeals(input.meals);
  const nutrition = normalizeNutrition(input.nutrition);
  const partySize = input.partySize != null && input.partySize >= 1 ? input.partySize : null;
  const combinedCuisineTags = [...input.cuisineTags, ...input.foodTypeTags].slice(0, 20);

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      title: input.title.trim(),
      excerpt: body,
      body,
      placeName: input.placeName.trim(),
      serviceType: input.serviceType,
      partySize,
      meals: meals as unknown as Prisma.InputJsonValue,
      nutrition: nutrition as unknown as Prisma.InputJsonValue | undefined,
      currency: input.currency,
      totalAmount: computeTotalAmount(meals),
      rating: input.rating,
      cuisineTags: combinedCuisineTags,
      imageUrls: input.imageUrls,
    } as any,
    include: { user: true },
  });

  const dto = toReviewDto(review as any);
  return {
    ...dto,
    cuisineTags: input.cuisineTags,
    foodTypeTags: input.foodTypeTags,
  };
}

/** Delete a review — only the owner may delete. */
export async function deleteReview(
  userId: string,
  reviewId: string,
): Promise<'ok' | 'not_found' | 'forbidden'> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    return 'not_found';
  }
  if (existing.userId !== userId) {
    return 'forbidden';
  }

  await prisma.review.delete({ where: { id: reviewId } });
  return 'ok';
}

/** Reviews authored by the signed-in user. */
export async function listReviewsByUser(
  userId: string,
  query: { page: number; limit: number },
): Promise<ReviewListResult> {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const where = { userId };

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: rows.map(toReviewDto),
    pagination: buildPagination(page, limit, total),
  };
}
