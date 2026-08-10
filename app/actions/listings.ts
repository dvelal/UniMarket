'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listing } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createListing(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const price = Number(formData.get('price'))

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
  })

  revalidatePath('/')
}

export async function getListings() {
  return db.select().from(listing).orderBy(listing.createdAt)
}
