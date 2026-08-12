import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, getSelectedRepo, moveFileOrFolder } from '@/lib/github'
import { isMarkdownPath } from '@/lib/fileTypes'

export const dynamic = 'force-dynamic'

// POST /api/file/move
export async function POST(request: NextRequest) {
  try {
    const token = await getAccessToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const repoInfo = await getSelectedRepo()
    if (!repoInfo) return NextResponse.json({ error: 'No repo selected' }, { status: 400 })

    const body = await request.json()
    const { oldPath, newPath, type, sha } = body

    if (!oldPath || !newPath || !type || !sha) {
      return NextResponse.json({ error: 'oldPath, newPath, type, and sha are required' }, { status: 400 })
    }
    if (type === 'file' && (!isMarkdownPath(oldPath) || !isMarkdownPath(newPath))) {
      return NextResponse.json({ error: 'Read-only files cannot be moved or renamed' }, { status: 403 })
    }

    await moveFileOrFolder(
      token,
      repoInfo.owner,
      repoInfo.repo,
      oldPath,
      newPath,
      type,
      sha
    )

    return NextResponse.json({ success: true, oldPath, newPath })
  } catch (err) {
    console.error('/api/file/move POST error:', err)
    const message = err instanceof Error ? err.message : 'Failed to move file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
