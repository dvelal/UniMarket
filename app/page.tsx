import { auth } from '@/lib/auth'
import { getListings } from '@/app/actions/listings'
import { getEngagement, getNotifications, getReviews } from '@/app/actions/engagement'
import { MarketplaceDashboard } from '@/components/marketplace-dashboard'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  const listings = await getListings()
  const [engagement, notifications, reviewGroups] = await Promise.all([
    getEngagement(listings.map((listing) => listing.id), session.user.id),
    getNotifications(session.user.id),
    Promise.all(listings.map(async (listing) => [listing.id, await getReviews(listing.id)] as const)),
  ])
  const reviews = Object.fromEntries(reviewGroups)

  return <MarketplaceDashboard listings={listings} engagement={engagement} notifications={notifications} reviews={reviews} />
}
