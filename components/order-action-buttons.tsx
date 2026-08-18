"use client"

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ActionStatus = 'CONFIRMED' | 'DELIVERED' | 'CANCELLED'

export default function OrderActionButtons({
  ticketId,
  primaryStatus,
  primaryLabel,
  cancelLabel = 'Cancelar',
}: {
  ticketId: string
  primaryStatus: ActionStatus
  primaryLabel: string
  cancelLabel?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function updateStatus(newStatus: ActionStatus) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, newStatus }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Error')
        toast.success('Estado actualizado')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  return (
    <>
      <Button onClick={() => updateStatus(primaryStatus)} disabled={pending}>{primaryLabel}</Button>
      <Button variant="destructive" onClick={() => updateStatus('CANCELLED')} disabled={pending}>{cancelLabel}</Button>
    </>
  )
}
