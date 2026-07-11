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
  avatarUrl: string | null;
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
  /** Whether the requesting user has liked this review (false when anonymous). */
  likedByMe: boolean;
  /** Whether the requesting user has bookmarked this review (false when anonymous). */
  bookmarkedByMe: boolean;
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

function toAuthorDto(user: Pick<User, 'id' | 'name' | 'avatarUrl'>): UserSummaryDto {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
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

export function toReviewDto(
  review: PrismaReview & { user: User },
  likedByMe = false,
  bookmarkedByMe = false,
): ReviewDto {
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
    foodTypeTags: review.foodTypeTags ?? [],
    imageUrls: review.imageUrls,
    likeCount: review.likeCount,
    likedByMe,
    bookmarkedByMe,
    author: toAuthorDto(review.user),
    publishedAt: review.createdAt.toISOString(),
  };
}

interface ViewerEngagement {
  liked: Set<string>;
  bookmarked: Set<string>;
}

/** Liked + bookmarked review ids for the signed-in viewer. */
async function fetchViewerEngagement(
  viewerId: string | undefined,
  reviewIds: string[],
): Promise<ViewerEngagement> {
  if (!viewerId || reviewIds.length === 0) {
    return { liked: new Set(), bookmarked: new Set() };
  }

  const [likes, bookmarks] = await Promise.all([
    prisma.reviewLike.findMany({
      where: { userId: viewerId, reviewId: { in: reviewIds } },
      select: { reviewId: true },
    }),
    prisma.reviewBookmark.findMany({
      where: { userId: viewerId, reviewId: { in: reviewIds } },
      select: { reviewId: true },
    }),
  ]);

  return {
    liked: new Set(likes.map((row) => row.reviewId)),
    bookmarked: new Set(bookmarks.map((row) => row.reviewId)),
  };
}

function mapRowsToDtos(
  rows: (PrismaReview & { user: User })[],
  engagement: ViewerEngagement,
): ReviewDto[] {
  return rows.map((row) =>
    toReviewDto(row, engagement.liked.has(row.id), engagement.bookmarked.has(row.id)),
  );
}

/** Create a review owned by the signed-in user. */
export async function createReview(userId: string, input: CreateReviewBody): Promise<ReviewDto> {
  const body = input.body.trim();
  const meals = normalizeMeals(input.meals);
  const nutrition = normalizeNutrition(input.nutrition);
  const partySize = input.partySize != null && input.partySize >= 1 ? input.partySize : null;

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
      cuisineTags: input.cuisineTags,
      foodTypeTags: input.foodTypeTags,
      imageUrls: input.imageUrls,
    },
    include: reviewInclude,
  });

  return toReviewDto(review);
}

/** Load a single review by id (public). */
export async function getReviewById(
  reviewId: string,
  viewerId?: string,
): Promise<ReviewDto | null> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: reviewInclude,
  });
  if (!review) {
    return null;
  }
  const engagement = await fetchViewerEngagement(viewerId, [review.id]);
  return toReviewDto(
    review,
    engagement.liked.has(review.id),
    engagement.bookmarked.has(review.id),
  );
}

/** Public feed — latest or most liked. */
export async function listReviews(
  query: {
    sort: 'latest' | 'popular';
    page: number;
    limit: number;
  },
  viewerId?: string,
): Promise<ReviewListResult> {
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

  const engagement = await fetchViewerEngagement(
    viewerId,
    rows.map((row) => row.id),
  );

  return {
    reviews: mapRowsToDtos(rows, engagement),
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
      cuisineTags: input.cuisineTags,
      foodTypeTags: input.foodTypeTags,
      imageUrls: input.imageUrls,
    },
    include: reviewInclude,
  });

  return toReviewDto(review);
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

  const engagement = await fetchViewerEngagement(
    userId,
    rows.map((row) => row.id),
  );

  return {
    reviews: mapRowsToDtos(rows, engagement),
    pagination: buildPagination(page, limit, total),
  };
}

/** Reviews the signed-in user has liked (newest like first). */
export async function listLikedReviewsByUser(
  userId: string,
  query: { page: number; limit: number },
): Promise<ReviewListResult> {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [likes, total] = await Promise.all([
    prisma.reviewLike.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        review: {
          include: reviewInclude,
        },
      },
    }),
    prisma.reviewLike.count({ where: { userId } }),
  ]);

  const reviewIds = likes.map((like) => like.review.id);
  const engagement = await fetchViewerEngagement(userId, reviewIds);

  return {
    reviews: likes.map((like) =>
      toReviewDto(like.review, true, engagement.bookmarked.has(like.review.id)),
    ),
    pagination: buildPagination(page, limit, total),
  };
}

/** Reviews the signed-in user has bookmarked (newest save first). */
export async function listBookmarkedReviewsByUser(
  userId: string,
  query: { page: number; limit: number },
): Promise<ReviewListResult> {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [bookmarks, total] = await Promise.all([
    prisma.reviewBookmark.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        review: {
          include: reviewInclude,
        },
      },
    }),
    prisma.reviewBookmark.count({ where: { userId } }),
  ]);

  const reviewIds = bookmarks.map((bookmark) => bookmark.review.id);
  const engagement = await fetchViewerEngagement(userId, reviewIds);

  return {
    reviews: bookmarks.map((bookmark) =>
      toReviewDto(
        bookmark.review,
        engagement.liked.has(bookmark.review.id),
        true,
      ),
    ),
    pagination: buildPagination(page, limit, total),
  };
}

/** Dashboard counters for the signed-in user. */
export async function getUserReviewStats(userId: string): Promise<{
  likesReceived: number;
  reviewsLiked: number;
  reviewsBookmarked: number;
}> {
  const [likesReceivedAgg, reviewsLiked, reviewsBookmarked] = await Promise.all([
    prisma.review.aggregate({
      where: { userId },
      _sum: { likeCount: true },
    }),
    prisma.reviewLike.count({ where: { userId } }),
    prisma.reviewBookmark.count({ where: { userId } }),
  ]);

  return {
    likesReceived: likesReceivedAgg._sum.likeCount ?? 0,
    reviewsLiked,
    reviewsBookmarked,
  };
}

/** Like a review for a user (idempotent). Returns updated count + liked state. */
export async function likeReview(
  userId: string,
  reviewId: string,
): Promise<{ likeCount: number; likedByMe: boolean } | 'not_found'> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { likeCount: true },
  });
  if (!review) {
    return 'not_found';
  }

  const existing = await prisma.reviewLike.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  });
  if (existing) {
    return { likeCount: review.likeCount, likedByMe: true };
  }

  const [, updated] = await prisma.$transaction([
    prisma.reviewLike.create({ data: { userId, reviewId } }),
    prisma.review.update({
      where: { id: reviewId },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    }),
  ]);
  return { likeCount: updated.likeCount, likedByMe: true };
}

/** Remove a user's like from a review (idempotent). */
export async function unlikeReview(
  userId: string,
  reviewId: string,
): Promise<{ likeCount: number; likedByMe: boolean } | 'not_found'> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { likeCount: true },
  });
  if (!review) {
    return 'not_found';
  }

  const existing = await prisma.reviewLike.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  });
  if (!existing) {
    return { likeCount: review.likeCount, likedByMe: false };
  }

  const [, updated] = await prisma.$transaction([
    prisma.reviewLike.delete({ where: { userId_reviewId: { userId, reviewId } } }),
    prisma.review.update({
      where: { id: reviewId },
      data: { likeCount: { decrement: 1 } },
      select: { likeCount: true },
    }),
  ]);
  return { likeCount: Math.max(0, updated.likeCount), likedByMe: false };
}

/** Bookmark a review for a user (idempotent). */
export async function bookmarkReview(
  userId: string,
  reviewId: string,
): Promise<{ bookmarkedByMe: boolean } | 'not_found' | 'forbidden'> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true },
  });
  if (!review) {
    return 'not_found';
  }
  if (review.userId === userId) {
    return 'forbidden';
  }

  const existing = await prisma.reviewBookmark.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  });
  if (existing) {
    return { bookmarkedByMe: true };
  }

  await prisma.reviewBookmark.create({ data: { userId, reviewId } });
  return { bookmarkedByMe: true };
}

/** Remove a user's bookmark from a review (idempotent). */
export async function unbookmarkReview(
  userId: string,
  reviewId: string,
): Promise<{ bookmarkedByMe: boolean } | 'not_found'> {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) {
    return 'not_found';
  }

  const existing = await prisma.reviewBookmark.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  });
  if (!existing) {
    return { bookmarkedByMe: false };
  }

  await prisma.reviewBookmark.delete({ where: { userId_reviewId: { userId, reviewId } } });
  return { bookmarkedByMe: false };
}
