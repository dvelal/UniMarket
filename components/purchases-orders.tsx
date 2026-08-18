"use client"

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTransition } from 'react'

type PurchasesTicket = {
  id: string
  listingId: string
  listingTitle: string | null
  listingImage?: string | null
  listingCategory?: string | null
  quantity: number
  totalAmount: string | number | null
  buyerId: string
  sellerName: string | null
  sellerPhone: string | null
  sellerImage?: string | null
  buyerNote?: string | null
  status: string
  createdAt: string
}

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'PENDING_CONFIRMATION', label: 'Pendientes' },
  { key: 'CONFIRMED', label: 'Por Entregar' },
  { key: 'DELIVERED', label: 'Entregados' },
  { key: 'CANCELLED', label: 'Cancelados' },
]

function normalizeWaNumber(phone?: string | null) {
  if (!phone) return null
  let p = phone.trim()
  if (p.startsWith('+')) p = p.slice(1)
  if (/^[0-9]{9}$/.test(p)) p = '51' + p
  const digits = p.replace(/\D/g, '')
  if (!/^51[0-9]{9}$/.test(digits)) return null
  return digits
}

export default function PurchasesOrders({ rows }: { rows: PurchasesTicket[] }) {
  const [status, setStatus] = useState<string>('PENDING_CONFIRMATION')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const filteredRows = useMemo(
    () =>
      [...rows]
        .filter((row) => row.status === status)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [rows, status],
  )

  async function markAsReceived(ticketId: string) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, newStatus: 'DELIVERED' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Error')
        toast.success('Pedido marcado como recibido')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  async function cancelOrder(ticketId: string) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, newStatus: 'CANCELLED' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Error')
        toast.success('Pedido cancelado')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const tabCount = rows.filter((row) => row.status === tab.key).length

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === tab.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}`}
            >
              {tab.label} ({tabCount})
            </button>
          )
        })}
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-muted-foreground">No hay compras en esta vista.</p>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((t) => (
            <article key={t.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="flex gap-4">
                {t.listingImage ? (
                  <img src={t.listingImage} alt={t.listingTitle ?? ''} className="h-20 w-20 rounded object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded bg-slate-100" />
                )}
                <div>
                  <h3 className="text-lg font-medium">{t.listingTitle}</h3>
                  <p className="text-sm text-muted-foreground">Categoría: {t.listingCategory ?? 'Sin categoría'} · Cantidad: {t.quantity} · Total S/ {t.totalAmount}</p>
                  <p className="mt-2 text-sm">Vendedor: {t.sellerName ?? 'Estudiante'}</p>
                  {t.buyerNote ? <p className="text-sm text-muted-foreground">Tu nota: {t.buyerNote}</p> : null}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col items-end gap-2">
                  {t.sellerPhone ? (() => {
                    const num = normalizeWaNumber(t.sellerPhone)
                    if (!num) return <span className="text-sm text-muted-foreground">Contacto: {t.sellerPhone}</span>
                    return <a href={`https://wa.me/${num}`} target="_blank" rel="noreferrer" className="rounded-md bg-green-600 px-3 py-1 text-sm font-semibold text-white">WhatsApp</a>
                  })() : <span className="text-sm text-muted-foreground">Sin contacto</span>}
                </div>

                <div className="flex gap-2">
                  {t.status === 'PENDING_CONFIRMATION' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() => cancelOrder(t.id)}
                    >
                      Cancelar solicitud
                    </Button>
                  )}
                  {t.status === 'CONFIRMED' && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => markAsReceived(t.id)}
                    >
                      Marcar como recibido
                    </Button>
                  )}
                  {t.status === 'DELIVERED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => toast.info('Reseña: función por implementar')}
                    >
                      Dejar reseña
                    </Button>
                  )}
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
