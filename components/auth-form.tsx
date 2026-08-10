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

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl items-center justify-center gap-12">
        <section className="hidden max-w-sm flex-col gap-5 lg:flex">
          <Link href="/" className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Mercado UNJBG
          </Link>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
            Tu comunidad universitaria, en un solo lugar.
          </h1>
          <p className="text-pretty leading-6 text-muted-foreground">
            Compra, vende y descubre emprendimientos de estudiantes de la Universidad Nacional Jorge Basadre Grohmann.
          </p>
        </section>

        <Card className="w-full max-w-md border-border/70 bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
        <div className="mb-6 flex flex-col gap-2">
          <Link href="/" className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary lg:hidden">
            Mercado UNJBG
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
      </Card>
      </div>
    </main>
  )
}
