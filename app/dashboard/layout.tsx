import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { notification } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { desc, eq } from 'drizzle-orm'
import DashboardHeader from '@/components/dashboard-header'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  
  let notifications: typeof notification.$inferSelect[] = []
  if (session?.user) {
    notifications = await db
      .select()
      .from(notification)
      .where(eq(notification.userId, session.user.id))
      .orderBy(desc(notification.createdAt))
      .limit(50)
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <Toaster />
      <DashboardHeader notifications={notifications} />
      {children}
    </div>
  )
}
