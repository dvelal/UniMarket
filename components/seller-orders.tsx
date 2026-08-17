"use client"

import React, { useMemo, useState } from 'react'
import OrderActionButtons from '@/components/order-action-buttons'

type Ticket = {
  id: string
  listingId: string
  listingTitle: string | null
  listingImage?: string | null
  quantity: number
  totalAmount: string | number | null
  buyerId: string
  buyerName: string | null
  buyerPhone: string | null
  buyerImage?: string | null
  buyerNote?: string | null
  status: string
  createdAt: string
}

const TABS: { key: string; label: string }[] = [
  { key: 'PENDING_CONFIRMATION', label: 'Pendientes' },
  { key: 'CONFIRMED', label: 'Por Entregar' },
  { key: 'DELIVERED', label: 'Entregados' },
  { key: 'CANCELLED', label: 'Cancelados' },
]

function normalizeWaNumber(phone?: string | null) {
  if (!phone) return null
  let p = phone.trim()
  if (p.startsWith('+')) p = p.slice(1)
  // If user provided local 9 digits, prefix country code 51
  if (/^[0-9]{9}$/.test(p)) p = '51' + p
  // Only allow numbers
  const digits = p.replace(/\D/g, '')
  if (!/^51[0-9]{9}$/.test(digits)) return null
  return digits
}

export default function SellerOrders({ rows }: { rows: Ticket[] }) {
  const [active, setActive] = useState<string>('PENDING_CONFIRMATION')

  const grouped = useMemo(() => {
    const map: Record<string, Ticket[]> = {
      PENDING_CONFIRMATION: [],
      CONFIRMED: [],
      DELIVERED: [],
      CANCELLED: [],
    }
    rows.forEach((r) => {
      const s = r.status || 'PENDING_CONFIRMATION'
      if (!map[s]) map[s] = []
      map[s].push(r)
    })
    // ensure each group is sorted by createdAt desc
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    })
    return map
  }, [rows])

  const list = grouped[active] ?? []

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActive(t.key)} className={`rounded-md px-3 py-1 text-sm font-medium ${active === t.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}`}>
            {t.label} ({grouped[t.key]?.length ?? 0})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground">No hay pedidos en esta categoría.</p>
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <article key={t.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="flex gap-4">
                {t.listingImage ? (
                  <img src={t.listingImage} alt={t.listingTitle ?? ''} className="h-20 w-20 rounded object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded bg-slate-100" />
                )}
                <div>
                  <h3 className="text-lg font-medium">{t.listingTitle}</h3>
                  <p className="text-sm text-muted-foreground">Cantidad: {t.quantity} · Total S/ {t.totalAmount}</p>
                  <p className="mt-2 text-sm">Comprador: {t.buyerName ?? 'Estudiante'}</p>
                  {t.buyerNote ? <p className="text-sm text-muted-foreground">Nota: {t.buyerNote}</p> : null}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col items-end gap-2">
                  {t.buyerPhone ? (
                    (() => {
                      const num = normalizeWaNumber(t.buyerPhone)
                      if (!num) return <span className="text-sm text-muted-foreground">Contacto: {t.buyerPhone}</span>
                      return (
                        <a href={`https://wa.me/${num}`} target="_blank" rel="noreferrer" className="rounded-md bg-green-600 px-3 py-1 text-sm font-semibold text-white">WhatsApp</a>
                      )
                    })()
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin contacto</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {t.status === 'PENDING_CONFIRMATION' ? (
                    <OrderActionButtons ticketId={t.id} primaryStatus="CONFIRMED" primaryLabel="Confirmar pedido" />
                  ) : t.status === 'CONFIRMED' ? (
                    <OrderActionButtons ticketId={t.id} primaryStatus="DELIVERED" primaryLabel="Marcar como entregado" />
                  ) : null}
                </div>
                <time className="mt-2 block text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(t.createdAt))}</time>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
