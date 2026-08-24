'use client'

import { useState, useMemo, useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'

export function TocPanel() {
  const { openNote } = useEditorStore()
  const content = openNote?.content ?? ''
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Track window resize for mobile breakpoint
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Parse headings from markdown content
  const headings = useMemo(() => {
    if (!content) return []
    const lines = content.split('\n')
    const parsed = []
    
    // basic regex to match # Heading
    const regex = /^(#{1,6})\s+(.+)$/
    for (const line of lines) {
      const match = line.match(regex)
      if (match) {
        const level = match[1].length
        const text = match[2].trim()
        const id = text.toLowerCase().replace(/[^\w]+/g, '-')
        parsed.push({ level, text, id })
      }
    }
    return parsed
  }, [content])

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
    setIsOpen(false)
  }

  if (!openNote) return null

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
          title="Table of Contents"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 100,
          }}
        >
          ≣
        </button>

      {/* Modal / Dialog */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: isMobile ? 'rgba(0,0,0,0.6)' : 'transparent',
            backdropFilter: isMobile ? 'blur(4px)' : 'none',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: isMobile ? 'center' : 'flex-end',
            padding: isMobile ? '0' : '24px 24px 84px 24px', // Keep above FAB
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: isMobile ? '100%' : '320px',
              maxHeight: isMobile ? '80vh' : 'calc(100vh - 120px)',
              background: 'var(--bg-secondary)',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              borderBottomLeftRadius: isMobile ? '0' : '16px',
              borderBottomRightRadius: isMobile ? '0' : '16px',
              padding: '24px',
              overflowY: 'auto',
              boxShadow: isMobile ? '0 -8px 24px rgba(0,0,0,0.5)' : '0 12px 32px rgba(0,0,0,0.6)',
              border: isMobile ? 'none' : '1px solid var(--border)',
              animation: 'slideUp 0.2s ease-out'
            }}
          >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '16px' }}>Table of Contents</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', padding: '4px', cursor: 'pointer' }}
                >×</button>
              </div>

              {headings.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
                  No headings found in this note.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {headings.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToHeading(h.id)}
                      style={{
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        padding: '6px 0',
                        fontSize: '14px',
                        paddingLeft: `${(h.level - 1) * 12}px`,
                        borderBottom: '1px solid var(--border-subtle)',
                        opacity: 1 - (h.level - 1) * 0.15,
                        cursor: 'pointer'
                      }}
                    >
                      {h.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )
}
