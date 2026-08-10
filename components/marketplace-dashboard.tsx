'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Heart,
  LayoutGrid,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Tag,
  UserRound,
  X,
} from 'lucide-react'

type Product = {
  id: number
  name: string
  seller: string
  category: string
  price: string
  rating: string
  reviews: number
  location: string
  time: string
  color: string
  emoji: string
  badge?: string
}

const products: Product[] = [
  { id: 1, name: 'Pack de apuntes: Cálculo II', seller: 'Valeria Quispe', category: 'Apuntes', price: 'S/ 8.00', rating: '4.9', reviews: 18, location: 'Campus UNJBG', time: 'Hace 2 h', color: 'bg-sky-100', emoji: '📘', badge: 'Más vendido' },
  { id: 2, name: 'Brownie de chocolate artesanal', seller: 'Dulce Break', category: 'Comida', price: 'S/ 4.50', rating: '5.0', reviews: 31, location: 'Cercado', time: 'Hace 35 min', color: 'bg-amber-100', emoji: '🍫', badge: 'Entrega hoy' },
  { id: 3, name: 'Polo oversize UNJBG', seller: 'Ropa Joven', category: 'Moda', price: 'S/ 35.00', rating: '4.8', reviews: 12, location: 'Ciudad Universitaria', time: 'Ayer', color: 'bg-rose-100', emoji: '👕' },
  { id: 4, name: 'Diseño de CV profesional', seller: 'Micaela Studio', category: 'Servicios', price: 'S/ 15.00', rating: '4.9', reviews: 9, location: 'Remoto', time: 'Hace 1 h', color: 'bg-violet-100', emoji: '✦', badge: 'Nuevo' },
  { id: 5, name: 'Llavero tejido a mano', seller: 'Artesanías Tati', category: 'Regalos', price: 'S/ 6.00', rating: '4.7', reviews: 7, location: 'Campus UNJBG', time: 'Hace 4 h', color: 'bg-emerald-100', emoji: '🧶' },
  { id: 6, name: 'Clases de inglés conversacional', seller: 'Luis Cárdenas', category: 'Servicios', price: 'S/ 20.00', rating: '4.9', reviews: 14, location: 'Biblioteca', time: 'Hace 3 h', color: 'bg-cyan-100', emoji: '🎧' },
]

const categories = ['Todo', 'Comida', 'Apuntes', 'Moda', 'Servicios', 'Regalos']

export function MarketplaceDashboard() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [activeCategory, setActiveCategory] = useState('Todo')
  const [query, setQuery] = useState('')
  const [isEntrepreneur, setIsEntrepreneur] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<Product | null>(null)
  const [favorites, setFavorites] = useState<number[]>([])
  const [mobileNav, setMobileNav] = useState(false)

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = activeCategory === 'Todo' || product.category === activeCategory
    const haystack = `${product.name} ${product.seller} ${product.category}`.toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase())
  }), [activeCategory, query])

  function toggleFavorite(id: number) {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button className="rounded-lg p-2 text-muted-foreground lg:hidden" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menú">
            {mobileNav ? <X data-icon="inline-start" /> : <Menu data-icon="inline-start" />}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><ShoppingBag data-icon="inline-start" /></div>
            <div className="hidden sm:block"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">UNJBG</p><p className="text-sm font-bold tracking-tight">Mercado Estudiantil</p></div>
          </div>
          <div className="relative ml-auto hidden max-w-xl flex-1 md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca productos, servicios o emprendimientos..." className="h-10 w-full rounded-xl border border-input bg-muted/40 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
          </div>
          <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Notificaciones"><Bell data-icon="inline-start" /><span className="absolute right-1 top-1 size-2 rounded-full bg-accent" /></button>
          {!isPending && session?.user ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border border-border px-2 py-1.5 text-left sm:flex"><span className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent-foreground">{getInitials(session.user.name)}</span><span className="hidden max-w-28 truncate text-xs font-semibold lg:block">{session.user.name}</span><ChevronDown className="text-muted-foreground" data-icon="inline-end" /></div>
              <button onClick={async () => { await authClient.signOut(); router.push('/sign-in'); router.refresh() }} className="rounded-lg px-2.5 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Cerrar sesión">Cerrar sesión</button>
            </div>
          ) : (
            <Link href="/sign-in" className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Iniciar sesión</Link>
          )}
        </div>
        <div className="mx-auto block max-w-[1440px] px-4 pb-3 md:hidden"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-icon="inline-start" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca en el mercado..." className="h-10 w-full rounded-xl border border-input bg-muted/40 pl-10 pr-4 text-sm outline-none" /></div></div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className={`${mobileNav ? 'flex' : 'hidden'} fixed inset-x-0 top-[113px] z-10 flex-col border-b border-border bg-card p-4 lg:static lg:flex lg:min-h-[calc(100vh-65px)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:bg-transparent lg:p-6`}>
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {[['Descubrir', LayoutGrid], ['Mis favoritos', Heart], ['Mensajes', MessageCircle], ['Mis compras', ShoppingBag]].map(([label, Icon]) => <button key={label as string} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${label === 'Descubrir' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon data-icon="inline-start" />{label as string}{label === 'Mensajes' && <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">2</span>}</button>)}
          </nav>
          <div className="my-6 border-t border-border" />
          <p className="px-3 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Explorar</p>
          <nav className="flex flex-col gap-1 text-sm font-medium">{categories.slice(1).map((category) => <button key={category} onClick={() => { setActiveCategory(category); setMobileNav(false) }} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${activeCategory === category ? 'bg-accent/15 text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><span className="flex items-center gap-3"><Tag data-icon="inline-start" />{category}</span><ChevronRight className="opacity-50" data-icon="inline-end" /></button>)}</nav>
          <div className="mt-auto hidden rounded-2xl bg-primary p-4 text-primary-foreground lg:block"><Sparkles className="mb-3 text-accent" data-icon="inline-start" /><p className="text-sm font-bold">¿Tienes algo que ofrecer?</p><p className="mt-1 text-xs leading-relaxed text-primary-foreground/70">Publica tu producto o servicio y llega a toda la comunidad.</p><button onClick={() => setIsEntrepreneur(true)} className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground">Publicar ahora</button></div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">Martes, 18 de junio</p><h1 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">Hola, {session?.user?.name?.split(' ')[0] ?? 'estudiante'} <span className="text-accent">.</span></h1><p className="mt-2 text-sm text-muted-foreground">Lo mejor de tu comunidad universitaria, en un solo lugar.</p></div><div className="flex rounded-xl border border-border bg-card p-1 text-xs font-bold"><button onClick={() => setIsEntrepreneur(false)} className={`rounded-lg px-3 py-2 transition ${!isEntrepreneur ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Comprar</button><button onClick={() => setIsEntrepreneur(true)} className={`rounded-lg px-3 py-2 transition ${isEntrepreneur ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Emprender</button></div></div>
          {isEntrepreneur ? <EntrepreneurView /> : <>
            <div className="mb-8 grid gap-4 sm:grid-cols-3"><StatCard label="Publicaciones activas" value="2,480" detail="+12% esta semana" icon={Store} /><StatCard label="Emprendimientos" value="186" detail="de estudiantes UNJBG" icon={Sparkles} /><StatCard label="Compras realizadas" value="1,204" detail="en nuestra comunidad" icon={ShoppingBag} /></div>
            <div className="mb-7 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black tracking-tight text-primary">Encuentra algo increíble</h2><p className="mt-1 text-sm text-muted-foreground">Explora lo que tus compañeros están creando.</p></div><button className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted sm:flex"><SlidersHorizontal data-icon="inline-start" />Más filtros</button></div>
            <div className="mb-6 flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${activeCategory === category ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-muted'}`}>{category}</button>)}</div>
            {filteredProducts.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={() => toggleFavorite(product.id)} onSeller={() => setSelectedSeller(product)} />)}</div> : <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Search className="mx-auto mb-3 text-muted-foreground" /><p className="font-bold">No encontramos resultados</p><p className="mt-1 text-sm text-muted-foreground">Prueba con otra búsqueda o categoría.</p></div>}
          </>}
        </section>
      </div>
      {selectedSeller && <SellerDialog product={selectedSeller} onClose={() => setSelectedSeller(null)} />}
    </main>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Store }) { return <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-primary">{value}</p><p className="mt-1 text-[11px] font-semibold text-accent-foreground">{detail}</p></div><div className="rounded-lg bg-muted p-2 text-primary"><Icon data-icon="inline-start" /></div></div></div> }

function ProductCard({ product, favorite, onFavorite, onSeller }: { product: Product; favorite: boolean; onFavorite: () => void; onSeller: () => void }) { return <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={`${product.color} relative flex h-40 items-center justify-center`}><span className="text-6xl drop-shadow-sm transition group-hover:scale-105">{product.emoji}</span>{product.badge && <span className="absolute left-3 top-3 rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-primary shadow-sm">{product.badge}</span>}<button onClick={onFavorite} aria-label={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'} className={`absolute right-3 top-3 rounded-full p-2 transition ${favorite ? 'bg-accent text-accent-foreground' : 'bg-card/80 text-muted-foreground hover:bg-card hover:text-accent'}`}><Heart className={favorite ? 'fill-current' : ''} data-icon="inline-start" /></button></div><div className="p-4"><div className="mb-2 flex items-start justify-between gap-3"><div><p className="font-bold leading-tight text-primary">{product.name}</p><button onClick={onSeller} className="mt-1 text-xs text-muted-foreground hover:text-accent">por {product.seller}</button></div><p className="whitespace-nowrap font-black text-primary">{product.price}</p></div><div className="flex items-center gap-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1 font-semibold text-accent-foreground"><Star className="fill-current" data-icon="inline-start" />{product.rating} <span className="font-normal">({product.reviews})</span></span><span className="flex items-center gap-1"><MapPin data-icon="inline-start" />{product.location}</span></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Clock3 data-icon="inline-start" />{product.time}</span><button onClick={onSeller} className="font-bold text-primary hover:text-accent">Ver detalle <ChevronRight data-icon="inline-end" /></button></div></div></article> }

function EntrepreneurView() { return <div className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-10"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div className="max-w-xl"><p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">Panel de emprendimiento</p><h2 className="text-3xl font-black tracking-tight">Convierte tu talento en oportunidades.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-primary-foreground/70">Administra tus publicaciones, recibe pedidos y haz crecer tu emprendimiento dentro de la comunidad UNJBG.</p></div><button className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground"><Sparkles data-icon="inline-start" />Crear publicación</button></div><div className="mt-10 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-primary-foreground/10 p-4"><p className="text-xs text-primary-foreground/60">Ventas este mes</p><p className="mt-2 text-2xl font-black">S/ 1,280</p></div><div className="rounded-2xl bg-primary-foreground/10 p-4"><p className="text-xs text-primary-foreground/60">Visitas al perfil</p><p className="mt-2 text-2xl font-black">842</p></div><div className="rounded-2xl bg-primary-foreground/10 p-4"><p className="text-xs text-primary-foreground/60">Valoración</p><p className="mt-2 text-2xl font-black">4.9 <Star className="inline fill-current text-accent" data-icon="inline-start" /></p></div></div></div> }

function SellerDialog({ product, onClose }: { product: Product; onClose: () => void }) { const [tab, setTab] = useState('Catálogo'); return <div className="fixed inset-0 z-30 flex items-end justify-center bg-primary/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Perfil de ${product.seller}`} onClick={onClose}><div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-border p-5"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-full bg-accent/20 font-bold text-accent-foreground">{product.seller.split(' ').map((word) => word[0]).join('').slice(0, 2)}</div><div><p className="font-bold text-primary">{product.seller}</p><p className="text-xs text-muted-foreground">Emprendimiento verificado</p></div></div><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X data-icon="inline-start" /></button></div><div className="p-5"><div className="mb-5 flex items-center gap-4"><div className="flex items-center gap-1 text-sm font-bold text-accent-foreground"><Star className="fill-current" data-icon="inline-start" />4.9</div><span className="text-sm text-muted-foreground">18 reseñas</span><span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><MapPin data-icon="inline-start" />Campus UNJBG</span></div><div className="mb-5 flex gap-2 border-b border-border">{['Catálogo', 'Promociones', 'Horarios', 'Reseñas'].map((item) => <button key={item} onClick={() => setTab(item)} className={`border-b-2 px-2 pb-3 text-xs font-bold ${tab === item ? 'border-accent text-primary' : 'border-transparent text-muted-foreground'}`}>{item}</button>)}</div>{tab === 'Catálogo' && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted p-4"><p className="text-sm font-bold">{product.name}</p><p className="mt-2 font-black text-primary">{product.price}</p></div><div className="rounded-xl bg-muted p-4"><p className="text-sm font-bold">Pedidos personalizados</p><p className="mt-2 text-xs text-muted-foreground">Consulta disponibilidad por mensaje.</p></div></div>}{tab === 'Promociones' && <div className="rounded-xl bg-accent/15 p-4"><p className="font-bold text-accent-foreground">Promo para estudiantes</p><p className="mt-1 text-sm text-muted-foreground">10% de descuento en tu segunda compra.</p></div>}{tab === 'Horarios' && <div className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm"><CalendarDays className="text-accent" data-icon="inline-start" /><span><b>Lunes a viernes</b><br /><span className="text-muted-foreground">10:00 a.m. — 6:00 p.m.</span></span></div>}{tab === 'Reseñas' && <div className="rounded-xl bg-muted p-4 text-sm"><p className="font-bold">“Excelente atención y entrega rápida.”</p><p className="mt-2 text-xs text-muted-foreground">— Camila, estudiante de Ingeniería</p></div>}<button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><MessageCircle data-icon="inline-start" />Contactar emprendimiento</button></div></div></div> }
