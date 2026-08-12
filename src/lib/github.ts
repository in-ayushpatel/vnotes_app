import { FileNode, GitHubUser, GitHubRepo } from '@/types'
import { cookies } from 'next/headers'
import { isSupportedTextPath } from '@/lib/fileTypes'

const GITHUB_API = 'https://api.github.com'

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('gh_token')?.value ?? null
}

export async function getSelectedRepo(): Promise<{ owner: string; repo: string } | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('selected_repo')?.value
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function githubFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  const res = await githubFetch('/user', token)
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}

export async function getUserRepos(token: string): Promise<GitHubRepo[]> {
  const res = await githubFetch('/user/repos?per_page=100&sort=updated&visibility=all', token)
  if (!res.ok) throw new Error('Failed to fetch repos')
  return res.json()
}

export async function getRepoTree(
  token: string,
  owner: string,
  repo: string
): Promise<FileNode[]> {
  // Get repo info (default branch)
  const branchRes = await githubFetch(`/repos/${owner}/${repo}`, token)
  if (!branchRes.ok) throw new Error('Failed to fetch repo info')
  const repoData = await branchRes.json()
  const defaultBranch = repoData.default_branch

  // An empty repo has no commits → no default branch SHA → tree API returns 409
  if (!defaultBranch) return []

  // Get the full tree recursively
  const treeRes = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    token
  )

  // 409 = empty repo (no commits yet), 404 = branch doesn't exist yet
  if (treeRes.status === 409 || treeRes.status === 404) return []
  if (!treeRes.ok) throw new Error(`Failed to fetch tree (${treeRes.status})`)

  const treeData = await treeRes.json()

  const repoItems = treeData.tree as Array<{ path: string; type: string; sha: string }>
  const includedPaths = new Set<string>()

  const includeWithAncestors = (path: string) => {
    const parts = path.split('/')
    for (let i = 1; i <= parts.length; i++) {
      includedPaths.add(parts.slice(0, i).join('/'))
    }
  }

  for (const item of repoItems) {
    const isHiddenImagePath = item.path === 'notes/.images' || item.path.startsWith('notes/.images/')
    const isSupportedFile = item.type === 'blob' && isSupportedTextPath(item.path)
    const isNoteFolder = item.type === 'tree' && (item.path === 'notes' || item.path.startsWith('notes/'))

    if (!isHiddenImagePath && (isSupportedFile || isNoteFolder)) {
      includeWithAncestors(item.path)
    }
  }

  const items = repoItems.filter((item) => includedPaths.has(item.path))

  return buildTree(items)
}

function buildTree(items: Array<{ path: string; type: string; sha: string }>): FileNode[] {
  const root: FileNode[] = []
  const nodeMap = new Map<string, FileNode>()

  // Sort: folders first, then files
  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1
    return a.path.localeCompare(b.path)
  })

  for (const item of sorted) {
    const parts = item.path.split('/')
    const name = parts[parts.length - 1]
    const node: FileNode = {
      name,
      path: item.path,
      type: item.type === 'tree' ? 'folder' : 'file',
      sha: item.sha,
      children: item.type === 'tree' ? [] : undefined,
    }

    if (parts.length === 1) {
      root.push(node)
      nodeMap.set(item.path, node)
    } else {
      const parentPath = parts.slice(0, parts.length - 1).join('/')
      const parent = nodeMap.get(parentPath)
      if (parent && parent.children) {
        parent.children.push(node)
      }
      nodeMap.set(item.path, node)
    }
  }

  return root
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; sha: string }> {
  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token)
  if (!res.ok) throw new Error('Failed to fetch file')
  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return { content, sha: data.sha }
}

export async function updateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ sha: string }> {
  const encoded = Buffer.from(content, 'utf-8').toString('base64')

  // If no SHA provided, try to get it
  let fileSha = sha
  if (!fileSha) {
    try {
      const existing = await getFileContent(token, owner, repo, path)
      fileSha = existing.sha
    } catch {
      // File doesn't exist yet, that's fine
    }
  }

  const body: Record<string, string> = {
    message,
    content: encoded,
  }
  if (fileSha) body.sha = fileSha

  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Failed to update file')
  }

  const data = await res.json()
  return { sha: data.content.sha }
}

export async function deleteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  message: string,
  sha: string
): Promise<void> {
  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Failed to delete file')
  }
}

export async function uploadBinary(
  token: string,
  owner: string,
  repo: string,
  path: string,
  base64Content: string,
  message: string
): Promise<{ sha: string }> {
  // raw base64 content must NOT be utf-8 encoded again
  const body = { message, content: base64Content }

  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Failed to upload binary file')
  }

  const data = await res.json()
  return { sha: data.content.sha }
}

export async function getImageDownloadUrl(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  try {
    // Encode path segments to handle special characters/spaces
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    const res = await githubFetch(`/repos/${owner}/${repo}/contents/${encodedPath}`, token)
    if (!res.ok) {
      const err = await res.json()
      console.error(`[github] getImageDownloadUrl failed for ${path}:`, res.status, err)
      throw new Error(`Failed to fetch image metadata: ${res.status} ${err.message || ''}`)
    }
    const data = await res.json()
    if (!data.download_url) throw new Error('No download URL available')
    return data.download_url
  } catch (err) {
    console.error(`[github] getImageDownloadUrl error for ${path}:`, err)
    throw err
  }
}

export async function moveFileOrFolder(
  token: string,
  owner: string,
  repo: string,
  oldPath: string,
  newPath: string,
  type: 'file' | 'folder',
  sha: string
): Promise<void> {
  // 1. Get branch ref
  const refRes = await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/main`, token)
  if (!refRes.ok) throw new Error('Failed to get branch ref')
  const refData = await refRes.json()
  const currentCommitSha = refData.object.sha

  // 2. Get the current commit for its tree SHA
  const commitRes = await githubFetch(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`, token)
  if (!commitRes.ok) throw new Error('Failed to get current commit')
  const commitData = await commitRes.json()
  const baseTreeSha = commitData.tree.sha

  // 3. Post a new tree with the moved nodes (null sha deletes from the tree)
  const treePayload = {
    base_tree: baseTreeSha,
    tree: [
      {
        path: newPath,
        mode: type === 'folder' ? '040000' : '100644',
        type: type === 'folder' ? 'tree' : 'blob',
        sha: sha
      },
      {
        path: oldPath,
        mode: type === 'folder' ? '040000' : '100644',
        type: type === 'folder' ? 'tree' : 'blob',
        sha: null
      }
    ]
  }

  const treeRes = await githubFetch(`/repos/${owner}/${repo}/git/trees`, token, {
    method: 'POST',
    body: JSON.stringify(treePayload)
  })
  if (!treeRes.ok) throw new Error('Failed to create new tree')
  const treeData2 = await treeRes.json()
  const newTreeSha = treeData2.sha

  // 4. Create new commit pointing to the new tree
  const commitPayload = {
    message: `Move ${oldPath} to ${newPath}`,
    tree: newTreeSha,
    parents: [currentCommitSha]
  }
  const newCommitRes = await githubFetch(`/repos/${owner}/${repo}/git/commits`, token, {
    method: 'POST',
    body: JSON.stringify(commitPayload)
  })
  if (!newCommitRes.ok) throw new Error('Failed to create commit')
  const newCommitData = await newCommitRes.json()
  const newCommitSha = newCommitData.sha

  // 5. Update branch pointer
  const updateRefRes = await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/main`, token, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommitSha })
  })
  if (!updateRefRes.ok) throw new Error('Failed to update branch ref')
}

export async function deleteNode(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<void> {
  const refRes = await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/main`, token)
  if (!refRes.ok) throw new Error('Failed to get branch ref')
  const refData = await refRes.json()
  const currentCommitSha = refData.object.sha

  const commitRes = await githubFetch(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`, token)
  if (!commitRes.ok) throw new Error('Failed to get current commit')
  const commitData = await commitRes.json()
  const baseTreeSha = commitData.tree.sha

  const treePayload = {
    base_tree: baseTreeSha,
    tree: [
      {
        path: path,
        mode: '100644', // Type and mode are technically ignored when sha is null, but we provide it for schema safety
        type: 'blob',
        sha: null
      }
    ]
  }

  const treeRes = await githubFetch(`/repos/${owner}/${repo}/git/trees`, token, {
    method: 'POST',
    body: JSON.stringify(treePayload)
  })
  if (!treeRes.ok) throw new Error('Failed to create new tree for deletion')
  const treeData2 = await treeRes.json()
  const newTreeSha = treeData2.sha

  const commitPayload = {
    message: `Delete ${path}`,
    tree: newTreeSha,
    parents: [currentCommitSha]
  }
  const newCommitRes = await githubFetch(`/repos/${owner}/${repo}/git/commits`, token, {
    method: 'POST',
    body: JSON.stringify(commitPayload)
  })
  if (!newCommitRes.ok) throw new Error('Failed to create commit for deletion')
  const newCommitData = await newCommitRes.json()
  const newCommitSha = newCommitData.sha

  const updateRefRes = await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/main`, token, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommitSha })
  })
  if (!updateRefRes.ok) throw new Error('Failed to update branch ref for deletion')
}
