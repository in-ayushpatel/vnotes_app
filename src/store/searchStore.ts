'use client'

import { create } from 'zustand'
import Fuse from 'fuse.js'
import { FileNode } from '@/types'
import { getDisplayFileName } from '@/lib/fileTypes'

interface SearchResult {
  path: string
  name: string
  preview: string
}

interface SearchState {
  query: string
  results: SearchResult[]
  indexedNotes: Map<string, string>
  isOpen: boolean
  setQuery: (q: string) => void
  indexNote: (path: string, content: string) => void
  indexTree: (tree: FileNode[]) => void
  clearSearch: () => void
  openSearch: () => void
  closeSearch: () => void
}

function flattenTree(tree: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of tree) {
    if (node.type === 'file') result.push(node)
    if (node.children) result.push(...flattenTree(node.children))
  }
  return result
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  indexedNotes: new Map(),
  isOpen: false,

  setQuery: (q: string) => {
    set({ query: q })
    if (!q.trim()) {
      set({ results: [] })
      return
    }
    const { indexedNotes } = get()
    const items = Array.from(indexedNotes.entries()).map(([path, content]) => ({
      path,
      name: getDisplayFileName(path.split('/').pop() ?? path),
      content,
    }))

    const fuse = new Fuse(items, {
      keys: ['name', 'content'],
      threshold: 0.4,
      includeScore: true,
    })

    const raw = fuse.search(q).slice(0, 10)
    const results: SearchResult[] = raw.map((r) => ({
      path: r.item.path,
      name: r.item.name,
      preview: r.item.content.slice(0, 80).replace(/\n/g, ' '),
    }))
    set({ results })
  },

  indexNote: (path: string, content: string) => {
    const map = get().indexedNotes
    map.set(path, content)
    set({ indexedNotes: new Map(map) })
  },

  indexTree: (tree: FileNode[]) => {
    const files = flattenTree(tree)
    const map = get().indexedNotes
    for (const f of files) {
      if (!map.has(f.path)) map.set(f.path, getDisplayFileName(f.name))
    }
    set({ indexedNotes: new Map(map) })
  },

  clearSearch: () => set({ query: '', results: [] }),
  openSearch: () => set({ isOpen: true }),
  closeSearch: () => set({ isOpen: false, query: '', results: [] }),
}))
