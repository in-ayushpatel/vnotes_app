'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Fuse from 'fuse.js'
import { useTreeStore } from '@/store/treeStore'
import { useEditorStore } from '@/store/editorStore'
import { useUIStore } from '@/store/uiStore'
import type { FileNode } from '@/types'

// Recursively flatten tree into a 1D array of only files
function flattenTree(nodes: FileNode[], pathPrefix = ''): { path: string, name: string }[] {
  let result: { path: string, name: string }[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      // Exclude generic gitkeep
      if (node.name !== '.gitkeep') {
        result.push({ path: node.path, name: node.name })
      }
    } else if (node.children) {
      result = result.concat(flattenTree(node.children, node.path))
    }
  }
  return result
}

export function CommandPalette() {
  const { isCommandPaletteOpen: isOpen, setCommandPaletteOpen: setIsOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const { tree } = useTreeStore()
  const { openFile } = useEditorStore()
  
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Flatten tree lazily
  const allFiles = useMemo(() => flattenTree(tree), [tree])
  
  // Setup Fuse.js for fuzzy finding
  const fuse = useMemo(() => new Fuse(allFiles, {
    keys: ['name', 'path'],
    threshold: 0.4, // require decent match
    distance: 100,
  }), [allFiles])
  
  // Get results based on query
  const results = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 10) // show top 10 if empty
    return fuse.search(query).map(r => r.item).slice(0, 10)
  }, [query, fuse, allFiles])

  // Global Keyboard Listener for CMD+P or CTRL+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault() // prevent browser print dialog
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, setIsOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timeout = window.setTimeout(() => {
        setQuery('')
        setSelectedIndex(0)
        inputRef.current?.focus()
      }, 10)
      return () => window.clearTimeout(timeout)
    }
  }, [isOpen])

  const selectItem = (path: string) => {
    openFile(path)
    setIsOpen(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        selectItem(results[selectedIndex].path)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setIsOpen(false)}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
    >
      <div 
        className="w-[600px] max-w-[90vw] rounded-xl overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          animation: 'slideIn 0.15s ease-out',
        }}
      >
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search files by name... (⌘P)"
            style={{
              width: '100%', background: 'var(--bg-tertiary)',
              border: '1px solid var(--accent)', borderRadius: '6px',
              padding: '10px 16px', fontSize: '15px', color: 'var(--text-primary)',
              outline: 'none',
              boxShadow: '0 0 0 2px var(--accent-subtle)' // simulated focus ring
            }}
          />
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
          {results.length > 0 ? (
            results.map((file, i) => {
              const isActive = i === selectedIndex
              return (
                <div
                  key={file.path}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => selectItem(file.path)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    display: 'flex', flexDirection: 'column', gap: '2px',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent'
                  }}
                >
                  <span style={{ fontSize: '14px', color: isActive ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isActive ? 500 : 400 }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {file.path.replace(/^notes\//, '')}
                  </span>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No files found matching &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
