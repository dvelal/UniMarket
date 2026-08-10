'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { createListing, deleteListing, toggleListingStatus, updateListing } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, LogOut, MapPin, Store, Heart, Star, Bell } from 'lucide-react'
import { toggleFavorite, addReview, updateReview, deleteReview, markNotificationRead, markAllNotificationsRead } from '@/app/actions/engagement'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'

type Listing = { id: string; title: string; description: string; category: string; price: string; location: string; imagePath: string | null; status: string; createdAt: Date; publisherName: string; publisherId: string; serviceDays: string; serviceStart: string; serviceEnd: string }
type Engagement = { listingId: string; isFavorite: boolean; averageRating: number; reviewCount: number }
type Review = { id: string; rating: string; comment: string | null; createdAt: Date; authorId: string; authorName: string }
type Notification = { id: string; title: string; message: string; type: string; readAt: Date | null; createdAt: Date }
const categories = ['Todo', 'Comida', 'Servicios', 'Tecnología', 'Moda', 'Otros']
const serviceDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function MarketplaceDashboard({ listings, engagement, notifications, reviews }: { listings: Listing[]; engagement: Engagement[]; notifications: Notification[]; reviews: Record<string, Review[]> }) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState<'consumer' | 'seller'>('consumer')
  const [category, setCategory] = useState('Todo')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Listing | null>(null)
  const [reviewing, setReviewing] = useState<Listing | null>(null)
  const [viewingReviews, setViewingReviews] = useState<Listing | null>(null)
  const [details, setDetails] = useState<Listing | null>(null)
  const [deletingReview, setDeletingReview] = useState<Review | null>(null)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [pending, startTransition] = useTransition()
  const filtered = listings.filter((item) => item.status === 'active' && (category === 'Todo' || item.category === category) && `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(query.toLowerCase()))

  function submit(formData: FormData) {
    startTransition(async () => {
      const image = formData.get('image')
      if (image instanceof File && image.size > 0) {
        const upload = new FormData()
        upload.append('file', image)
        const response = await fetch('/api/upload', { method: 'POST', body: upload })
        if (!response.ok) throw new Error('No se pudo subir la imagen.')
        const { pathname } = await response.json()
        formData.set('imagePath', pathname)
      }
      await createListing(formData)
      setOpen(false)
      router.refresh()
    })
  }

  function submitEdit(formData: FormData) {
    if (!editing) return
    startTransition(async () => {
      const image = formData.get('image')
      if (image instanceof File && image.size > 0) {
        const upload = new FormData()
        upload.append('file', image)
        const response = await fetch('/api/upload', { method: 'POST', body: upload })
        if (!response.ok) throw new Error('No se pudo subir la imagen.')
        const { pathname } = await response.json()
        formData.set('imagePath', pathname)
      }
      await updateListing(editing.id, formData)
      setEditing(null)
      router.refresh()
    })
  }

  function removeListing(id: string) {
    if (!window.confirm('¿Eliminar esta publicación permanentemente?')) return
    startTransition(async () => { await deleteListing(id); router.refresh() })
  }

  function engagementFor(id: string) { return engagement.find((item) => item.listingId === id) ?? { listingId: id, isFavorite: false, averageRating: 0, reviewCount: 0 } }

  function submitReviewEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingReview) return
    startTransition(async () => {
      try {
        await updateReview(editingReview.id, rating, comment)
        setEditingReview(null)
        setComment('')
        router.refresh()
        toast.success('Reseña actualizada con éxito')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la reseña.')
      }
    })
  }

  function confirmDeleteReview() {
    if (!deletingReview) return
    startTransition(async () => {
      try {
        await deleteReview(deletingReview.id)
        setDeletingReview(null)
        router.refresh()
        toast.success('Reseña eliminada con éxito')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la reseña.')
      }
    })
  }

  function submitReview(event: FormEvent) {
    event.preventDefault()
    if (!reviewing) return
    startTransition(async () => {
      try {
        await addReview(reviewing.id, rating, comment)
        setReviewing(null)
        setComment('')
        router.refresh()
        toast.success('Reseña publicada con éxito')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo publicar la reseña.')
      }
    })
  }

  const unreadCount = notifications.filter((item) => !item.readAt).length
  const ownListings = listings.filter((item) => item.publisherId === session?.user?.id)
  const activeListings = ownListings.filter((item) => item.status !== 'paused').length
  const sellerReviews = ownListings.flatMap((item) => reviews[item.id] ?? [])
  const sellerAverage = sellerReviews.length ? sellerReviews.reduce((sum, item) => sum + Number(item.rating), 0) / sellerReviews.length : 0

  function relativeTime(value: Date) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours} h`
    const days = Math.floor(hours / 24)
    return days === 1 ? 'Ayer' : `Hace ${days} días`
  }

  function notificationIcon(type: string) {
    if (type === 'review') return <Star className="text-accent" data-icon="inline-start" />
    if (type === 'validation') return <span aria-hidden="true" className="text-primary">●</span>
    if (type === 'announcement') return <span aria-hidden="true" className="text-accent">!</span>
    return <span aria-hidden="true" className="text-primary">•</span>
  }

  function notificationAction(item: Notification) {
    if (item.type === 'review') return 'Responder'
    if (item.type === 'listing') return 'Ver producto'
    return 'Ver detalle'
  }

  function ownerActions(item: Listing) {
    return session?.user?.id === item.publisherId ? <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditing(item)}>Editar</Button><Button type="button" size="sm" variant="destructive" onClick={() => removeListing(item.id)}>Eliminar</Button></div> : null
  }

  return <main className="min-h-svh bg-background text-foreground"><Toaster /><AlertDialog open={Boolean(deletingReview)} onOpenChange={(open) => !open && setDeletingReview(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar tu reseña?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Tu comentario y calificación se eliminarán de esta publicación.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={confirmDeleteReview}>Sí, eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6"><Link href="/" className="font-mono text-sm font-black uppercase tracking-[0.16em] text-primary">UniMarket</Link><nav aria-label="Navegación principal" className="hidden items-center gap-1 sm:flex"><Button type="button" variant={activeSection === 'consumer' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveSection('consumer')}>Explorar</Button><Button type="button" variant={activeSection === 'seller' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveSection('seller')}>Mis publicaciones</Button></nav><div className="flex items-center gap-2"><Popover><PopoverTrigger render={<Button type="button" size="icon" variant="ghost" aria-label="Notificaciones" className="relative" />}><Bell />{unreadCount > 0 ? <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{unreadCount}</span> : null}</PopoverTrigger><PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"><PopoverHeader className="flex-row items-center justify-between border-b border-border px-4 py-3"><PopoverTitle>Notificaciones</PopoverTitle><Button type="button" variant="ghost" size="sm" disabled={!unreadCount || pending} onClick={() => startTransition(async () => { await markAllNotificationsRead(); router.refresh() })}>Marcar todas como leídas</Button></PopoverHeader><div className="max-h-[min(28rem,60svh)] overflow-y-auto p-2">{notifications.length ? notifications.slice(0, 8).map((item) => <article key={item.id} className={`rounded-lg p-3 ${item.readAt ? 'opacity-60' : 'bg-primary/5'}`}><div className="flex items-start gap-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">{notificationIcon(item.type)}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold leading-5">{item.title}</p>{!item.readAt ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-label="No leída" /> : null}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.message}</p><div className="mt-2 flex items-center justify-between gap-2"><time className="text-[11px] text-muted-foreground">{relativeTime(item.createdAt)}</time><div className="flex items-center gap-1"><Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" onClick={() => startTransition(async () => { await markNotificationRead(item.id); router.refresh() })}>{notificationAction(item)}</Button>{!item.readAt ? <Button type="button" variant="ghost" size="sm" className="h-auto px-1 text-xs" onClick={() => startTransition(async () => { await markNotificationRead(item.id); router.refresh() })}>Leída</Button> : null}</div></div></div></div></article>) : <p className="px-3 py-10 text-center text-sm text-muted-foreground">No tienes notificaciones.</p>}</div><div className="border-t border-border px-4 py-3 text-center"><Link href="/notifications" className="text-sm font-medium text-primary hover:underline">Ver todas las notificaciones</Link></div></PopoverContent></Popover><span className="hidden text-xs text-muted-foreground sm:inline">{session?.user?.name ?? 'Estudiante'}</span><Button variant="outline" size="sm" onClick={async () => { await authClient.signOut(); router.push('/sign-in'); router.refresh() }}><LogOut data-icon="inline-start" /> Cerrar sesión</Button></div></div></header>
    <Dialog open={Boolean(details)} onOpenChange={(value) => !value && setDetails(null)}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{details?.title}</DialogTitle><p className="text-sm text-muted-foreground">Detalles de la publicación</p></DialogHeader>{details ? <Tabs defaultValue="info"><TabsList className="grid w-full grid-cols-3" variant="line"><TabsTrigger value="info">Información</TabsTrigger><TabsTrigger value="reviews">Reseñas</TabsTrigger><TabsTrigger value="profile">Validación / Perfil</TabsTrigger></TabsList><TabsContent value="info" className="flex flex-col gap-5 py-4">{session?.user?.id === details.publisherId ? <Button type="button" size="lg" onClick={() => { setEditing(details); setDetails(null) }}>Editar esta publicación</Button> : null}<div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-border/70 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</p><p className="text-sm leading-6">{details.description}</p></div><div className="rounded-xl border border-border/70 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entrega</p><div className="flex items-center gap-2 text-sm"><MapPin data-icon="inline-start" />{details.location}</div><p className="mt-3 text-sm text-muted-foreground">Atiende {JSON.parse(details.serviceDays || '[]').join(', ')} · {details.serviceStart}–{details.serviceEnd}</p></div></div></TabsContent><TabsContent value="reviews" className="flex flex-col gap-3 py-4"><div className="flex items-center gap-2 rounded-xl border border-border/70 p-4"><Star className="fill-accent text-accent" data-icon="inline-start" /><span className="font-semibold">{engagementFor(details.id).averageRating ? engagementFor(details.id).averageRating.toFixed(1) : 'Sin calificaciones'}</span><span className="text-sm text-muted-foreground">({engagementFor(details.id).reviewCount} reseñas)</span></div>{reviews[details.id]?.length ? reviews[details.id].map((review) => <article key={review.id} className="rounded-xl border border-border/70 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{review.authorName}</p>{review.authorId === session?.user?.id ? <div className="flex items-center gap-1"><Button type="button" variant="ghost" size="sm" className="h-auto px-1" onClick={() => { setRating(Number(review.rating)); setComment(review.comment ?? ''); setEditingReview(review) }} aria-label="Editar mi reseña">Editar</Button><Button type="button" variant="ghost" size="sm" className="h-auto px-1 text-destructive" onClick={() => setDeletingReview(review)} aria-label="Eliminar mi reseña">Eliminar</Button></div> : null}</div><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(review.createdAt))}</time></div><div className="my-2 flex gap-0.5">{[1,2,3,4,5].map((star) => <Star key={star} className={`size-4 ${star <= Number(review.rating) ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />)}</div><p className="text-sm leading-6 text-muted-foreground">{review.comment || 'Sin comentario.'}</p></article>) : <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay reseñas.</p>}</TabsContent><TabsContent value="profile" className="flex flex-col gap-4 py-4"><div className="flex items-start gap-4 rounded-xl border border-border/70 p-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Store /></div><div><p className="font-semibold">{details.publisherName}</p><p className="text-sm text-muted-foreground">Estudiante de la comunidad UNJBG</p><Badge className="mt-3" variant="secondary">Estudiante verificado</Badge></div></div><p className="text-sm leading-6 text-muted-foreground">Perfil validado mediante la cuenta institucional de UniMarket.</p></TabsContent></Tabs> : null}</DialogContent></Dialog>
    <Dialog open={Boolean(viewingReviews)} onOpenChange={(value) => !value && setViewingReviews(null)}><DialogContent className="max-h-[80svh] overflow-y-auto"><DialogHeader><DialogTitle>Reseñas de {viewingReviews?.title}</DialogTitle></DialogHeader><div className="flex flex-col gap-3">{viewingReviews && reviews[viewingReviews.id]?.length ? reviews[viewingReviews.id].map((review) => (<article key={review.id} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{review.authorName}</p>{review.authorId === session?.user?.id ? <div className="flex items-center gap-1"><Button type="button" variant="ghost" size="sm" className="h-auto px-1" onClick={() => { setRating(Number(review.rating)); setComment(review.comment ?? ''); setEditingReview(review) }} aria-label="Editar mi reseña">Editar</Button><Button type="button" variant="ghost" size="sm" className="h-auto px-1 text-destructive" onClick={() => setDeletingReview(review)} aria-label="Eliminar mi reseña">Eliminar</Button></div> : null}</div><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(review.createdAt))}</time></div><div className="my-2 flex gap-0.5">{[1,2,3,4,5].map((star) => <Star key={star} className={`size-4 ${star <= Number(review.rating) ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />)}</div>{review.comment ? <p className="text-sm leading-6 text-muted-foreground">{review.comment}</p> : <p className="text-sm italic text-muted-foreground">Sin comentario.</p>}</article>)) : <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay reseñas.</p>}</div></DialogContent></Dialog>
    <Dialog open={Boolean(editingReview)} onOpenChange={(value) => !value && setEditingReview(null)}><DialogContent><DialogHeader><DialogTitle>Editar reseña</DialogTitle></DialogHeader>{editingReview ? <form onSubmit={submitReviewEdit} className="flex flex-col gap-4"><div className="flex justify-center gap-1" aria-label="Actualiza tu calificación">{[1,2,3,4,5].map((value) => <button type="button" key={value} aria-label={`${value} estrellas`} onClick={() => setRating(value)}><Star className={value <= rating ? 'fill-accent text-accent' : 'text-muted-foreground'} /></button>)}</div><Textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} placeholder="Comentario opcional" /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditingReview(null)}>Cancelar</Button><Button type="submit" disabled={pending}>Guardar cambios</Button></div></form> : null}</DialogContent></Dialog>
  <Dialog open={Boolean(reviewing)} onOpenChange={(value) => !value && setReviewing(null)}><DialogContent><DialogHeader><DialogTitle>Calificar publicación</DialogTitle></DialogHeader>{reviewing ? <form onSubmit={submitReview} className="flex flex-col gap-4"><div className="flex justify-center gap-1" aria-label="Selecciona una calificación">{[1,2,3,4,5].map((value) => <button type="button" key={value} aria-label={`${value} estrellas`} onClick={() => setRating(value)}><Star className={value <= rating ? 'fill-accent text-accent' : 'text-muted-foreground'} /></button>)}</div><Textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} placeholder="Comentario opcional" /><Button type="submit" disabled={pending}>Publicar reseña</Button></form> : null}</DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Editar publicación</DialogTitle></DialogHeader>{editing ? <form action={submitEdit} className="flex flex-col gap-4"><div className="flex flex-col gap-2"><Label htmlFor="edit-title">Título</Label><Input id="edit-title" name="title" defaultValue={editing.title} required /></div><div className="flex flex-col gap-2"><Label htmlFor="edit-description">Descripción</Label><Textarea id="edit-description" name="description" defaultValue={editing.description} required /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="edit-category">Categoría</Label><select id="edit-category" name="category" defaultValue={editing.category} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></div><div className="flex flex-col gap-2"><Label htmlFor="edit-price">Precio (S/.)</Label><Input id="edit-price" name="price" type="number" min="0" step="0.01" defaultValue={editing.price} required /></div></div><div className="flex flex-col gap-2"><Label htmlFor="edit-location">Punto de entrega</Label><Input id="edit-location" name="location" defaultValue={editing.location} required /></div><fieldset className="flex flex-col gap-3"><legend className="text-sm font-medium">Días de atención</legend><div className="flex flex-wrap gap-2">{serviceDays.map((day) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" name="serviceDays" value={day} defaultChecked={editing.serviceDays.includes(day)} />{day}</label>)}</div><div className="grid grid-cols-2 gap-3"><div className="flex flex-col gap-2"><Label htmlFor="edit-serviceStart">Desde</Label><Input id="edit-serviceStart" name="serviceStart" type="time" defaultValue={editing.serviceStart} required /></div><div className="flex flex-col gap-2"><Label htmlFor="edit-serviceEnd">Hasta</Label><Input id="edit-serviceEnd" name="serviceEnd" type="time" defaultValue={editing.serviceEnd} required /></div></div></fieldset><div className="flex flex-col gap-2"><Label htmlFor="edit-image">Reemplazar imagen</Label><Input id="edit-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" /></div><Button type="submit" disabled={pending}>{pending ? 'Guardando...' : 'Guardar cambios'}</Button></form> : null}</DialogContent></Dialog>
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-7 sm:px-6 lg:py-10"><div className="flex items-center justify-between gap-4 border-b border-border pb-4 sm:hidden"><Button type="button" variant={activeSection === 'consumer' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveSection('consumer')}>Explorar</Button><Button type="button" variant={activeSection === 'seller' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveSection('seller')}>Mis publicaciones</Button></div>
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-8"><div className="flex flex-col gap-3"><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">Mercado universitario</p><h1 className="text-balance text-3xl font-black tracking-tight text-primary sm:text-5xl">Hola, {session?.user?.name?.split(' ')[0] ?? 'estudiante'}.</h1><p className="max-w-xl text-pretty leading-6 text-muted-foreground">Descubre publicaciones reales de tu comunidad.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<span className="hidden" />} /><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Nueva publicación</DialogTitle></DialogHeader><form action={submit} className="flex flex-col gap-5 rounded-xl border border-border/70 bg-muted/20 p-1"><div className="flex flex-col gap-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" required placeholder="Ej. Brownies caseros" /></div><div className="flex flex-col gap-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" name="description" required placeholder="Cuenta qué ofreces..." /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="category">Categoría</Label><select id="category" name="category" className="h-10 rounded-md border border-input bg-background px-3 text-sm" required>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></div><div className="flex flex-col gap-2"><Label htmlFor="price">Precio (S/.)</Label><Input id="price" name="price" type="number" min="0" step="0.01" required placeholder="0.00" /></div></div><div className="flex flex-col gap-2"><Label htmlFor="location">Punto de entrega</Label><Input id="location" name="location" required placeholder="Ej. Campus UNJBG" /></div><fieldset className="flex flex-col gap-3"><legend className="text-sm font-medium">Días de atención</legend><div className="flex flex-wrap gap-2">{serviceDays.map((day) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" name="serviceDays" value={day} />{day}</label>)}</div><div className="grid grid-cols-2 gap-3"><div className="flex flex-col gap-2"><Label htmlFor="serviceStart">Desde</Label><Input id="serviceStart" name="serviceStart" type="time" defaultValue="09:00" required /></div><div className="flex flex-col gap-2"><Label htmlFor="serviceEnd">Hasta</Label><Input id="serviceEnd" name="serviceEnd" type="time" defaultValue="18:00" required /></div></div></fieldset><div className="flex flex-col gap-2"><Label htmlFor="image">Imagen</Label><Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" /><p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5 MB.</p></div><Button type="submit" disabled={pending}>{pending ? 'Publicando...' : 'Publicar ahora'}</Button></form></DialogContent></Dialog></section>
      {activeSection === 'consumer' ? <section className="flex flex-col gap-6"><div className="flex flex-col gap-1"><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">Explorar</p><h2 className="text-2xl font-black tracking-tight text-primary">Encuentra algo que te guste</h2><p className="text-sm text-muted-foreground">Compra a estudiantes de tu comunidad, sin complicaciones.</p></div><div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4"><div className="relative flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca comida, servicios, accesorios..." className="h-11 pl-9" /></div><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <Button key={item} size="sm" variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>)}</div></div>{filtered.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Store className="text-muted-foreground" data-icon="inline-start" /><CardTitle>{query || category !== 'Todo' ? 'No encontramos resultados' : 'Aún no hay publicaciones'}</CardTitle><p className="max-w-sm text-sm leading-6 text-muted-foreground">{query || category !== 'Todo' ? 'Prueba con otra búsqueda o cambia la categoría para descubrir más opciones.' : 'Sé el primero en publicar algo para la comunidad UniMarket.'}</p>{query || category !== 'Todo' ? <Button type="button" variant="outline" onClick={() => { setQuery(''); setCategory('Todo') }}>Limpiar filtros</Button> : null}</CardContent></Card> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <Card key={item.id} className="group flex flex-col overflow-hidden border-border/70 transition-shadow hover:shadow-lg">{session?.user?.id === item.publisherId ? <div className="px-4 pt-4"><Badge variant="secondary">Tu publicación</Badge></div> : null}{item.imagePath ? <img src={`/api/file?pathname=${encodeURIComponent(item.imagePath)}`} alt={`Imagen de ${item.title}`} className="aspect-video w-full object-cover" /> : null}<CardHeader className="gap-3"><div className="flex items-start justify-between gap-3"><Badge variant="secondary">{item.category}</Badge><span className="font-mono text-lg font-black text-primary">S/. {Number(item.price).toFixed(2)}</span></div><div className="flex items-start justify-between gap-3"><CardTitle className="text-xl">{item.title}</CardTitle><Button type="button" size="icon" variant="ghost" aria-label={engagementFor(item.id).isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'} onClick={() => startTransition(async () => { await toggleFavorite(item.id); router.refresh() })}><Heart className={engagementFor(item.id).isFavorite ? 'fill-primary text-primary' : ''} /></Button></div><p className="text-xs text-muted-foreground">Vendedor: {item.publisherName}</p><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="link" className="px-0" onClick={() => setDetails(item)}>Ver detalles</Button><Button type="button" variant="outline" size="sm" onClick={() => { setRating(5); setComment(''); setReviewing(item) }} disabled={session?.user?.id === item.publisherId}>Calificar</Button><Button type="button" variant="outline" size="sm" onClick={() => setViewingReviews(item)}>Reseñas ({engagementFor(item.id).reviewCount})</Button>{session?.user?.id !== item.publisherId ? <Button type="button" variant="secondary" size="sm" onClick={() => toast.info(`Puedes contactar a ${item.publisherName} desde el chat.`)}>Contactar cliente</Button> : null}</div></CardHeader><CardContent className="flex flex-1 flex-col gap-4"><div className="mt-auto flex items-center justify-between gap-3"><Button type="button" variant="link" className="px-0" onClick={() => setDetails(item)}>Ver detalles</Button>{ownerActions(item)}</div></CardContent></Card>)}</div>}</section> : null}
      {activeSection === 'seller' ? <section className="flex flex-col gap-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">Panel de vendedor</p><h2 className="text-2xl font-black tracking-tight text-primary">Mis publicaciones</h2><p className="mt-1 text-sm text-muted-foreground">Administra tu catálogo y mantén informada a tu comunidad.</p></div><Button size="lg" onClick={() => setOpen(true)}><Plus data-icon="inline-start" /> Nueva publicación</Button></div><div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="flex flex-col gap-1 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Publicaciones activas</p><p className="text-3xl font-black text-primary">{activeListings}</p></CardContent></Card><Card><CardContent className="flex flex-col gap-1 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calificación promedio</p><p className="text-3xl font-black text-primary">{sellerAverage ? sellerAverage.toFixed(1) : '—'} <span className="text-base font-medium text-muted-foreground">/ 5</span></p></CardContent></Card><Card><CardContent className="flex flex-col gap-1 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consultas recibidas</p><p className="text-3xl font-black text-primary">{notifications.filter((item) => item.type === 'listing').length}</p></CardContent></Card></div><div className="grid gap-4 md:grid-cols-2">{ownListings.length ? ownListings.map((item) => <Card key={item.id} className="overflow-hidden border-border/70"><div className="flex gap-4 p-4"><div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"><div className="relative size-full">{item.imagePath ? <img src={item.imagePath} alt={`Imagen de ${item.title}`} className="size-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : null}<div className="absolute inset-0 flex items-center justify-center"><Store className="text-muted-foreground" aria-hidden="true" /></div></div></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="truncate font-semibold">{item.title}</h3><p className="font-mono text-sm text-primary">S/. {Number(item.price).toFixed(2)}</p></div><Badge variant={item.status === 'paused' ? 'outline' : 'secondary'}>{item.status === 'paused' ? 'Pausado' : 'Activo'}</Badge></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>★ {engagementFor(item.id).averageRating ? engagementFor(item.id).averageRating.toFixed(1) : 'Sin calificar'}</span><span>{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</span></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditing(item)}>Editar producto</Button><Button type="button" size="sm" variant="ghost" onClick={() => startTransition(async () => { await toggleListingStatus(item.id); router.refresh() })}>{item.status === 'paused' ? 'Activar' : 'Pausar'}</Button><Button type="button" size="sm" variant="destructive" onClick={() => removeListing(item.id)}>Eliminar</Button></div></div></div></Card>) : <Card className="md:col-span-2"><CardContent className="flex flex-col items-center gap-4 py-12 text-center"><Plus className="text-primary" /><CardTitle>Aún no tienes publicaciones</CardTitle><p className="max-w-md text-sm leading-6 text-muted-foreground">Crea tu primera publicación para comenzar a vender en la comunidad.</p><Button onClick={() => setOpen(true)}>Nueva publicación</Button></CardContent></Card>}</div></section> : null}
    </div>
  </main>
}
