'use client'

import { useEffect, useRef } from 'react'
import { EditorState, StateEffect } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { LanguageDescription } from '@codemirror/language'
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
        oneDark,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.theme({
          '&': {
            background: '#20252d',
            color: '#d8dee9',
            height: '100%',
            fontSize: '15px',
            fontWeight: '450',
            lineHeight: '1.75',
          },
          '.cm-scroller': {
            background: '#20252d',
            overflow: 'auto',
            fontFamily: 'var(--font-mono)',
          },
          '.cm-content': {
            padding: '22px 32px 40px 12px',
            caretColor: 'transparent',
            cursor: 'text',
          },
          '.cm-line': { paddingLeft: '8px' },
          '.cm-gutters': {
            background: '#20252d',
            borderRight: '1px solid #343b46',
            color: '#8b95a5',
            paddingLeft: '8px',
            paddingRight: '10px',
          },
          '.cm-lineNumbers .cm-gutterElement': {
            minWidth: '3ch',
            padding: '0 4px 0 0',
          },
          '.cm-selectionBackground, .cm-content ::selection': {
            background: '#3b526f !important',
          },
          '.cm-cursor, .cm-dropCursor': { display: 'none' },
        }, { dark: true }),
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

  return <div ref={containerRef} className="code-viewer" style={{ height: '100%', width: '100%', overflow: 'hidden' }} />
}
