import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const pathname = new URL(request.url).searchParams.get('pathname')
  if (!pathname) return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 })

  const result = await get(pathname, { access: 'private' })
  if (!result) return new NextResponse('No encontrada', { status: 404 })
  return new NextResponse(result.stream, { headers: { 'Content-Type': result.blob.contentType ?? 'application/octet-stream', 'Cache-Control': 'private, no-cache' } })
}
