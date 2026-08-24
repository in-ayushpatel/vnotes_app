'use client'

import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { useEditorStore } from '@/store/editorStore'
import { useSearchStore } from '@/store/searchStore'

const DEBOUNCE_MS = 3000

export function Editor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { openNote, setContent, saveNote } = useEditorStore()
  const { indexNote } = useSearchStore()

  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveNote()
    }, DEBOUNCE_MS)
  }, [saveNote])

  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString()
        setContent(content)
        triggerSave()
        // Update search index
        if (openNote) indexNote(openNote.path, content)
      }
    })

    const handleFileUpload = async (file: File, view: EditorView, pos: number) => {
      if (!file.type.startsWith('image/')) return false
      const placeholder = `![Uploading ${file.name}...]`
      view.dispatch({ changes: { from: pos, insert: placeholder } })
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')
        const { url } = await res.json()
        
        const currentDoc = view.state.doc.toString()
        const index = currentDoc.indexOf(placeholder)
        if (index !== -1) {
          view.dispatch({ changes: { from: index, to: index + placeholder.length, insert: `![${file.name}](${url})` } })
        }
      } catch {
        const currentDoc = view.state.doc.toString()
        const index = currentDoc.indexOf(placeholder)
        if (index !== -1) {
          view.dispatch({ changes: { from: index, to: index + placeholder.length, insert: `![Upload failed: ${file.name}]` } })
        }
      }
      return true
    }

    const uploadHandlers = EditorView.domEventHandlers({
      paste(e, view) {
        const items = e.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              e.preventDefault()
              handleFileUpload(file, view, view.state.selection.main.head)
              return true
            }
          }
        }
        return false
      },
      drop(e, view) {
        const files = e.dataTransfer?.files
        if (!files || files.length === 0) return false
        const file = files[0]
        if (file.type.startsWith('image/')) {
          e.preventDefault()
          const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
          if (pos !== null) {
            handleFileUpload(file, view, pos)
            return true
          }
        }
        return false
      }
    })

    const startState = EditorState.create({
      doc: openNote?.content ?? '',
      extensions: [
        history(),
        lineNumbers(),
        highlightActiveLine(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        oneDark,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
          {
            key: 'Mod-s',
            run: () => {
              if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
              saveNote()
              return true
            },
          },
        ]),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { background: 'transparent', height: '100%' },
          '.cm-scroller': { background: 'transparent', overflow: 'auto' },
          '.cm-content': { paddingRight: '24px', paddingLeft: '8px' },
          '.cm-line': { paddingLeft: '4px' },
        }),
        uploadHandlers,
        updateListener,
      ],
    })

    const view = new EditorView({ state: startState, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNote?.path]) // Re-create editor when file changes

  // Sync content from store if changed externally
  useEffect(() => {
    const view = viewRef.current
    if (!view || !openNote) return
    const current = view.state.doc.toString()
    if (current !== openNote.content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: openNote.content },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNote?.path])

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%', overflow: 'hidden' }}
    />
  )
}
