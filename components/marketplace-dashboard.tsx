"use client";

import { useState, useTransition, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  createListing,
  deleteListing,
  toggleListingStatus,
  updateListing,
  getFavoriteListingIds,
} from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  LogOut,
  MapPin,
  Store,
  Heart,
  Star,
  Bell,
} from "lucide-react";
import {
  toggleFavorite,
  addReview,
  updateReview,
  deleteReview,
  respondToReview,
  editReviewResponse,
  deleteReviewResponse,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/actions/engagement";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  location: string;
  imagePath: string | null;
  status: string;
  createdAt: Date;
  publisherName: string;
  publisherId: string;
  serviceDays: string;
  serviceStart: string;
  serviceEnd: string;
};
type Engagement = {
  listingId: string;
  isFavorite: boolean;
  averageRating: number;
  reviewCount: number;
};
type Review = {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  createdAt: Date;
  authorId: string;
  authorName: string;
};
type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  listingId: string | null;
  reviewId: string | null;
  readAt: Date | null;
  createdAt: Date;
};
const categories = [
  "Todo",
  "Comida",
  "Servicios",
  "Tecnología",
  "Moda",
  "Mis Favoritos",
  "Otros",
];
const serviceDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function MarketplaceDashboard({
  listings,
  engagement,
  notifications,
  reviews,
}: {
  listings: Listing[];
  engagement: Engagement[];
  notifications: Notification[];
  reviews: Record<string, Review[]>;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"consumer" | "seller">(
    "consumer",
  );
  const [category, setCategory] = useState("Todo");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [reviewing, setReviewing] = useState<Listing | null>(null);
  const [viewingReviews, setViewingReviews] = useState<Listing | null>(null);
  const [details, setDetails] = useState<Listing | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderListing, setOrderListing] = useState<Listing | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [orderPhone, setOrderPhone] = useState<string>((session?.user as any)?.phone ?? '');
  const [orderNote, setOrderNote] = useState<string>('');
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [respondingTo, setRespondingTo] = useState<Review | null>(null);
  const [editingResponse, setEditingResponse] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  // 1. Obtenemos un Set con los IDs de las publicaciones marcadas como favoritas
const favoriteIds = new Set(
  engagement.filter((e) => e.isFavorite).map((e) => e.listingId)
)

// 2. Filtramos el catálogo según la categoría elegida y el buscador
const filtered = listings.filter((item) => {
  // Siempre debe estar activo
  if (item.status !== 'active') return false

  // Comprobar filtro por categoría
  const matchesCategory =
    category === 'Todo'
      ? true
      : category === 'Mis Favoritos'
        ? favoriteIds.has(item.id)
        : item.category === category

  // Comprobar búsqueda por texto
  const matchesQuery = `${item.title} ${item.description} ${item.location}`
    .toLowerCase()
    .includes(query.toLowerCase())

  return matchesCategory && matchesQuery
})
  /*const filtered = listings.filter(
    (item) =>
      item.status === "active" &&
      (category === "Todo" || item.category === category) &&
      `${item.title} ${item.description} ${item.location}`
        .toLowerCase()
        .includes(query.toLowerCase()));
  */  
  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        const image = formData.get("image");
        if (image instanceof File && image.size > 0) {
          const upload = new FormData();
          upload.append("file", image);
          const response = await fetch("/api/upload", {
            method: "POST",
            body: upload,
          });
          if (!response.ok) throw new Error("No se pudo subir la imagen.");
          const payload = await response.json();
          if (!payload.pathname)
            throw new Error("La imagen no devolvió una ruta válida.");
          formData.set("imagePath", payload.pathname);
        }
        await createListing(formData);
        setOpen(false);
        toast.success("Publicación creada con éxito");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo crear la publicación.",
        );
      }
    });
  }

  function submitEdit(formData: FormData) {
    if (!editing) return;
    startTransition(async () => {
      try {
        const image = formData.get("image");
        if (image instanceof File && image.size > 0) {
          const upload = new FormData();
          upload.append("file", image);
          const response = await fetch("/api/upload", {
            method: "POST",
            body: upload,
          });
          if (!response.ok) throw new Error("No se pudo subir la imagen.");
          const payload = await response.json();
          if (!payload.pathname)
            throw new Error("La imagen no devolvió una ruta válida.");
          formData.set("imagePath", payload.pathname);
        }
        await updateListing(editing.id, formData);
        setEditing(null);
        toast.success("Publicación actualizada con éxito");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la publicación.",
        );
      }
    });
  }

  function removeListing(id: string) {
    if (!window.confirm("¿Eliminar esta publicación permanentemente?")) return;
    startTransition(async () => {
      try {
        await deleteListing(id);
        toast.success("Publicación eliminada");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la publicación.",
        );
      }
    });
  }

  function engagementFor(id: string) {
    return (
      engagement.find((item) => item.listingId === id) ?? {
        listingId: id,
        isFavorite: false,
        averageRating: 0,
        reviewCount: 0,
      }
    );
  }

  function submitReviewEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingReview) return;
    startTransition(async () => {
      try {
        await updateReview(editingReview.id, rating, comment);
        setEditingReview(null);
        setComment("");
        router.refresh();
        toast.success("Reseña actualizada con éxito");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la reseña.",
        );
      }
    });
  }

  function confirmDeleteReview() {
    if (!deletingReview) return;
    startTransition(async () => {
      try {
        await deleteReview(deletingReview.id);
        setDeletingReview(null);
        router.refresh();
        toast.success("Reseña eliminada con éxito");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la reseña.",
        );
      }
    });
  }

  function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!reviewing) return;
    startTransition(async () => {
      try {
        await addReview(reviewing.id, rating, comment);
        setReviewing(null);
        setComment("");
        router.refresh();
        toast.success("Reseña publicada con éxito");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo publicar la reseña.",
        );
      }
    });
  }

  const [notificationsState, setNotificationsState] = useState<Notification[]>(notifications);
  const unreadCount = notificationsState.filter((item) => !item.readAt).length;
  const ownListings = listings.filter(
    (item) => item.publisherId === session?.user?.id,
  );
  const activeListings = ownListings.filter(
    (item) => item.status !== "paused",
  ).length;
  const sellerReviews = ownListings.flatMap((item) => reviews[item.id] ?? []);
  const sellerAverage = sellerReviews.length
    ? sellerReviews.reduce((sum, item) => sum + Number(item.rating), 0) /
      sellerReviews.length
    : 0;

  function notificationIcon(type: string) {
    if (type === "review")
      return <Star className="text-accent" data-icon="inline-start" />;
    if (type === "validation")
      return (
        <span aria-hidden="true" className="text-primary">
          ●
        </span>
      );
    if (type === "announcement")
      return (
        <span aria-hidden="true" className="text-accent">
          !
        </span>
      );
    return (
      <span aria-hidden="true" className="text-primary">
        •
      </span>
    );
  }

  function notificationAction(item: Notification) {
    if (item.type === "review") return "Responder";
    if (item.type === "listing") return "Ver producto";
    return "Ver detalle";
  }

  // Poll notifications every 6 seconds to show updates in near-real-time
  useEffect(() => {
    let mounted = true
    async function fetchNotes() {
      try {
        const res = await fetch('/api/notifications')
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

  return (
    <main className="min-h-svh bg-background text-foreground">
      <Toaster />
      <AlertDialog
        open={Boolean(deletingReview)}
        onOpenChange={(open) => !open && setDeletingReview(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu reseña?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Tu comentario y calificación se
              eliminarán de esta publicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={confirmDeleteReview}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              variant={activeSection === "consumer" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("consumer")}
            >
              Descubrir
            </Button>
            <Button
              type="button"
              variant={activeSection === "seller" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("seller")}
            >
              Mis anuncios
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/orders')}
            >
              Mis pedidos
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
                          await markAllNotificationsRead();
                          router.refresh();
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "No se pudieron marcar las notificaciones.",
                          );
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
                        className={`rounded-lg p-3 ${item.readAt ? "opacity-60" : "bg-primary/5"}`}
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
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="h-auto px-0 text-xs"
                                  onClick={() =>
                                    startTransition(async () => {
                                      await markNotificationRead(item.id);
                                      if (
                                        item.type === "review" &&
                                        item.listingId &&
                                        item.reviewId
                                      ) {
                                        const listing = listings.find(
                                          (l) => l.id === item.listingId,
                                        );
                                        if (listing) {
                                          setDetails(listing);
                                          const reviewsForListing =
                                            reviews[item.listingId];
                                          const reviewToRespond =
                                            reviewsForListing?.find(
                                              (r) => r.id === item.reviewId,
                                            );
                                          if (reviewToRespond)
                                            setRespondingTo(reviewToRespond);
                                        }
                                      }
                                      router.refresh();
                                    })
                                  }
                                >
                                  {notificationAction(item)}
                                </Button>
                                {!item.readAt ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto px-1 text-xs"
                                    onClick={() =>
                                      startTransition(async () => {
                                        await markNotificationRead(item.id);
                                        router.refresh();
                                      })
                                    }
                                  >
                                    Leída
                                  </Button>
                                ) : null}
                              </div>
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
                await authClient.signOut();
                router.push("/sign-in");
                router.refresh();
              }}
            >
              <LogOut data-icon="inline-start" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <Dialog
        open={Boolean(details)}
        onOpenChange={(value) => !value && setDetails(null)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto border-border/80 bg-card shadow-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{details?.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Detalles de la publicación
            </p>
          </DialogHeader>
          {details ? (
            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-3" variant="line">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="reviews">Reseñas</TabsTrigger>
                <TabsTrigger value="profile">Validación / Perfil</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="flex flex-col gap-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {session?.user?.id === details.publisherId ? (
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => {
                        setEditing(details);
                        setDetails(null);
                      }}
                    >
                      Editar esta publicación
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={() => {
                          setRating(5);
                          setComment("");
                          setReviewing(details);
                        }}
                      >
                        Calificar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setOrderListing(details);
                          setOrderQuantity(1);
                          setOrderPhone((session?.user as any)?.phone ?? '');
                          setOrderNote('');
                          setOrderOpen(true);
                        }}
                      >
                        Solicitar pedido
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          toast.info(
                            `Puedes contactar a ${details.publisherName} desde el chat.`,
                          )
                        }
                      >
                        Contactar vendedor
                      </Button>
                    </>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Descripción
                    </p>
                    <p className="text-sm leading-6">{details.description}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Entrega
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin data-icon="inline-start" />
                      {details.location}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Atiende{" "}
                      {JSON.parse(details.serviceDays || "[]").join(", ")} ·{" "}
                      {details.serviceStart}–{details.serviceEnd}
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="reviews" className="flex flex-col gap-3 py-4">
                <p className="text-sm text-muted-foreground">
                  Gestiona las opiniones de tu comunidad y responde cuando sea
                  necesario.
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-border/70 p-4">
                  <Star
                    className="fill-accent text-accent"
                    data-icon="inline-start"
                  />
                  <span className="font-semibold">
                    {engagementFor(details.id).averageRating
                      ? engagementFor(details.id).averageRating.toFixed(1)
                      : "Sin calificaciones"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({engagementFor(details.id).reviewCount} reseñas)
                  </span>
                </div>
                {reviews[details.id]?.length ? (
                  reviews[details.id].map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-border/70 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {review.authorName}
                          </p>
                          {review.authorId === session?.user?.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto px-1"
                                onClick={() => {
                                  setRating(Number(review.rating));
                                  setComment(review.comment ?? "");
                                  setEditingReview(review);
                                }}
                                aria-label="Editar mi reseña"
                              >
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto px-1 text-destructive"
                                onClick={() => setDeletingReview(review)}
                                aria-label="Eliminar mi reseña"
                              >
                                Eliminar
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        <time className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("es-PE", {
                            dateStyle: "medium",
                          }).format(new Date(review.createdAt))}
                        </time>
                      </div>
                      <div className="my-2 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`size-4 ${star <= Number(review.rating) ? "fill-accent text-accent" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {review.comment || "Sin comentario."}
                      </p>
                      {review.response ? (
                        <div className="mt-3 border-l-2 border-primary/50 bg-primary/5 p-3">
                          <p className="text-xs font-semibold text-primary">
                            Respuesta del vendedor
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {review.response}
                          </p>
                          {session?.user?.id === details?.publisherId ? (
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto px-2 text-xs"
                                onClick={() => {
                                  setEditingResponse(review);
                                  setResponseText(review.response || "");
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto px-2 text-xs text-destructive"
                                onClick={() =>
                                  startTransition(async () => {
                                    try {
                                      await deleteReviewResponse(review.id);
                                      toast.success("Respuesta eliminada");
                                      router.refresh();
                                    } catch (error) {
                                      toast.error(
                                        error instanceof Error
                                          ? error.message
                                          : "Error al eliminar",
                                      );
                                    }
                                  })
                                }
                              >
                                Eliminar
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : session?.user?.id === details?.publisherId ? (
                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setRespondingTo(review);
                              setResponseText("");
                            }}
                          >
                            Responder esta reseña
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Todavía no hay reseñas.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="profile" className="flex flex-col gap-4 py-4">
                <div className="flex items-start gap-4 rounded-xl border border-border/70 p-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Store />
                  </div>
                  <div>
                    <p className="font-semibold">{details.publisherName}</p>
                    <p className="text-sm text-muted-foreground">
                      Estudiante de la comunidad UNJBG
                    </p>
                    <Badge className="mt-3" variant="secondary">
                      Estudiante verificado
                    </Badge>
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Perfil validado mediante la cuenta institucional de UniMarket.
                </p>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={orderOpen} onOpenChange={(v) => !v && setOrderOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar pedido</DialogTitle>
            <p className="text-sm text-muted-foreground">Confirma los datos de tu pedido</p>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  if (!orderListing) throw new Error('Publicación inválida')
                  const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      listingId: orderListing.id,
                      quantity: orderQuantity,
                      buyerPhone: orderPhone,
                      buyerNote: orderNote,
                    }),
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data?.error || 'Error al crear pedido')
                  setOrderOpen(false)
                  toast.success('Pedido enviado al vendedor')
                  try {
                    const r2 = await fetch('/api/notifications')
                    if (r2.ok) {
                      const notes: Notification[] = await r2.json()
                      setNotificationsState(notes)
                    }
                  } catch (e) {
                    // ignore
                  }
                  router.refresh()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Error')
                }
              })
            }}
          >
            <div className="grid gap-3">
              <div>
                <Label>Cantidad</Label>
                <Input type="number" min={1} value={orderQuantity} onChange={(e) => setOrderQuantity(Math.max(1, Number(e.target.value || 1)))} />
              </div>
              <div>
                <Label>Teléfono / WhatsApp</Label>
                <Input value={orderPhone} onChange={(e) => setOrderPhone(e.target.value)} required />
              </div>
              <div>
                <Label>Nota (opcional)</Label>
                <Textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-semibold">S/ {orderListing ? (Number(orderListing.price) * orderQuantity).toFixed(2) : '0.00'}</p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>Confirmar Pedido</Button>
                <Button type="button" variant="ghost" onClick={() => setOrderOpen(false)} disabled={pending}>Cancelar</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingReview)}
        onOpenChange={(value) => !value && setEditingReview(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar reseña</DialogTitle>
          </DialogHeader>
          {editingReview ? (
            <form onSubmit={submitReviewEdit} className="flex flex-col gap-4">
              <div
                className="flex justify-center gap-1"
                aria-label="Actualiza tu calificación"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`${value} estrellas`}
                    onClick={() => setRating(value)}
                  >
                    <Star
                      className={
                        value <= rating
                          ? "fill-accent text-accent"
                          : "text-muted-foreground"
                      }
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={500}
                placeholder="Comentario opcional"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingReview(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(respondingTo)}
        onOpenChange={(value) => !value && setRespondingTo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder reseña</DialogTitle>
          </DialogHeader>
          {respondingTo ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  try {
                    await respondToReview(respondingTo.id, responseText);
                    toast.success("Respuesta enviada");
                    setRespondingTo(null);
                    setResponseText("");
                    router.refresh();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Error al responder",
                    );
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <Textarea
                placeholder="Escribe tu respuesta..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                maxLength={500}
                required
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRespondingTo(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={pending || !responseText.trim()}
                >
                  {pending ? "Enviando..." : "Responder"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingResponse)}
        onOpenChange={(value) => !value && setEditingResponse(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar respuesta</DialogTitle>
          </DialogHeader>
          {editingResponse ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  try {
                    await editReviewResponse(editingResponse.id, responseText);
                    toast.success("Respuesta actualizada");
                    setEditingResponse(null);
                    setResponseText("");
                    router.refresh();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Error al actualizar",
                    );
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <Textarea
                placeholder="Edita tu respuesta..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                maxLength={500}
                required
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingResponse(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={pending || !responseText.trim()}
                >
                  {pending ? "Actualizando..." : "Guardar"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(reviewing)}
        onOpenChange={(value) => !value && setReviewing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calificar publicación</DialogTitle>
          </DialogHeader>
          {reviewing ? (
            <form onSubmit={submitReview} className="flex flex-col gap-4">
              <div
                className="flex justify-center gap-1"
                aria-label="Selecciona una calificación"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`${value} estrellas`}
                    onClick={() => setRating(value)}
                  >
                    <Star
                      className={
                        value <= rating
                          ? "fill-accent text-accent"
                          : "text-muted-foreground"
                      }
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={500}
                placeholder="Comentario opcional"
              />
              <Button type="submit" disabled={pending}>
                Publicar reseña
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(value) => !value && setEditing(null)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar publicación</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form action={submitEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={editing.title}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editing.description}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-category">Categoría</Label>
                  <select
                    id="edit-category"
                    name="category"
                    defaultValue={editing.category}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {categories.slice(1).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-price">Precio (S/.)</Label>
                  <Input
                    id="edit-price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editing.price}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-location">Punto de entrega</Label>
                <Input
                  id="edit-location"
                  name="location"
                  defaultValue={editing.location}
                  required
                />
              </div>
              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium">
                  Días de atención
                </legend>
                <div className="flex flex-wrap gap-2">
                  {serviceDays.map((day) => (
                    <label
                      key={day}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="serviceDays"
                        value={day}
                        defaultChecked={editing.serviceDays.includes(day)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-serviceStart">Desde</Label>
                    <Input
                      id="edit-serviceStart"
                      name="serviceStart"
                      type="time"
                      defaultValue={editing.serviceStart}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-serviceEnd">Hasta</Label>
                    <Input
                      id="edit-serviceEnd"
                      name="serviceEnd"
                      type="time"
                      defaultValue={editing.serviceEnd}
                      required
                    />
                  </div>
                </div>
              </fieldset>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-image">Reemplazar imagen</Label>
                <Input
                  id="edit-image"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-7 sm:px-6 lg:py-10">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4 sm:hidden">
          <Button
            type="button"
            variant={activeSection === "consumer" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveSection("consumer")}
          >
            Descubrir
          </Button>
          <Button
            type="button"
            variant={activeSection === "seller" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveSection("seller")}
          >
            Mis anuncios
          </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/orders')}
            >
              Mis pedidos
            </Button>
        </div>
        <section className="flex flex-col gap-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">
              Comunidad universitaria
            </p>
            <h1 className="text-balance text-3xl font-black tracking-tight text-primary sm:text-5xl">
              Hola, {session?.user?.name?.split(" ")[0] ?? "estudiante"}.
            </h1>
            <p className="max-w-xl text-pretty leading-6 text-muted-foreground">
              Encuentra productos y servicios de personas como tú.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <button
                  type="button"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              }
            />
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva publicación</DialogTitle>
              </DialogHeader>
              <form
                action={submit}
                className="flex flex-col gap-5 rounded-xl border border-border/70 bg-muted/20 p-1"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    placeholder="Ej. Brownies caseros"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    placeholder="Cuenta qué ofreces..."
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="category">Categoría</Label>
                    <select
                      id="category"
                      name="category"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      {categories.slice(1).map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="price">Precio (S/.)</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="location">Punto de entrega</Label>
                  <Input
                    id="location"
                    name="location"
                    required
                    placeholder="Ej. Campus UNJBG"
                  />
                </div>
                <fieldset className="flex flex-col gap-3">
                  <legend className="text-sm font-medium">
                    Días de atención
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {serviceDays.map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input type="checkbox" name="serviceDays" value={day} />
                        {day}
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="serviceStart">Desde</Label>
                      <Input
                        id="serviceStart"
                        name="serviceStart"
                        type="time"
                        defaultValue="09:00"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="serviceEnd">Hasta</Label>
                      <Input
                        id="serviceEnd"
                        name="serviceEnd"
                        type="time"
                        defaultValue="18:00"
                        required
                      />
                    </div>
                  </div>
                </fieldset>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="image">Imagen</Label>
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG o WebP. Máximo 5 MB.
                  </p>
                </div>
                <Button type="submit" disabled={pending}>
                  {pending ? "Publicando..." : "Publicar ahora"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </section>
        {activeSection === "consumer" ? (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Descubrir
              </p>
              <h2 className="text-2xl font-black tracking-tight text-primary">
                Encuentra algo que te guste
              </h2>
              <p className="text-sm text-muted-foreground">
                Compra a estudiantes de tu comunidad, sin complicaciones.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
              <div className="relative flex-1 sm:max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-icon="inline-start"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Busca comida, servicios, accesorios..."
                  className="h-11 pl-9"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={category === item ? "default" : "outline"}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                  <Store
                    className="text-muted-foreground"
                    data-icon="inline-start"
                  />
                  <CardTitle>
                    {query || category !== "Todo"
                      ? "No encontramos resultados"
                      : "Aún no hay publicaciones"}
                  </CardTitle>
                  <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                    {query || category !== "Todo"
                      ? "Prueba con otra búsqueda o cambia la categoría para descubrir más opciones."
                      : "Sé el primero en publicar algo para la comunidad UniMarket."}
                  </p>
                  {query || category !== "Todo" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setQuery("");
                        setCategory("Todo");
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => (
                  <Card
                    key={item.id}
                    className="group flex h-full min-h-[380px] flex-col justify-between overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
                  >
                    {session?.user?.id === item.publisherId ? (
                      <div className="px-4 pt-4">
                        <Badge variant="secondary">Tu publicación</Badge>
                      </div>
                    ) : null}
                    {item.imagePath ? (
                      <img
                        src={`/api/file?pathname=${encodeURIComponent(item.imagePath)}`}
                        alt={`Imagen de ${item.title}`}
                        className="aspect-video w-full object-cover"
                      />
                    ) : null}
                    <CardHeader className="gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <Badge variant="secondary">{item.category}</Badge>
                        <span className="font-mono text-lg font-black text-primary">
                          S/. {Number(item.price).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-xl">{item.title}</CardTitle>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={
                            engagementFor(item.id).isFavorite
                              ? "Quitar de favoritos"
                              : "Agregar a favoritos"
                          }
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await toggleFavorite(item.id);
                                router.refresh();
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "No se pudo actualizar favoritos.",
                                );
                              }
                            })
                          }
                        >
                          <Heart
                            className={
                              engagementFor(item.id).isFavorite
                                ? "fill-primary text-primary"
                                : ""
                            }
                          />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vendedor: {item.publisherName}
                      </p>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <div className="mt-auto">
                        <Button
                          type="button"
                          onClick={() => setDetails(item)}
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base font-bold rounded-lg transition-all shadow-md hover:shadow-lg"
                        >
                          Ver detalles
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ) : null}
        {activeSection === "seller" ? (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  Panel de vendedor
                </p>
                <h2 className="text-2xl font-black tracking-tight text-primary">
                  Mis anuncios
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Administra tu catálogo y mantén informada a tu comunidad.
                </p>
              </div>
              <Button size="lg" onClick={() => setOpen(true)}>
                <Plus data-icon="inline-start" /> Nueva publicación
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="flex flex-col gap-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Publicaciones activas
                  </p>
                  <p className="text-3xl font-black text-primary">
                    {activeListings}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Calificación promedio
                  </p>
                  <p className="text-3xl font-black text-primary">
                    {sellerAverage ? sellerAverage.toFixed(1) : "—"}{" "}
                    <span className="text-base font-medium text-muted-foreground">
                      / 5
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Consultas recibidas
                  </p>
                  <p className="text-3xl font-black text-primary">
                    {
                        notificationsState.filter((item) => item.type === "listing")
                        .length
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {ownListings.length ? (
                ownListings.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden border-border/70"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-border/50 bg-gradient-to-br from-muted to-muted/80">
                        {item.imagePath ? (
                          <img
                            src={`/api/file?pathname=${encodeURIComponent(item.imagePath)}`}
                            alt={`Imagen de ${item.title}`}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Store
                              size={28}
                              className="text-primary/70"
                              aria-hidden="true"
                            />
                            <span className="text-xs font-medium text-muted-foreground">
                              Sin imagen
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="truncate font-semibold">
                              {item.title}
                            </h3>
                            <p className="font-mono text-sm text-primary">
                              S/. {Number(item.price).toFixed(2)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              item.status === "paused" ? "outline" : "secondary"
                            }
                          >
                            {item.status === "paused" ? "Pausado" : "Activo"}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            ★{" "}
                            {engagementFor(item.id).averageRating
                              ? engagementFor(item.id).averageRating.toFixed(1)
                              : "Sin calificar"}
                          </span>
                          <span>
                            {new Intl.DateTimeFormat("es-PE", {
                              dateStyle: "medium",
                            }).format(new Date(item.createdAt))}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(item)}
                          >
                            Editar producto
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await toggleListingStatus(item.id);
                                  toast.success(
                                    item.status === "paused"
                                      ? "Publicación activada"
                                      : "Publicación pausada",
                                  );
                                  router.refresh();
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "No se pudo cambiar el estado.",
                                  );
                                }
                              })
                            }
                          >
                            {item.status === "paused" ? "Activar" : "Pausar"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => removeListing(item.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="md:col-span-2">
                  <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                    <Plus className="text-primary" />
                    <CardTitle>Aún no tienes publicaciones</CardTitle>
                    <p className="max-w-md text-sm leading-6 text-muted-foreground">
                      Crea tu primera publicación para comenzar a vender en la
                      comunidad.
                    </p>
                    <Button onClick={() => setOpen(true)}>
                      Nueva publicación
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}


