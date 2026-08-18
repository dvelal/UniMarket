'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listing, order_ticket, notification, user } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

export async function createOrderTicket(payload: {
  listingId: string
  quantity: number
  buyerPhone: string
  buyerNote?: string | null
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const { listingId, quantity, buyerPhone, buyerNote } = payload
  if (!listingId || !quantity || quantity < 1) throw new Error('Cantidad inválida')

  const phone = String(buyerPhone ?? '').trim()
  if (!phone) throw new Error('Ingresa tu número de contacto')
  // Aceptar 9 dígitos locales (e.g. 987654321) o +51 seguido de 9 dígitos (e.g. +51987654321)
  const isLocal9 = /^[0-9]{9}$/.test(phone)
  const isPeruWithCode = /^\+51[0-9]{9}$/.test(phone)
  if (!isLocal9 && !isPeruWithCode) throw new Error('Número inválido. Usa 9 dígitos o +51 seguido de 9 dígitos')

  // obtener listing y seller
  const [item] = await db.select({ sellerId: listing.userId, title: listing.title, price: listing.price }).from(listing).where(eq(listing.id, listingId)).limit(1)
  if (!item) throw new Error('Publicación no encontrada')

  const sellerId = item.sellerId
  const price = Number(item.price as unknown as string || 0)
  const total = (price * quantity).toFixed(2)

  const ticketId = crypto.randomUUID()

  await db.insert(order_ticket).values({
    id: ticketId,
    listingId,
    buyerId: session.user.id,
    sellerId,
    quantity,
    totalAmount: total,
    buyerPhone: phone,
    buyerNote: buyerNote ?? null,
  })

  // crear notificación para vendedor
  await db.insert(notification).values({
    id: crypto.randomUUID(),
    userId: sellerId,
    type: 'order',
    title: `Nuevo pedido: ${item.title}`,
    message: `Tienes un nuevo pedido de ${session.user.name ?? 'Estudiante'} (${quantity} x).`,
    listingId,
    createdAt: new Date(),
  })

  // Nota: no guardamos el teléfono en el perfil automáticamente (evitar errores si la columna no existe)

  // revalidar el dashboard del vendedor
  revalidatePath('/dashboard/orders')

  return { id: ticketId }
}

export async function updateTicketStatus(payload: { ticketId: string; newStatus: 'CONFIRMED' | 'DELIVERED' | 'CANCELLED' }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const { ticketId, newStatus } = payload
  if (!ticketId) throw new Error('Ticket inválido')

  // verificar que el ticket pertenece al vendedor
  const [ticket] = await db.select({ id: order_ticket.id, sellerId: order_ticket.sellerId, buyerId: order_ticket.buyerId }).from(order_ticket).where(eq(order_ticket.id, ticketId)).limit(1)
  if (!ticket) throw new Error('Ticket no encontrado')
  if (ticket.sellerId !== session.user.id) throw new Error('No autorizado')

  await db.update(order_ticket).set({ status: newStatus }).where(eq(order_ticket.id, ticketId))

  // notificar al comprador según nuevo estado
  const title = newStatus === 'CONFIRMED' ? 'Pedido confirmado' : newStatus === 'DELIVERED' ? 'Pedido entregado' : 'Pedido cancelado'
  const message = newStatus === 'CONFIRMED'
    ? 'El vendedor ha confirmado tu pedido. Pronto será entregado.'
    : newStatus === 'DELIVERED'
    ? 'Tu pedido ha sido marcado como entregado.'
    : 'Tu pedido fue cancelado por el vendedor.'

  await db.insert(notification).values({
    id: crypto.randomUUID(),
    userId: ticket.buyerId,
    type: 'order_update',
    title,
    message: `${message} (Estado: ${newStatus})`,
    listingId: null,
    createdAt: new Date(),
  })

  revalidatePath('/dashboard/orders')

  return { ok: true }
}
