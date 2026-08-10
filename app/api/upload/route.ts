import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen debe ser JPG, PNG o WebP y pesar máximo 5 MB.' }, { status: 400 })
  }

  const blob = await put(`listings/${session.user.id}/${crypto.randomUUID()}-${file.name}`, file, { access: 'private' })
  return NextResponse.json({ pathname: blob.pathname })
}
