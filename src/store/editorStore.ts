'use client'

import { create } from 'zustand'
import { Note, SaveStatus } from '@/types'
import { isMarkdownPath } from '@/lib/fileTypes'

interface EditorState {
  openNote: Note | null
  isDirty: boolean
  saveStatus: SaveStatus
  noteCache: Map<string, Note>
  openFile: (path: string) => Promise<void>
  setContent: (content: string) => void
  saveNote: () => Promise<void>
  closeNote: () => void
  updateOpenNotePath: (oldPath: string, newPath: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openNote: null,
  isDirty: false,
  saveStatus: { status: 'idle' },
  noteCache: new Map(),

  openFile: async (path: string) => {
    // Save current note if dirty
    const { openNote, isDirty, saveNote } = get()
    if (openNote && isDirty && isMarkdownPath(openNote.path)) {
      await saveNote()
    }

    // Check cache
    const cached = get().noteCache.get(path)
    if (cached) {
      set({ openNote: cached, isDirty: false, saveStatus: { status: 'idle' } })
      return
    }

    set({ saveStatus: { status: 'idle' } })

    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('Failed to fetch file')
      const { content, sha } = await res.json()

      const note: Note = { path, content, sha }
      const cache = get().noteCache
      cache.set(path, note)

      set({ openNote: note, isDirty: false, saveStatus: { status: 'idle' } })

      // Also save to localStorage
      try {
        const recentRaw = localStorage.getItem('recentNotes')
        const recent: string[] = recentRaw ? JSON.parse(recentRaw) : []
        const updated = [path, ...recent.filter((p) => p !== path)].slice(0, 10)
        localStorage.setItem('recentNotes', JSON.stringify(updated))
      } catch { /* ignore */ }
    } catch (err) {
      console.error('openFile error:', err)
    }
  },

  setContent: (content: string) => {
    const { openNote } = get()
    if (!openNote || !isMarkdownPath(openNote.path)) return
    set({
      openNote: { ...openNote, content },
      isDirty: true,
    })
  },

  saveNote: async () => {
    const { openNote } = get()
    if (!openNote) return

    if (!isMarkdownPath(openNote.path)) {
      set({
        isDirty: false,
        saveStatus: { status: 'error', message: 'Read-only files cannot be saved' },
      })
      return
    }

    set({ saveStatus: { status: 'saving' } })

    try {
      const res = await fetch('/api/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: openNote.path,
          content: openNote.content,
          sha: openNote.sha,
          message: `update: ${openNote.path}`,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Save failed')
      }

      const { sha } = await res.json()
      const updatedNote = { ...openNote, sha }

      // Update cache
      const cache = get().noteCache
      cache.set(openNote.path, updatedNote)

      set({
        openNote: updatedNote,
        isDirty: false,
        saveStatus: { status: 'saved' },
      })

      // Reset status after 2s
      setTimeout(() => set({ saveStatus: { status: 'idle' } }), 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      set({ saveStatus: { status: 'error', message: msg } })
    }
  },

  closeNote: () => {
    set({ openNote: null, isDirty: false, saveStatus: { status: 'idle' } })
  },

  // Called after a drag-and-drop move: keeps the editor live but with the correct new path.
  updateOpenNotePath: (oldPath: string, newPath: string) => {
    const { openNote, noteCache } = get()
    const cache = noteCache

    // Migrate cache entry
    const cached = cache.get(oldPath)
    if (cached) {
      const updated = { ...cached, path: newPath }
      cache.delete(oldPath)
      cache.set(newPath, updated)
    }

    // Update open note if it's the moved file
    if (openNote?.path === oldPath) {
      set({ openNote: { ...openNote, path: newPath } })
    }
  },
}))
