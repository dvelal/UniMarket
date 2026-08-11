'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { favorite, listing, notification, review, user } from '@/lib/db/schema'
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
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
  const previous = await db.select({ id: review.id }).from(review).where(and(eq(review.listingId, listingId), eq(review.userId, user.id))).limit(1)
  if (previous.length) throw new Error('Ya has dejado una reseña para esta publicación. Puedes editarla desde Reseñas.')
  const reviewId = crypto.randomUUID()
  await db.insert(review).values({ id: reviewId, listingId, userId: user.id, authorId: user.id, rating: String(rating), comment: comment.trim().slice(0, 500) })
  await db.insert(notification).values({ id: crypto.randomUUID(), userId: product[0].ownerId, type: 'review', title: 'Nueva reseña', message: `${user.name ?? 'Un estudiante'} calificó ${product[0].title}.`, listingId, reviewId })
  revalidatePath('/')
}

export async function getEngagement(listingIds: string[], userId: string) {
  if (!listingIds.length) return []
  const favorites = await db.select({ listingId: favorite.listingId }).from(favorite).where(and(eq(favorite.userId, userId), inArray(favorite.listingId, listingIds)))
  const ratings = await db.select({ listingId: review.listingId, average: sql<number>`avg(${review.rating})`, count: sql<number>`count(*)` }).from(review).where(inArray(review.listingId, listingIds)).groupBy(review.listingId)
  const favoriteIds = new Set(favorites.map((item) => item.listingId))
  return listingIds.map((id) => ({ listingId: id, isFavorite: favoriteIds.has(id), averageRating: Number(ratings.find((item) => item.listingId === id)?.average ?? 0), reviewCount: Number(ratings.find((item) => item.listingId === id)?.count ?? 0) }))
}

export async function updateReview(reviewId: string, rating: number, comment: string) {
  const current = await currentUser()
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('La calificación debe estar entre 1 y 5 estrellas.')
  const updated = await db.update(review).set({ rating: String(rating), comment: comment.trim().slice(0, 500) || null }).where(and(eq(review.id, reviewId), or(eq(review.authorId, current.id), eq(review.userId, current.id)))).returning({ id: review.id })
  if (!updated.length) throw new Error('No puedes editar esta reseña.')
  revalidatePath('/')
}

export async function deleteReview(reviewId: string) {
  const current = await currentUser()
  const deleted = await db.delete(review).where(and(eq(review.id, reviewId), or(eq(review.authorId, current.id), eq(review.userId, current.id)))).returning({ id: review.id })
  if (!deleted.length) throw new Error('No puedes eliminar esta reseña.')
  revalidatePath('/')
}

export async function getReviews(listingId: string) {
  return db.select({ id: review.id, rating: review.rating, comment: review.comment, response: review.response, createdAt: review.createdAt, authorId: sql<string>`coalesce(${review.authorId}, ${review.userId})`, authorName: sql<string>`coalesce(${user.name}, 'Estudiante')` }).from(review).leftJoin(user, eq(review.userId, user.id)).where(eq(review.listingId, listingId)).orderBy(desc(review.createdAt))
}

export async function respondToReview(reviewId: string, response: string) {
  const owner = await currentUser()
  const cleanResponse = response.trim().slice(0, 500)
  if (!cleanResponse) throw new Error('La respuesta no puede estar vacía.')
  const ownedReview = await db.select({ reviewId: review.id, listingId: review.listingId, authorId: review.userId, title: listing.title }).from(review).innerJoin(listing, eq(review.listingId, listing.id)).where(and(eq(review.id, reviewId), eq(listing.userId, owner.id))).limit(1)
  if (!ownedReview[0]) throw new Error('No puedes responder esta reseña.')
  await db.update(review).set({ response: cleanResponse }).where(eq(review.id, reviewId))
  await db.insert(notification).values({ id: crypto.randomUUID(), userId: ownedReview[0].authorId, type: 'review_response', title: 'Respuesta a tu reseña', message: `El dueño respondió a tu reseña de ${ownedReview[0].title}.`, listingId: ownedReview[0].listingId, reviewId })
  revalidatePath('/')
}

export async function markNotificationRead(id: string) {
  const user = await currentUser()
  await db.update(notification).set({ readAt: new Date() }).where(and(eq(notification.id, id), eq(notification.userId, user.id)))
  revalidatePath('/')
}

export async function markAllNotificationsRead() {
  const user = await currentUser()
  await db.update(notification).set({ readAt: new Date() }).where(and(eq(notification.userId, user.id), sql`${notification.readAt} IS NULL`))
  revalidatePath('/')
}

export async function getNotifications(userId: string) {
  return db.select().from(notification).where(eq(notification.userId, userId)).orderBy(desc(notification.createdAt)).limit(20)
}
