'use client'

import { useEffect, useRef } from 'react'
import { useSearchStore } from '@/store/searchStore'
import { useEditorStore } from '@/store/editorStore'

interface SearchBoxProps {
  onResultClick?: () => void
}

export function SearchBox({ onResultClick }: SearchBoxProps) {
  const { query, results, setQuery, clearSearch } = useSearchStore()
  const { openFile } = useEditorStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') clearSearch()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [clearSearch])

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search files... (⌘K)"
          style={{
            width: '100%',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            padding: '8px 32px 8px 32px',
            fontSize: '12px',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)' }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)' }}
        />
        <span style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', fontSize: '12px', pointerEvents: 'none',
        }}>🔍</span>
        {query && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '14px', lineHeight: 1,
            }}
          >×</button>
        )}
      </div>

      {/* Results dropdown */}
      {query && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: '8px', zIndex: 100, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.1s ease-out',
        }}>
          {results.map((r) => (
            <button
              key={r.path}
              onClick={() => {
                openFile(r.path)
                clearSearch()
                onResultClick?.()
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 12px', background: 'transparent',
                border: 'none', borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              <div style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '13px' }}>
                📄 {r.name}
              </div>
              <div style={{
                fontSize: '11px', color: 'var(--text-muted)',
                marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {r.preview}
              </div>
            </button>
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '12px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: '12px', zIndex: 100,
        }}>
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}
