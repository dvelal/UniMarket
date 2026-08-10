import { getNotifications } from '@/app/actions/engagement'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const notifications = await getNotifications(session.user.id)

  return <main className="min-h-svh bg-background px-4 py-8 text-foreground sm:px-6"><div className="mx-auto flex max-w-2xl flex-col gap-6"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">Centro de actividad</p><h1 className="mt-2 text-3xl font-black tracking-tight">Todas las notificaciones</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Revisa la actividad de tus publicaciones y de la comunidad.</p></div><section className="flex flex-col gap-2">{notifications.length ? notifications.map((item) => <article key={item.id} className={`rounded-xl border border-border p-4 ${item.readAt ? 'opacity-70' : 'bg-primary/5'}`}><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.message}</p></div><time className="shrink-0 text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</time></div></article>) : <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No tienes notificaciones.</div>}</section></div></main>
}
