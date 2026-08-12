'use client'

import { create } from 'zustand'
import { FileNode, GitHubRepo } from '@/types'

interface SelectedRepo {
  owner: string
  repo: string
  fullName: string
}

interface TreeState {
  tree: FileNode[]
  selectedRepo: SelectedRepo | null
  allRepos: GitHubRepo[]
  isLoadingTree: boolean
  isLoadingRepos: boolean
  fetchRepos: () => Promise<void>
  selectRepo: (repo: GitHubRepo) => Promise<void>
  fetchTree: () => Promise<void>
  refreshTree: () => Promise<void>
  restoreRepo: () => Promise<void>
  moveNode: (oldPath: string, newPath: string) => void
}

export const useTreeStore = create<TreeState>((set, get) => ({
  tree: [],
  selectedRepo: null,
  allRepos: [],
  isLoadingTree: false,
  isLoadingRepos: false,

  fetchRepos: async () => {
    set({ isLoadingRepos: true })
    try {
      const res = await fetch('/api/repos')
      if (res.ok) {
        const { repos } = await res.json()
        set({ allRepos: repos })
      }
    } finally {
      set({ isLoadingRepos: false })
    }
  },

  selectRepo: async (repo: GitHubRepo) => {
    const [owner, repoName] = repo.full_name.split('/')
    await fetch('/api/repo/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo: repoName }),
    })
    set({
      selectedRepo: { owner, repo: repoName, fullName: repo.full_name },
      tree: [],
    })
    await get().fetchTree()
  },

  /** Read the previously saved repo from the cookie (via API) and restore state */
  restoreRepo: async () => {
    try {
      const res = await fetch('/api/repo/select')
      if (!res.ok) return
      const { repo } = await res.json()
      if (!repo) return
      const fullName = `${repo.owner}/${repo.repo}`
      set({ selectedRepo: { owner: repo.owner, repo: repo.repo, fullName } })
      await get().fetchTree()
    } catch {
      // no saved repo
    }
  },

  fetchTree: async () => {
    set({ isLoadingTree: true })
    try {
      const res = await fetch('/api/tree')
      if (res.ok) {
        const { tree } = await res.json()
        set({ tree })
        const { useSearchStore } = await import('@/store/searchStore')
        useSearchStore.getState().indexTree(tree)
      }
    } catch {
      set({ tree: [] })
    } finally {
      set({ isLoadingTree: false })
    }
  },

  refreshTree: async () => {
    // Silent refresh — do NOT set isLoadingTree so FileTree stays mounted
    // and the expanded-folder state is preserved in the component
    try {
      const res = await fetch('/api/tree')
      if (res.ok) {
        const { tree } = await res.json()
        set({ tree })
        const { useSearchStore } = await import('@/store/searchStore')
        useSearchStore.getState().indexTree(tree)
      }
    } catch {
      /* ignore refresh errors silently */
    }
  },

  moveNode: (oldPath: string, newPath: string) => {
    set(state => {
      const newTree = JSON.parse(JSON.stringify(state.tree)) as FileNode[]

      const removeFromTree = (nodes: FileNode[]): FileNode | null => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].path === oldPath) {
            return nodes.splice(i, 1)[0]
          }
          if (nodes[i].children) {
            const found = removeFromTree(nodes[i].children!)
            if (found) return found
          }
        }
        return null
      }
      const nodeToMove = removeFromTree(newTree)

      if (!nodeToMove) return state // Should not happen

      nodeToMove.path = newPath
      nodeToMove.name = newPath.split('/').pop()!

      const updateChildrenPaths = (node: FileNode, basePath: string) => {
        if (node.children) {
          node.children.forEach(child => {
            child.path = `${basePath}/${child.name}`
            updateChildrenPaths(child, child.path)
          })
        }
      }
      updateChildrenPaths(nodeToMove, nodeToMove.path)

      const pathParts = newPath.split('/')
      const parentPath = pathParts.slice(0, pathParts.length - 1).join('/')

      if (!parentPath) {
        newTree.push(nodeToMove)
      } else {
        const addToTree = (nodes: FileNode[]) => {
          for (const n of nodes) {
            if (n.path === parentPath) {
              if (!n.children) n.children = []
              n.children.push(nodeToMove!)
              return true
            }
            if (n.children && addToTree(n.children)) return true
          }
          return false
        }
        addToTree(newTree)
      }

      const sortTree = (nodes: FileNode[]) => {
        nodes.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        nodes.forEach(n => {
          if (n.children) sortTree(n.children)
        })
      }
      sortTree(newTree)

      return { tree: newTree }
    })
  },
}))
