'use client'

import { useEffect, useRef } from 'react'
import { EditorState, StateEffect } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { LanguageDescription, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { useEditorStore } from '@/store/editorStore'
import { getFileLanguage } from '@/lib/fileTypes'

export function CodeViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { openNote } = useEditorStore()

  useEffect(() => {
    if (!containerRef.current || !openNote) return

    const state = EditorState.create({
      doc: openNote.content,
      extensions: [
        lineNumbers(),
        syntaxHighlighting(defaultHighlightStyle),
        oneDark,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.theme({
          '&': { background: 'transparent', height: '100%' },
          '.cm-scroller': { background: 'transparent', overflow: 'auto' },
          '.cm-content': { padding: '16px 24px 24px 8px', cursor: 'default' },
          '.cm-line': { paddingLeft: '4px' },
          '.cm-cursor, .cm-dropCursor': { display: 'none' },
        }),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    let cancelled = false
    const languageId = getFileLanguage(openNote.path)?.id
    const language = languageId
      ? LanguageDescription.matchLanguageName(languages, languageId)
      : null

    language?.load().then((support) => {
      if (!cancelled) view.dispatch({ effects: StateEffect.appendConfig.of(support) })
    }).catch(() => {
      // Plain text remains readable if a language package cannot be loaded.
    })

    return () => {
      cancelled = true
      view.destroy()
    }
  }, [openNote])

  return <div ref={containerRef} style={{ height: '100%', width: '100%', overflow: 'hidden' }} />
}
