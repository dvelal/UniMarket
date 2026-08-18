import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'
import { Resend } from 'resend' // 1. Importas Resend

const resend = new Resend(process.env.RESEND_API_KEY) // Instancia del cliente de correo

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ?? 'http://localhost:3000'),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },
  // 4. Configuración del flujo de envío de correo
  emailVerification: {
    sendOnSignUp: true, // Envía el correo inmediatamente al hacer submit en el registro
    sendVerificationEmail: async ({ user, url, token }) => {
      // url contiene el enlace de verificación con el token listo (ej: http://localhost:3000/api/auth/verify-email?token=...)
      await resend.emails.send({
        from: 'UniMarket <onboarding@resend.dev>', // Dominio de pruebas de Resend
        to: user.email,
        subject: 'Verifica tu cuenta en UniMarket',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>¡Bienvenido a UniMarket, ${user.name}!</h2>
            <p>Por favor, confirma tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
            <a href="${url}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
              Verificar mi correo
            </a>
          </div>
        `,
      })
    },
  },
  trustedOrigins: [
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          // In dev (v0 preview iframe), force cross-site cookies so the
          // session cookie is stored by the browser.
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
