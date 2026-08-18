import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { order_ticket, listing, user } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import PurchasesOrders from '@/components/purchases-orders'

// Server component
export default async function PurchasesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return (<div className="p-6">Inicia sesión para ver tus compras.</div>)

  const purchaseRows = await db
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
      sellerName: user.name,
      sellerPhone: sql`coalesce(${user.phone}, ${user.email})`,
      sellerImage: user.image,
    })
    .from(order_ticket)
    .leftJoin(listing, eq(order_ticket.listingId, listing.id))
    .leftJoin(user, eq(order_ticket.sellerId, user.id))
    .where(eq(order_ticket.buyerId, session.user.id))
    .orderBy(desc(order_ticket.createdAt))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-semibold">Mis Compras</h1>
      <PurchasesOrders
        rows={purchaseRows.map((r) => ({
          id: r.id,
          listingId: r.listingId,
          listingTitle: r.listingTitle,
          listingImage: r.listingImage ?? null,
          listingCategory: r.listingCategory ?? null,
          quantity: Number(r.quantity ?? 1),
          totalAmount: r.totalAmount,
          buyerId: r.buyerId,
          sellerName: r.sellerName,
          sellerPhone: String(r.sellerPhone ?? ''),
          sellerImage: r.sellerImage ?? null,
          buyerNote: r.buyerNote ?? null,
          status: String(r.status),
          createdAt: String(r.createdAt),
        }))}
      />
    </div>
  )
}
