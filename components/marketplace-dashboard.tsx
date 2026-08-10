'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { createListing } from '@/app/actions/listings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Search, Plus, LogOut, MapPin, Store } from 'lucide-react'

type Listing = { id: string; title: string; description: string; category: string; price: string; location: string; imagePath: string | null; publisherName: string }
const categories = ['Todo', 'Comida', 'Servicios', 'Tecnología', 'Moda', 'Otros']

export function MarketplaceDashboard({ listings }: { listings: Listing[] }) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todo')
  const [open, setOpen] = useState(false)
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

  return <main className="min-h-svh bg-background text-foreground">
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6"><Link href="/" className="font-mono text-sm font-black uppercase tracking-[0.16em] text-primary">UniMarket</Link><div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">{session?.user?.name ?? 'Estudiante'}</span><Button variant="outline" size="sm" onClick={async () => { await authClient.signOut(); router.push('/sign-in'); router.refresh() }}><LogOut data-icon="inline-start" /> Cerrar sesión</Button></div></div></header>
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-7 sm:px-6 lg:py-10">
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between"><div className="flex flex-col gap-3"><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">Mercado universitario</p><h1 className="text-balance text-3xl font-black tracking-tight text-primary sm:text-5xl">Hola, {session?.user?.name?.split(' ')[0] ?? 'estudiante'}.</h1><p className="max-w-xl text-pretty leading-6 text-muted-foreground">Descubre publicaciones reales de tu comunidad o crea la tuya.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button size="lg"><Plus data-icon="inline-start" /> Crear publicación</Button>} /><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Nueva publicación</DialogTitle></DialogHeader><form action={submit} className="flex flex-col gap-4"><div className="flex flex-col gap-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" required placeholder="Ej. Brownies caseros" /></div><div className="flex flex-col gap-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" name="description" required placeholder="Cuenta qué ofreces..." /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="category">Categoría</Label><select id="category" name="category" className="h-10 rounded-md border border-input bg-background px-3 text-sm" required>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></div><div className="flex flex-col gap-2"><Label htmlFor="price">Precio (S/.)</Label><Input id="price" name="price" type="number" min="0" step="0.01" required placeholder="0.00" /></div></div><div className="flex flex-col gap-2"><Label htmlFor="location">Punto de entrega</Label><Input id="location" name="location" required placeholder="Ej. Campus UNJBG" /></div><div className="flex flex-col gap-2"><Label htmlFor="image">Imagen</Label><Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" /><p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5 MB.</p></div><Button type="submit" disabled={pending}>{pending ? 'Publicando...' : 'Publicar ahora'}</Button></form></DialogContent></Dialog></section>
      <section className="flex flex-col gap-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar publicaciones..." className="pl-9" /></div><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <Button key={item} size="sm" variant={category === item ? 'default' : 'outline'} onClick={() => setCategory(item)}>{item}</Button>)}</div></div>{filtered.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Store className="text-muted-foreground" data-icon="inline-start" /><CardTitle>Aún no hay publicaciones</CardTitle><p className="max-w-sm text-sm leading-6 text-muted-foreground">Sé el primero en publicar algo para la comunidad UniMarket.</p><Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" /> Crear publicación</Button></CardContent></Card> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <Card key={item.id} className="flex flex-col overflow-hidden">{item.imagePath ? <img src={`/api/file?pathname=${encodeURIComponent(item.imagePath)}`} alt={`Imagen de ${item.title}`} className="aspect-video w-full object-cover" /> : null}<CardHeader className="gap-3"><div className="flex items-start justify-between gap-3"><Badge variant="secondary">{item.category}</Badge><span className="font-mono text-lg font-black text-primary">S/. {Number(item.price).toFixed(2)}</span></div><CardTitle className="text-xl">{item.title}</CardTitle><p className="text-xs text-muted-foreground">Publicado por {item.publisherName}</p></CardHeader><CardContent className="flex flex-1 flex-col gap-4"><p className="flex-1 text-sm leading-6 text-muted-foreground">{item.description}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin data-icon="inline-start" /> {item.location}</div><Button variant="outline" className="w-full">Contactar</Button></CardContent></Card>)}</div>}</section>
    </div>
  </main>
}
