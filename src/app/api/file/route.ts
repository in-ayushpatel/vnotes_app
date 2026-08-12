import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, getSelectedRepo, getFileContent, updateFile, deleteFile } from '@/lib/github'
import { isMarkdownPath, isSupportedTextPath } from '@/lib/fileTypes'

export const dynamic = 'force-dynamic'

// GET /api/file?path=notes/...
export async function GET(request: NextRequest) {
  try {
    const token = await getAccessToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const repoInfo = await getSelectedRepo()
    if (!repoInfo) return NextResponse.json({ error: 'No repo selected' }, { status: 400 })

    const path = request.nextUrl.searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 })
    if (!isSupportedTextPath(path)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
    }

    const result = await getFileContent(token, repoInfo.owner, repoInfo.repo, path)
    return NextResponse.json(result)
  } catch (err) {
    console.error('/api/file GET error:', err)
    return NextResponse.json({ error: 'Failed to get file' }, { status: 500 })
  }
}

// PUT /api/file — update file
export async function PUT(request: NextRequest) {
  try {
    const token = await getAccessToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const repoInfo = await getSelectedRepo()
    if (!repoInfo) return NextResponse.json({ error: 'No repo selected' }, { status: 400 })

    const body = await request.json()
    const { path, content, message, sha } = body

    if (!path || content === undefined) {
      return NextResponse.json({ error: 'path and content are required' }, { status: 400 })
    }
    if (!isMarkdownPath(path)) {
      return NextResponse.json({ error: 'Only Markdown files can be saved' }, { status: 403 })
    }

    const result = await updateFile(
      token,
      repoInfo.owner,
      repoInfo.repo,
      path,
      content,
      message ?? 'update note',
      sha
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('/api/file PUT error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/file
export async function DELETE(request: NextRequest) {
  try {
    const token = await getAccessToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const repoInfo = await getSelectedRepo()
    if (!repoInfo) return NextResponse.json({ error: 'No repo selected' }, { status: 400 })

    const body = await request.json()
    const { path, message, sha } = body

    if (!path || !sha) {
      return NextResponse.json({ error: 'path and sha are required' }, { status: 400 })
    }
    if (!isMarkdownPath(path)) {
      return NextResponse.json({ error: 'Read-only files cannot be deleted' }, { status: 403 })
    }

    await deleteFile(token, repoInfo.owner, repoInfo.repo, path, message ?? 'delete note', sha)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('/api/file DELETE error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
