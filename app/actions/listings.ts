'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listing, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and } from 'drizzle-orm'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getHours(formData: FormData) {
  const serviceDays = DAYS.filter((day) => formData.getAll('serviceDays').includes(day))
  const serviceStart = String(formData.get('serviceStart') ?? '')
  const serviceEnd = String(formData.get('serviceEnd') ?? '')
  if (!serviceDays.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(serviceStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(serviceEnd) || serviceStart >= serviceEnd) {
    throw new Error('Selecciona al menos un día y un horario válido.')
  }
  return { serviceDays: JSON.stringify(serviceDays), serviceStart, serviceEnd }
}

export async function createListing(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const price = Number(formData.get('price'))
  const imagePath = String(formData.get('imagePath') ?? '').trim() || null
  const hours = getHours(formData)

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
    ...hours,
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
  const hours = getHours(formData)

  if (title.length < 3 || description.length < 10 || !category || !location || !Number.isFinite(price) || price < 0) {
    throw new Error('Completa los campos correctamente.')
  }

  const result = await db.update(listing).set({ title, description, category, location, price: price.toFixed(2), ...hours, ...(imagePath ? { imagePath } : {}) }).where(and(eq(listing.id, id), eq(listing.userId, session.user.id))).returning({ id: listing.id })
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
      serviceDays: listing.serviceDays,
      serviceStart: listing.serviceStart,
      serviceEnd: listing.serviceEnd,
    })
    .from(listing)
    .leftJoin(user, eq(listing.userId, user.id))
    .orderBy(listing.createdAt)

  return rows.map((row) => ({ ...row, publisherName: row.publisherName ?? 'Estudiante' }))
}
