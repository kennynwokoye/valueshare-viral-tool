import { GET as trackGET } from '@/app/api/track/[code]/route'

// Next.js requires runtime/dynamic to be declared as literals (cannot be re-exported).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  return trackGET(request, { params })
}
