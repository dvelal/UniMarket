import { NextResponse } from 'next/server'
import { createOrderTicket, updateTicketStatus } from '@/app/actions/orders'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { listingId, quantity, buyerPhone, buyerNote } = body
    const result = await createOrderTicket({ listingId, quantity, buyerPhone, buyerNote })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { ticketId, newStatus } = body
    const result = await updateTicketStatus({ ticketId, newStatus })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 400 })
  }
}
