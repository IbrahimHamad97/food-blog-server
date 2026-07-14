/**
 * Public user profiles — never expose email or Google id.
 */
import { prisma } from '../../lib/prisma.js';

export interface PublicUserDto {
  id: string;
  name: string;
  avatarUrl: string | null;
  reviewCount: number;
}

/** Public profile for a user, or null if not found. */
export async function getPublicUserById(userId: string): Promise<PublicUserDto | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      _count: { select: { reviews: true } },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    reviewCount: user._count.reviews,
  };
}
