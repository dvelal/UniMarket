'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { createListing, deleteListing, updateListing } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, LogOut, MapPin, Store, Heart, Star, Bell } from 'lucide-react'
import { toggleFavorite, addReview, markNotificationRead } from '@/app/actions/engagement'

type Listing = { id: string; title: string; description: string; category: string; price: string; location: string; imagePath: string | null; publisherName: string; publisherId: string; serviceDays: string; serviceStart: string; serviceEnd: string }
type Engagement = { listingId: string; isFavorite: boolean; averageRating: number; reviewCount: number }
type Review = { id: string; rating: string; comment: string | null; createdAt: Date; authorName: string }
type Notification = { id: string; title: string; message: string; type: string; readAt: Date | null; createdAt: Date }
const categories = ['Todo', 'Comida', 'Servicios', 'Tecnología', 'Moda', 'Otros']
const serviceDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function MarketplaceDashboard({ listings, engagement, notifications, reviews }: { listings: Listing[]; engagement: Engagement[]; notifications: Notification[]; reviews: Record<string, Review[]> }) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todo')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Listing | null>(null)
  const [reviewing, setReviewing] = useState<Listing | null>(null)
  const [viewingReviews, setViewingReviews] = useState<Listing | null>(null)
  const [details, setDetails] = useState<Listing | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [pending, startTransition] = useTransition()
  const filtered = listings.filter((item) => (category === 'Todo' || item.category === category) && `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(query.toLowerCase()))

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

  function submitReview(event: FormEvent) {
    event.preventDefault()
    if (!reviewing) return
    startTransition(async () => { await addReview(reviewing.id, rating, comment); setReviewing(null); setComment(''); router.refresh() })
  }

  function ownerActions(item: Listing) {
    return session?.user?.id === item.publisherId ? <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditing(item)}>Editar</Button><Button type="button" size="sm" variant="destructive" onClick={() => removeListing(item.id)}>Eliminar</Button></div> : null
  }

  return <main className="min-h-svh bg-background text-foreground">
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6"><Link href="/" className="font-mono text-sm font-black uppercase tracking-[0.16em] text-primary">UniMarket</Link><div className="flex items-center gap-2"><details className="relative"><summary className="flex cursor-pointer list-none items-center"><Button type="button" size="icon" variant="ghost" aria-label="Notificaciones"><Bell />{notifications.length > 0 ? <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{notifications.length}</span> : null}</Button></summary><div className="absolute right-0 top-11 z-20 w-72 rounded-lg border border-border bg-card p-3 shadow-lg"><p className="mb-2 text-sm font-semibold">Notificaciones</p>{notifications.length ? notifications.slice(0, 5).map((item) => <button type="button" key={item.id} className={`block w-full border-t border-border px-1 py-2 text-left text-xs ${item.readAt ? 'opacity-60' : ''}`} onClick={() => startTransition(async () => { await markNotificationRead(item.id); router.refresh() })}><p className="font-medium">{item.title}</p><p className="text-muted-foreground">{item.message}</p><time className="mt-1 block text-[11px] text-muted-foreground">{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</time></button>) : <p className="text-xs text-muted-foreground">No tienes notificaciones.</p>}</div></details><span className="hidden text-xs text-muted-foreground sm:inline">{session?.user?.name ?? 'Estudiante'}</span><Button variant="outline" size="sm" onClick={async () => { await authClient.signOut(); router.push('/sign-in'); router.refresh() }}><LogOut data-icon="inline-start" /> Cerrar sesión</Button></div></div></header>
    <Dialog open={Boolean(details)} onOpenChange={(value) => !value && setDetails(null)}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{details?.title}</DialogTitle><p className="text-sm text-muted-foreground">Detalles de la publicación</p></DialogHeader>{details ? <Tabs defaultValue="info"><TabsList className="grid w-full grid-cols-3" variant="line"><TabsTrigger value="info">Información</TabsTrigger><TabsTrigger value="reviews">Reseñas</TabsTrigger><TabsTrigger value="profile">Validación / Perfil</TabsTrigger></TabsList><TabsContent value="info" className="flex flex-col gap-5 py-4"><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-border/70 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</p><p className="text-sm leading-6">{details.description}</p></div><div className="rounded-xl border border-border/70 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entrega</p><div className="flex items-center gap-2 text-sm"><MapPin data-icon="inline-start" />{details.location}</div><p className="mt-3 text-sm text-muted-foreground">Atiende {JSON.parse(details.serviceDays || '[]').join(', ')} · {details.serviceStart}–{details.serviceEnd}</p></div></div></TabsContent><TabsContent value="reviews" className="flex flex-col gap-3 py-4"><div className="flex items-center gap-2 rounded-xl border border-border/70 p-4"><Star className="fill-accent text-accent" data-icon="inline-start" /><span className="font-semibold">{engagementFor(details.id).averageRating ? engagementFor(details.id).averageRating.toFixed(1) : 'Sin calificaciones'}</span><span className="text-sm text-muted-foreground">({engagementFor(details.id).reviewCount} reseñas)</span></div>{reviews[details.id]?.length ? reviews[details.id].map((review) => <article key={review.id} className="rounded-xl border border-border/70 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{review.authorName}</p><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(review.createdAt))}</time></div><div className="my-2 flex gap-0.5">{[1,2,3,4,5].map((star) => <Star key={star} className={`size-4 ${star <= Number(review.rating) ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />)}</div><p className="text-sm leading-6 text-muted-foreground">{review.comment || 'Sin comentario.'}</p></article>) : <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay reseñas.</p>}</TabsContent><TabsContent value="profile" className="flex flex-col gap-4 py-4"><div className="flex items-start gap-4 rounded-xl border border-border/70 p-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Store /></div><div><p className="font-semibold">{details.publisherName}</p><p className="text-sm text-muted-foreground">Estudiante de la comunidad UNJBG</p><Badge className="mt-3" variant="secondary">Estudiante verificado</Badge></div></div><p className="text-sm leading-6 text-muted-foreground">Perfil validado mediante la cuenta institucional de UniMarket.</p></TabsContent></Tabs> : null}</DialogContent></Dialog>
    <Dialog open={Boolean(viewingReviews)} onOpenChange={(value) => !value && setViewingReviews(null)}><DialogContent className="max-h-[80svh] overflow-y-auto"><DialogHeader><DialogTitle>Reseñas de {viewingReviews?.title}</DialogTitle></DialogHeader><div className="flex flex-col gap-3">{viewingReviews && reviews[viewingReviews.id]?.length ? reviews[viewingReviews.id].map((review) => (<article key={review.id} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{review.authorName}</p><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(review.createdAt))}</time></div><div className="my-2 flex gap-0.5">{[1,2,3,4,5].map((star) => <Star key={star} className={`size-4 ${star <= Number(review.rating) ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />)}</div>{review.comment ? <p className="text-sm leading-6 text-muted-foreground">{review.comment}</p> : <p className="text-sm italic text-muted-foreground">Sin comentario.</p>}</article>)) : <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay reseñas.</p>}</div></DialogContent></Dialog>
    <Dialog open={Boolean(reviewing)} onOpenChange={(value) => !value && setReviewing(null)}><DialogContent><DialogHeader><DialogTitle>Calificar publicación</DialogTitle></DialogHeader>{reviewing ? <form onSubmit={submitReview} className="flex flex-col gap-4"><div className="flex justify-center gap-1" aria-label="Selecciona una calificación">{[1,2,3,4,5].map((value) => <button type="button" key={value} aria-label={`${value} estrellas`} onClick={() => setRating(value)}><Star className={value <= rating ? 'fill-accent text-accent' : 'text-muted-foreground'} /></button>)}</div><Textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} placeholder="Comentario opcional" /><Button type="submit" disabled={pending}>Publicar reseña</Button></form> : null}</DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Editar publicación</DialogTitle></DialogHeader>{editing ? <form action={submitEdit} className="flex flex-col gap-4"><div className="flex flex-col gap-2"><Label htmlFor="edit-title">Título</Label><Input id="edit-title" name="title" defaultValue={editing.title} required /></div><div className="flex flex-col gap-2"><Label htmlFor="edit-description">Descripción</Label><Textarea id="edit-description" name="description" defaultValue={editing.description} required /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="edit-category">Categoría</Label><select id="edit-category" name="category" defaultValue={editing.category} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></div><div className="flex flex-col gap-2"><Label htmlFor="edit-price">Precio (S/.)</Label><Input id="edit-price" name="price" type="number" min="0" step="0.01" defaultValue={editing.price} required /></div></div><div className="flex flex-col gap-2"><Label htmlFor="edit-location">Punto de entrega</Label><Input id="edit-location" name="location" defaultValue={editing.location} required /></div><fieldset className="flex flex-col gap-3"><legend className="text-sm font-medium">Días de atención</legend><div className="flex flex-wrap gap-2">{serviceDays.map((day) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" name="serviceDays" value={day} defaultChecked={editing.serviceDays.includes(day)} />{day}</label>)}</div><div className="grid grid-cols-2 gap-3"><div className="flex flex-col gap-2"><Label htmlFor="edit-serviceStart">Desde</Label><Input id="edit-serviceStart" name="serviceStart" type="time" defaultValue={editing.serviceStart} required /></div><div className="flex flex-col gap-2"><Label htmlFor="edit-serviceEnd">Hasta</Label><Input id="edit-serviceEnd" name="serviceEnd" type="time" defaultValue={editing.serviceEnd} required /></div></div></fieldset><div className="flex flex-col gap-2"><Label htmlFor="edit-image">Reemplazar imagen</Label><Input id="edit-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" /></div><Button type="submit" disabled={pending}>{pending ? 'Guardando...' : 'Guardar cambios'}</Button></form> : null}</DialogContent></Dialog>
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-7 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between"><div className="flex flex-col gap-3"><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">Mercado universitario</p><h1 className="text-balance text-3xl font-black tracking-tight text-primary sm:text-5xl">Hola, {session?.user?.name?.split(' ')[0] ?? 'estudiante'}.</h1><p className="max-w-xl text-pretty leading-6 text-muted-foreground">Descubre publicaciones reales de tu comunidad o crea la tuya.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button size="lg"><Plus data-icon="inline-start" /> Crear publicación</Button>} /><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Nueva publicación</DialogTitle></DialogHeader><form action={submit} className="flex flex-col gap-5 rounded-xl border border-border/70 bg-muted/20 p-1"><div className="flex flex-col gap-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" required placeholder="Ej. Brownies caseros" /></div><div className="flex flex-col gap-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" name="description" required placeholder="Cuenta qué ofreces..." /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="category">Categoría</Label><select id="category" name="category" className="h-10 rounded-md border border-input bg-background px-3 text-sm" required>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></div><div className="flex flex-col gap-2"><Label htmlFor="price">Precio (S/.)</Label><Input id="price" name="price" type="number" min="0" step="0.01" required placeholder="0.00" /></div></div><div className="flex flex-col gap-2"><Label htmlFor="location">Punto de entrega</Label><Input id="location" name="location" required placeholder="Ej. Campus UNJBG" /></div><fieldset className="flex flex-col gap-3"><legend className="text-sm font-medium">Días de atención</legend><div className="flex flex-wrap gap-2">{serviceDays.map((day) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" name="serviceDays" value={day} />{day}</label>)}</div><div className="grid grid-cols-2 gap-3"><div className="flex flex-col gap-2"><Label htmlFor="serviceStart">Desde</Label><Input id="serviceStart" name="serviceStart" type="time" defaultValue="09:00" required /></div><div className="flex flex-col gap-2"><Label htmlFor="serviceEnd">Hasta</Label><Input id="serviceEnd" name="serviceEnd" type="time" defaultValue="18:00" required /></div></div></fieldset><div className="flex flex-col gap-2"><Label htmlFor="image">Imagen</Label><Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" /><p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5 MB.</p></div><Button type="submit" disabled={pending}>{pending ? 'Publicando...' : 'Publicar ahora'}</Button></form></DialogContent></Dialog></section>
      <section className="flex flex-col gap-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar publicaciones..." className="pl-9" /></div><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <Button key={item} size="sm" variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>)}</div></div>{filtered.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Store className="text-muted-foreground" data-icon="inline-start" /><CardTitle>Aún no hay publicaciones</CardTitle><p className="max-w-sm text-sm leading-6 text-muted-foreground">Sé el primero en publicar algo para la comunidad UniMarket.</p><Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" /> Crear publicación</Button></CardContent></Card> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <Card key={item.id} className="flex flex-col overflow-hidden">{item.imagePath ? <img src={`/api/file?pathname=${encodeURIComponent(item.imagePath)}`} alt={`Imagen de ${item.title}`} className="aspect-video w-full object-cover" /> : null}<CardHeader className="gap-3"><div className="flex items-start justify-between gap-3"><Badge variant="secondary">{item.category}</Badge><span className="font-mono text-lg font-black text-primary">S/. {Number(item.price).toFixed(2)}</span></div><div className="flex items-start justify-between gap-3"><CardTitle className="text-xl">{item.title}</CardTitle><Button type="button" size="icon" variant="ghost" aria-label={engagementFor(item.id).isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'} onClick={() => startTransition(async () => { await toggleFavorite(item.id); router.refresh() })}><Heart className={engagementFor(item.id).isFavorite ? 'fill-primary text-primary' : ''} /></Button></div><p className="text-xs text-muted-foreground">Vendedor: {item.publisherName}</p></CardHeader><CardContent className="flex flex-1 flex-col gap-4"><div className="mt-auto flex items-center justify-between gap-3"><Button type="button" variant="link" className="px-0" onClick={() => setDetails(item)}>Ver detalles</Button>{ownerActions(item)}</div></CardContent></Card>)}</div>}</section>
    </div>
  </main>
}
