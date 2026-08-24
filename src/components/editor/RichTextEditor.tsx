'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent, type Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Markdown, type MarkdownStorage } from 'tiptap-markdown'
import type { EditorView } from '@tiptap/pm/view'
import { useEditorStore } from '@/store/editorStore'
import { Toolbar } from './Toolbar'

function getMarkdown(editor: TiptapEditor) {
  return (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown()
}

export function RichTextEditor() {
  const { openNote, setContent, saveNote } = useEditorStore()
  
  // Auto-save debouncer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveNote()
    }, 3000)
  }, [saveNote])

  // Helper to rewrite relative paths (./.images, .images, notes/.images) to absolute API paths for the editor
  const rewriteMarkdownToApiPaths = useCallback((content: string) => {
    return content.replace(
      /!\[(.*?)\]\((?:\.\/|notes\/)?(\.images\/.*?)\)/g, 
      '![$1](/api/image?path=$2)'
    )
  }, [])

  const handleImageUpload = async (file: File, view: EditorView, pos: number) => {
    if (!file.type.startsWith('image/')) return false
    
    // Create a temporary placeholder (optional, but good for UX)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      
      // url is .images/filename.png
      // Prepend /api/image?path= for immediate preview in editor
      const finalUrl = `/api/image?path=${url}`
      
      view.dispatch(
        view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src: finalUrl, alt: file.name }))
      )
    } catch (err) {
      console.error('Image upload failed:', err)
      alert('Failed to upload image')
    }
    return true
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        tightLists: false,
        bulletListMarker: '-',
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg shadow-sm max-w-full my-4',
        },
      }),
    ],
    // Initialize with rewritten paths so images render immediately on mount
    content: openNote ? rewriteMarkdownToApiPaths(openNote.content) : '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Serialize rich text into raw markdown
      let markdownOutput = getMarkdown(editor)
      
      // Post-process: strip internal API path back to relative path for GitHub
      markdownOutput = markdownOutput.replace(/\/api\/image\?path=/g, '')
      
      // Ensure block elements (like images) are followed by newlines if they aren't already
      // to avoid 'concatenation' issues in raw markdown.
      markdownOutput = markdownOutput.replace(/(\!\[.*?\]\(.*?\))([^\n])/g, '$1\n\n$2')
      
      setContent(markdownOutput)
      debouncedSave()
    },
    editorProps: {
      attributes: {
        class: 'prose-container focus:outline-none min-h-full',
      },
      handleDOMEvents: {
        paste: (view, event) => {
          const items = event.clipboardData?.items
          if (!items) return false

          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile()
              if (file) {
                event.preventDefault()
                handleImageUpload(file, view, view.state.selection.from)
                return true
              }
            }
          }
          return false
        },
        drop: (view, event) => {
          const files = event.dataTransfer?.files
          if (!files || files.length === 0) return false

          const file = files[0]
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
            if (pos !== undefined) {
              handleImageUpload(file, view, pos)
              return true
            }
          }
          return false
        },
      },
    },
  })

  // Watch for external content or path changes
  useEffect(() => {
    if (editor && openNote) {
      // Get current normalized markdown from editor
      const currentMarkdown = getMarkdown(editor).replace(/\/api\/image\?path=/g, '')
      
      if (openNote.content !== currentMarkdown) {
        // Sync rewritten content to the editor
        editor.commands.setContent(rewriteMarkdownToApiPaths(openNote.content))
      }
    }
  }, [openNote, editor, rewriteMarkdownToApiPaths])

  // Keyboard shortcut to manually save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveNote()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveNote])

  if (!openNote) return null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg-primary)' }}>
      <Toolbar editor={editor} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <style>{`
          .prose-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 40px 24px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-sizing: border-box !important;
          }
          @media (max-width: 768px) {
            .prose-container { padding: 20px 16px !important; }
          }
          .ProseMirror { min-height: 200px; width: 100% !important; }
          .ProseMirror p { margin: 0 0 1.25em; line-height: 1.8; color: #adbac7; font-size: 16px; }
          .ProseMirror h1 { font-size: 2.5em; margin: 0 0 0.6em; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; }
          .ProseMirror h2 { font-size: 1.8em; margin: 1.6em 0 0.6em; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.3em; }
          .ProseMirror h3 { font-size: 1.4em; margin: 1.4em 0 0.6em; font-weight: 600; color: var(--text-primary); }
          .ProseMirror blockquote { border-left: 4px solid var(--accent); padding: 0.5em 0 0.5em 1.5em; margin: 1.5em 0; color: #768390; font-style: italic; background: rgba(88,166,255,0.05); border-radius: 0 8px 8px 0; }
          .ProseMirror code { background: rgba(99,110,123,0.3); padding: 0.2em 0.4em; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: 0.85em; color: #e6edf3; }
          .ProseMirror pre { background: #1c2128; padding: 1.25em; border-radius: 12px; border: 1px solid var(--border); margin: 1.5em 0; overflow-x: auto; }
          .ProseMirror pre code { background: transparent; padding: 0; border-radius: 0; color: inherit; }
          .ProseMirror ul { padding-left: 1.5em; margin: 0 0 1.25em; list-style-type: disc !important; }
          .ProseMirror ol { padding-left: 1.5em; margin: 0 0 1.25em; list-style-type: decimal !important; }
          .ProseMirror li { margin-bottom: 0.5em; color: #adbac7; line-height: 1.7; display: list-item !important; }
          .ProseMirror li p { margin: 0; }
          .ProseMirror hr { border: none; border-top: 2px solid var(--border-subtle); margin: 2.5em 0; }
          .ProseMirror a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.1s; }
          .ProseMirror a:hover { border-bottom-color: var(--accent); }
        `}</style>
        <EditorContent editor={editor} style={{ height: '100%' }} />
      </div>
    </div>
  )
}
