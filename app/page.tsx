import { auth } from '@/lib/auth'
import { getListings } from '@/app/actions/listings'
import { MarketplaceDashboard } from '@/components/marketplace-dashboard'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  const listings = await getListings()

  return <MarketplaceDashboard listings={listings} />
}
