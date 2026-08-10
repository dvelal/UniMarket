'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listing, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and } from 'drizzle-orm'

export async function createListing(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const price = Number(formData.get('price'))
  const imagePath = String(formData.get('imagePath') ?? '').trim() || null

  if (!title || !description || !category || !location || !Number.isFinite(price) || price < 0) {
    throw new Error('Completa todos los campos correctamente.')
  }

  await db.insert(listing).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    title,
    description,
    category,
    price: price.toFixed(2),
    location,
    imagePath,
  })

  revalidatePath('/')
}

export async function updateListing(id: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const price = Number(formData.get('price'))
  const imagePath = String(formData.get('imagePath') ?? '').trim() || null

  if (title.length < 3 || description.length < 10 || !category || !location || !Number.isFinite(price) || price < 0) {
    throw new Error('Completa los campos correctamente.')
  }

  const result = await db.update(listing).set({ title, description, category, location, price: price.toFixed(2), ...(imagePath ? { imagePath } : {}) }).where(and(eq(listing.id, id), eq(listing.userId, session.user.id))).returning({ id: listing.id })
  if (!result.length) throw new Error('No puedes editar esta publicación.')
  revalidatePath('/')
}

export async function deleteListing(id: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const result = await db.delete(listing).where(and(eq(listing.id, id), eq(listing.userId, session.user.id))).returning({ id: listing.id })
  if (!result.length) throw new Error('No puedes eliminar esta publicación.')
  revalidatePath('/')
}

export async function getListings() {
  const rows = await db
    .select({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: listing.price,
      location: listing.location,
      imagePath: listing.imagePath,
      publisherName: user.name,
      publisherId: listing.userId,
    })
    .from(listing)
    .leftJoin(user, eq(listing.userId, user.id))
    .orderBy(listing.createdAt)

  return rows.map((row) => ({ ...row, publisherName: row.publisherName ?? 'Estudiante' }))
}
