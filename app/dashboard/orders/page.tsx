import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { order_ticket, listing, user } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import SellerOrders from '@/components/seller-orders'

// Server component
export default async function OrdersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return (<div className="p-6">Inicia sesión para ver tus pedidos.</div>)

  const sellerRows = await db
    .select({
      id: order_ticket.id,
      listingId: order_ticket.listingId,
      quantity: order_ticket.quantity,
      totalAmount: order_ticket.totalAmount,
      buyerId: order_ticket.buyerId,
      sellerId: order_ticket.sellerId,
      status: order_ticket.status,
      createdAt: order_ticket.createdAt,
      buyerNote: order_ticket.buyerNote,
      listingTitle: listing.title,
      listingImage: listing.imagePath,
      listingCategory: listing.category,
      buyerName: user.name,
      buyerPhone: sql`coalesce(${user.phone}, ${user.email})`,
      buyerImage: user.image,
    })
    .from(order_ticket)
    .leftJoin(listing, eq(order_ticket.listingId, listing.id))
    .leftJoin(user, eq(order_ticket.buyerId, user.id))
    .where(eq(order_ticket.sellerId, session.user.id))
    .orderBy(desc(order_ticket.createdAt))

  const buyerRows = await db
    .select({
      id: order_ticket.id,
      listingId: order_ticket.listingId,
      quantity: order_ticket.quantity,
      totalAmount: order_ticket.totalAmount,
      buyerId: order_ticket.buyerId,
      sellerId: order_ticket.sellerId,
      status: order_ticket.status,
      createdAt: order_ticket.createdAt,
      buyerNote: order_ticket.buyerNote,
      listingTitle: listing.title,
      listingImage: listing.imagePath,
      listingCategory: listing.category,
      buyerName: user.name,
      buyerPhone: sql`coalesce(${user.phone}, ${user.email})`,
      buyerImage: user.image,
    })
    .from(order_ticket)
    .leftJoin(listing, eq(order_ticket.listingId, listing.id))
    .leftJoin(user, eq(order_ticket.sellerId, user.id))
    .where(eq(order_ticket.buyerId, session.user.id))
    .orderBy(desc(order_ticket.createdAt))

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Mis Pedidos</h1>
      <SellerOrders
        sellerRows={sellerRows.map((r) => ({
          id: r.id,
          listingId: r.listingId,
          listingTitle: r.listingTitle,
          listingImage: r.listingImage ?? null,
          listingCategory: r.listingCategory ?? null,
          quantity: Number(r.quantity ?? 1),
          totalAmount: r.totalAmount,
          buyerId: r.buyerId,
          buyerName: r.buyerName,
          buyerPhone: String(r.buyerPhone ?? ''),
          buyerImage: r.buyerImage ?? null,
          buyerNote: r.buyerNote ?? null,
          status: String(r.status),
          createdAt: String(r.createdAt),
        }))}
        buyerRows={buyerRows.map((r) => ({
          id: r.id,
          listingId: r.listingId,
          listingTitle: r.listingTitle,
          listingImage: r.listingImage ?? null,
          listingCategory: r.listingCategory ?? null,
          quantity: Number(r.quantity ?? 1),
          totalAmount: r.totalAmount,
          buyerId: r.buyerId,
          buyerName: r.buyerName,
          buyerPhone: String(r.buyerPhone ?? ''),
          buyerImage: r.buyerImage ?? null,
          buyerNote: r.buyerNote ?? null,
          status: String(r.status),
          createdAt: String(r.createdAt),
        }))}
      />
    </main>
  )
}


