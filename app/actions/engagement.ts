'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { favorite, listing, notification, review } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Debes iniciar sesión.')
  return session.user
}

export async function toggleFavorite(listingId: string) {
  const user = await currentUser()
  const existing = await db.select({ id: favorite.id }).from(favorite).where(and(eq(favorite.listingId, listingId), eq(favorite.userId, user.id))).limit(1)
  if (existing[0]) await db.delete(favorite).where(eq(favorite.id, existing[0].id))
  else await db.insert(favorite).values({ id: crypto.randomUUID(), listingId, userId: user.id })
  revalidatePath('/')
}

export async function addReview(listingId: string, rating: number, comment: string) {
  const user = await currentUser()
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('La calificación debe ser de 1 a 5 estrellas.')
  const product = await db.select({ ownerId: listing.userId, title: listing.title }).from(listing).where(eq(listing.id, listingId)).limit(1)
  if (!product[0]) throw new Error('Publicación no encontrada.')
  if (product[0].ownerId === user.id) throw new Error('No puedes calificar tu propia publicación.')
  await db.insert(review).values({ id: crypto.randomUUID(), listingId, userId: user.id, rating: String(rating), comment: comment.trim().slice(0, 500) })
  await db.insert(notification).values({ id: crypto.randomUUID(), userId: product[0].ownerId, type: 'review', title: 'Nueva reseña', message: `${user.name ?? 'Un estudiante'} calificó ${product[0].title}.` })
  revalidatePath('/')
}

export async function getEngagement(listingIds: string[], userId: string) {
  if (!listingIds.length) return []
  const favorites = await db.select({ listingId: favorite.listingId }).from(favorite).where(and(eq(favorite.userId, userId), sql`${favorite.listingId} IN ${listingIds}`))
  const ratings = await db.select({ listingId: review.listingId, average: sql<number>`avg(${review.rating})`, count: sql<number>`count(*)` }).from(review).where(sql`${review.listingId} IN ${listingIds}`).groupBy(review.listingId)
  const favoriteIds = new Set(favorites.map((item) => item.listingId))
  return listingIds.map((id) => ({ listingId: id, isFavorite: favoriteIds.has(id), averageRating: Number(ratings.find((item) => item.listingId === id)?.average ?? 0), reviewCount: Number(ratings.find((item) => item.listingId === id)?.count ?? 0) }))
}

export async function getNotifications(userId: string) {
  return db.select().from(notification).where(eq(notification.userId, userId)).orderBy(desc(notification.createdAt)).limit(20)
}
