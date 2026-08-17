import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { order_ticket, listing, user } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { use } from 'react'
import SellerOrders from '@/components/seller-orders'

// Server component
export default async function OrdersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return (<div className="p-6">Inicia sesión para ver tus pedidos.</div>)

  const rows = await db
    .select({
      id: order_ticket.id,
      listingId: order_ticket.listingId,
      quantity: order_ticket.quantity,
      totalAmount: order_ticket.totalAmount,
      buyerId: order_ticket.buyerId,
      status: order_ticket.status,
      createdAt: order_ticket.createdAt,
      listingTitle: listing.title,
      buyerName: user.name,
      buyerPhone: sql`coalesce(${user.phone}, ${user.email})`,
      buyerImage: user.image,
    })
    .from(order_ticket)
    .leftJoin(listing, eq(order_ticket.listingId, listing.id))
    .leftJoin(user, eq(order_ticket.buyerId, user.id))
    .where(eq(order_ticket.sellerId, session.user.id))
    .orderBy(desc(order_ticket.createdAt))

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Mis Pedidos</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No has recibido pedidos aún.</p>
      ) : (
        <SellerOrders rows={rows.map((r) => ({
          id: r.id,
          listingId: r.listingId,
          listingTitle: r.listingTitle,
          listingImage: (r as any).listingImagePath ?? null,
          quantity: Number(r.quantity ?? 1),
          totalAmount: r.totalAmount,
          buyerId: r.buyerId,
          buyerName: r.buyerName,
          buyerPhone: String(r.buyerPhone ?? ''),
          buyerImage: r.buyerImage ?? null,
          buyerNote: (r as any).buyerNote ?? null,
          status: String(r.status),
          createdAt: String(r.createdAt),
        }))} />
      )}
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'PENDING_CONFIRMATION') return <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-semibold text-amber-800">Pendiente de confirmación</span>
  if (status === 'CONFIRMED') return <span className="rounded-full bg-yellow-200 px-3 py-1 text-sm font-semibold text-yellow-800">Pedido confirmado / Por entregar</span>
  if (status === 'DELIVERED') return <span className="rounded-full bg-green-200 px-3 py-1 text-sm font-semibold text-green-800">Pedido entregado</span>
  return <span className="rounded-full bg-red-200 px-3 py-1 text-sm font-semibold text-red-800">Pedido cancelado</span>
}


