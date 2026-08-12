'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTreeStore } from '@/store/treeStore'
import { useEditorStore } from '@/store/editorStore'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Editor } from '@/components/editor/Editor'
import { Preview } from '@/components/editor/Preview'
import { TopBar } from '@/components/editor/TopBar'
import { TocPanel } from '@/components/editor/TocPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { CodeViewer } from '@/components/editor/CodeViewer'
import { isMarkdownPath } from '@/lib/fileTypes'

type ViewMode = 'edit' | 'rich' | 'split' | 'preview'

const SIDEBAR_DEFAULT = 260
const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 480
const SPLIT_MIN = 200 // px minimum for each split pane

export default function AppPage() {
  const { fetchUser } = useAuthStore()
  const { restoreRepo } = useTreeStore()
  const { openNote } = useEditorStore()

  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [editorPreference, setEditorPreference] = useState<'edit' | 'rich'>('edit')
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // ── Sidebar collapse / resize ─────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const isDraggingSidebar = useRef(false)
  const sidebarDragStart = useRef({ x: 0, width: 0 })

  // ── Split pane resize ─────────────────────────────────────────────────────
  // splitRatio = fraction [0..1] of the editor+preview area given to editor
  const [splitRatio, setSplitRatio] = useState(0.5)
  const isDraggingSplit = useRef(false)
  const splitContainerRef = useRef<HTMLDivElement>(null)

  const handleSetViewMode = (mode: ViewMode) => {
    if (mode === 'edit' || mode === 'rich') {
      setEditorPreference(mode)
      if (viewMode === 'split') return
    }
    // Toggle split: clicking split again exits it, reverting to last editor preference
    if (mode === 'split' && viewMode === 'split') {
      setViewMode(editorPreference)
      return
    }
    setViewMode(mode)
  }

  const [isIntroFinished, setIsIntroFinished] = useState(false)
  const initialMobileCheck = useRef(false)

  useEffect(() => {
    setMounted(true)
    fetchUser()
    restoreRepo()

    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)

      if (mobile && !initialMobileCheck.current) {
        setViewMode('preview')
        initialMobileCheck.current = true
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    const timer = setTimeout(() => {
      setIsIntroFinished(true)
    }, 1400)

    return () => {
      window.removeEventListener('resize', checkMobile)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Global mouse handlers (sidebar drag) ──────────────────────────────────

  // ── Global mouse handlers (sidebar drag) ──────────────────────────────────
  const onSidebarMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingSidebar.current) return
    const delta = e.clientX - sidebarDragStart.current.x
    const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sidebarDragStart.current.width + delta))
    setSidebarWidth(newWidth)
  }, [])

  const onSidebarMouseUp = useCallback(() => {
    isDraggingSidebar.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // ── Global mouse handlers (split drag) ───────────────────────────────────
  const onSplitMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingSplit.current || !splitContainerRef.current) return
    const rect = splitContainerRef.current.getBoundingClientRect()
    const totalWidth = rect.width - 4 // subtract divider width
    const newLeft = Math.min(
      totalWidth - SPLIT_MIN,
      Math.max(SPLIT_MIN, e.clientX - rect.left)
    )
    setSplitRatio(newLeft / totalWidth)
  }, [])

  const onSplitMouseUp = useCallback(() => {
    isDraggingSplit.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onSidebarMouseMove)
    window.addEventListener('mouseup', onSidebarMouseUp)
    window.addEventListener('mousemove', onSplitMouseMove)
    window.addEventListener('mouseup', onSplitMouseUp)
    return () => {
      window.removeEventListener('mousemove', onSidebarMouseMove)
      window.removeEventListener('mouseup', onSidebarMouseUp)
      window.removeEventListener('mousemove', onSplitMouseMove)
      window.removeEventListener('mouseup', onSplitMouseUp)
    }
  }, [onSidebarMouseMove, onSidebarMouseUp, onSplitMouseMove, onSplitMouseUp])

  if (!mounted) return null

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* ── Entrance Animation 🌊 ────────────────────────────────────── */}
      <style>{`
        @keyframes vnote-splash-fade {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.08); filter: blur(10px); }
        }
        @keyframes vnote-pulse-polished {
          0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(88,166,255,0.2)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(88,166,255,0.5)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(88,166,255,0.2)); }
        }
        @keyframes vnote-text-reveal {
          0% { opacity: 0; letter-spacing: -2px; transform: translateY(10px); }
          100% { opacity: 1; letter-spacing: 2px; transform: translateY(0); }
        }
        @keyframes vnote-ui-reveal {
          0% { opacity: 0; transform: scale(0.98) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes vnote-sidebar-reveal {
          0% { opacity: 0; transform: translateX(-40px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        .splash-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: var(--bg-primary);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .splash-overlay.exit {
          animation: vnote-splash-fade 0.4s 1.8s forwards;
        }
        
        .splash-logo { font-size: 80px; animation: vnote-pulse-polished 2s infinite ease-in-out; }
        .splash-text { 
          font-size: 32px; font-weight: 800; color: var(--text-primary); 
          margin-top: 24px; animation: vnote-text-reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .app-reveal {
          opacity: 0;
          animation: vnote-ui-reveal 0.4s 1.8s forwards;
        }
        .sidebar-animated {
          opacity: 0;
          animation: vnote-sidebar-reveal 0.4s 1.9s forwards;
        }
      `}</style>

      {/* Splash Screen Overlay */}
      {!isIntroFinished && (
        <div className={`splash-overlay ${mounted ? 'exit' : ''}`}>
          <div className="splash-logo">🧠</div>
          <h1 className="splash-text">vNotes</h1>
        </div>
      )}

      {/* Main Layout Container */}
      <div className={isIntroFinished ? '' : 'app-reveal'} style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div
          className={isIntroFinished ? '' : 'sidebar-animated'}
          style={{
            width: sidebarCollapsed ? (isMobile ? '0px' : '40px') : `${sidebarWidth}px`,
            minWidth: sidebarCollapsed ? (isMobile ? '0px' : '40px') : `${sidebarWidth}px`,
            flexShrink: 0,
            transition: sidebarCollapsed || isDraggingSidebar.current ? 'none' : 'width 0.2s ease',
            position: 'relative',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar content (hidden when collapsed) */}
          {!sidebarCollapsed && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
              <Sidebar onToggle={() => setSidebarCollapsed(true)} />
            </div>
          )}

          {/* Collapsed strip (Desktop only) — shows toggle and brand */}
          {sidebarCollapsed && !isMobile && (
            <div style={{
              width: '40px', height: '100%',
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', paddingTop: '14px', gap: '16px',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Expand Sidebar"
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px',
                  transition: 'background 0.1s, color 0.1s'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              <span style={{ fontSize: '16px' }}>🧠</span>
            </div>
          )}


          {/* Sidebar drag handle (right edge) — only when expanded */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={e => {
                isDraggingSidebar.current = true
                sidebarDragStart.current = { x: e.clientX, width: sidebarWidth }
                document.body.style.cursor = 'col-resize'
                document.body.style.userSelect = 'none'
              }}
              style={{
                position: 'absolute', right: 0, top: 0, bottom: 0,
                width: '5px', cursor: 'col-resize', zIndex: 10,
                background: 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(88,166,255,0.25)' }}
              onMouseLeave={e => {
                if (!isDraggingSidebar.current) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
              }}
            />
          )}
        </div>

        {/* ── Sidebar collapse / expand toggle ────────────────────────────── */}
        {!(sidebarCollapsed && isMobile) && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              position: 'absolute',
              left: sidebarCollapsed ? '28px' : `${sidebarWidth - 12}px`,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              width: '20px', height: '44px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '10px',
              transition: 'left 0.2s ease, color 0.1s',
              padding: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        )}

        {/* ── Main content area ────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Global Modal Overlays */}
          <CommandPalette />

          <TopBar
            viewMode={viewMode}
            editorPreference={editorPreference}
            onSetMode={handleSetViewMode}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(false)}
            isMobile={isMobile}
          />

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0, position: 'relative' }}>
            <div
              ref={splitContainerRef}
              style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0, position: 'relative' }}
            >
              {!openNote ? (
                <EmptyState />
              ) : !isMarkdownPath(openNote.path) ? (
                <CodeViewer />
              ) : viewMode === 'split' ? (
                <>
                  {/* Editor pane */}
                  <div style={{
                    width: `calc(${splitRatio * 100}% - 2px)`,
                    minWidth: 0, overflow: 'hidden', flexShrink: 0,
                    display: 'flex', flexDirection: 'column'
                  }}>
                    {editorPreference === 'rich' ? <RichTextEditor /> : <Editor />}
                  </div>

                  {/* Drag handle */}
                  <div
                    onMouseDown={() => {
                      isDraggingSplit.current = true
                      document.body.style.cursor = 'col-resize'
                      document.body.style.userSelect = 'none'
                    }}
                    style={{
                      width: '5px', flexShrink: 0, cursor: 'col-resize',
                      background: 'var(--border)',
                      transition: 'background 0.15s',
                      zIndex: 10,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--accent)' }}
                    onMouseLeave={e => {
                      if (!isDraggingSplit.current) (e.currentTarget as HTMLDivElement).style.background = 'var(--border)'
                    }}
                  />

                  {/* Preview pane */}
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <Preview />
                  </div>
                </>
              ) : viewMode === 'preview' ? (
                <Preview />
              ) : viewMode === 'rich' ? (
                <RichTextEditor />
              ) : (
                <Editor />
              )}
            </div>
            {openNote && isMarkdownPath(openNote.path) && (viewMode === 'preview' || viewMode === 'split') && <TocPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
