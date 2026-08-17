'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  
  // 🟢 Estado para controlar si ya se envió el formulario de registro
  const [isSubmitted, setIsSubmitted] = useState(false)
  // 🟢 Estados para el reenvío de correo
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  
  const isSignUp = mode === 'sign-up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? 'Something went wrong')
      return
    }

    if (isSignUp) {
      // 🟢 En modo Sign Up, mostramos la pantalla de confirmación de correo
      setIsSubmitted(true)
    } else {
      // En modo Sign In, redirigimos al inicio
      router.push('/')
      router.refresh()
    }
  }
  // 🟢 Función para solicitar un nuevo enlace de verificación
  const handleResendEmail = async () => {
    setResending(true)
    setResendMessage(null)

    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/',
    })

    setResending(false)

    if (error) {
      setResendMessage('Error al reenviar. Intenta nuevamente.')
    } else {
      setResendMessage('¡Correo reenviado con éxito! Revisa tu bandeja.')
    }
  }

 return (
    <main className="min-h-svh bg-muted/30 px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl items-center justify-center gap-12">
        <section className="hidden max-w-sm flex-col gap-5 lg:flex">
          <Link href="/" className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-primary">
            UniMarket
          </Link>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
            Tu comunidad universitaria, en un solo lugar.
          </h1>
          <p className="text-pretty leading-6 text-muted-foreground">
            Compra, vende y descubre emprendimientos de estudiantes de la Universidad Nacional Jorge Basadre Grohmann.
          </p>
        </section>

        <Card className="w-full max-w-md border-border/70 bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
          {isSignUp && isSubmitted ? (
            <div className="flex flex-col gap-4 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Verifica tu correo
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Hemos enviado un enlace de confirmación a <strong className="text-foreground">{email}</strong>. 
                Por favor, revisa tu bandeja de entrada o la carpeta de spam para activar tu cuenta.
              </p>

              {resendMessage && (
                <p className="text-xs text-primary font-medium" role="status">
                  {resendMessage}
                </p>
              )}

              {/* 🟢 Botón de reenvío */}
              <div className="flex flex-col gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="w-full"
                >
                  {resending ? 'Reenviando...' : '¿No recibiste el correo? Reenviar'}
                </Button>

                <Link href="/sign-in" className="block w-full">
                  <Button variant="ghost" className="w-full">
                    Ir a Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Vista del formulario */
            <>
              <div className="mb-6 flex flex-col gap-2">
                <Link href="/" className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary lg:hidden">
                  UniMarket
                </Link>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {isSignUp ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {isSignUp
                    ? 'Únete al mercado estudiantil con tu correo y contraseña.'
                    : 'Ingresa para continuar explorando el mercado.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {isSignUp && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Correo institucional</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error === 'Invalid email or password' ? 'Correo o contraseña inválidos.' : error}
                  </p>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading
                    ? 'Procesando...'
                    : isSignUp
                      ? 'Crear cuenta'
                      : 'Ingresar'}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isSignUp ? '¿Ya tienes una cuenta? ' : '¿Aún no tienes una cuenta? '}
                <Link
                  href={isSignUp ? '/sign-in' : '/sign-up'}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {isSignUp ? 'Ingresa' : 'Crea una cuenta'}
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}