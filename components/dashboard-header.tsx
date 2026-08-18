"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition, useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Bell, LogOut } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/engagement"

type Notification = {
  id: string
  title: string
  message: string
  type: string
  listingId: string | null
  reviewId: string | null
  readAt: Date | null
  createdAt: Date
}

export default function DashboardHeader({
  notifications: initialNotifications,
}: {
  notifications: Notification[]
}) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [notificationsState, setNotificationsState] = useState<Notification[]>(
    initialNotifications,
  )
  const [pending, startTransition] = useTransition()
  const unreadCount = notificationsState.filter((item) => !item.readAt).length

  // Poll notifications every 6 seconds
  useEffect(() => {
    let mounted = true
    async function fetchNotes() {
      try {
        const res = await fetch("/api/notifications")
        if (!res.ok) return
        const data: Notification[] = await res.json()
        if (mounted) setNotificationsState(data)
      } catch (e) {
        // ignore
      }
    }
    fetchNotes()
    const id = setInterval(fetchNotes, 6000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  function notificationIcon(type: string) {
    if (type === "review")
      return <span className="text-accent">⭐</span>
    if (type === "validation")
      return (
        <span aria-hidden="true" className="text-primary">
          ●
        </span>
      )
    if (type === "announcement")
      return (
        <span aria-hidden="true" className="text-accent">
          !
        </span>
      )
    return (
      <span aria-hidden="true" className="text-primary">
        •
      </span>
    )
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-mono text-sm font-black uppercase tracking-[0.16em] text-primary"
        >
          UniMarket
        </Link>
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-1 sm:flex"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
          >
            Descubrir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
          >
            Mis anuncios
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/ventas")}
          >
            Mis Ventas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/compras")}
          >
            Mis Compras
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Notificaciones"
                  className="relative"
                />
              }
            >
              <Bell />
              {unreadCount > 0 ? (
                <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
            >
              <PopoverHeader className="flex-row items-center justify-between border-b border-border px-4 py-3">
                <PopoverTitle>Notificaciones</PopoverTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!unreadCount || pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await markAllNotificationsRead()
                        router.refresh()
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "No se pudieron marcar las notificaciones.",
                        )
                      }
                    })
                  }
                >
                  Marcar todo como leído
                </Button>
              </PopoverHeader>
              <div className="max-h-[min(28rem,60svh)] overflow-y-auto p-2">
                {notificationsState.length ? (
                  notificationsState.slice(0, 8).map((item) => (
                    <article
                      key={item.id}
                      className={`rounded-lg p-3 ${
                        item.readAt ? "opacity-60" : "bg-primary/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          {notificationIcon(item.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold leading-5">
                              {item.title}
                            </p>
                            {!item.readAt ? (
                              <span
                                className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                                aria-label="No leída"
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {item.message}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <time className="text-[11px] text-muted-foreground">
                              {new Intl.DateTimeFormat("es-PE", {
                                dateStyle: "short",
                                timeStyle: "short",
                              }).format(new Date(item.createdAt))}
                            </time>
                            {!item.readAt ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto px-1 text-xs"
                                onClick={() =>
                                  startTransition(async () => {
                                    await markNotificationRead(item.id)
                                    router.refresh()
                                  })
                                }
                              >
                                Leída
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No tienes notificaciones.
                  </p>
                )}
              </div>
              <div className="border-t border-border px-4 py-3 text-center">
                <Link
                  href="/notifications"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todas las notificaciones
                </Link>
              </div>
            </PopoverContent>
          </Popover>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {session?.user?.name ?? "Estudiante"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await authClient.signOut()
              router.push("/sign-in")
              router.refresh()
            }}
          >
            <LogOut data-icon="inline-start" /> Cerrar sesión
          </Button>
        </div>
      </div>
    </header>
  )
}
