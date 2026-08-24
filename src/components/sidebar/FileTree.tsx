'use client'

import { useState, useRef, useEffect } from 'react'
import { FileNode } from '@/types'
import { useEditorStore } from '@/store/editorStore'
import { useTreeStore } from '@/store/treeStore'
import { useSearchStore } from '@/store/searchStore'
import { getDisplayFileName, isMarkdownPath } from '@/lib/fileTypes'

function containsReadOnlyFile(node: FileNode): boolean {
  if (node.type === 'file') return !isMarkdownPath(node.path)
  return node.children?.some(containsReadOnlyFile) ?? false
}

export function FileTree({ nodes }: { nodes: FileNode[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const [creating, setCreating] = useState<{ parentPath: string; type: 'file' | 'folder' } | null>(null)
  const [newName, setNewName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [nodeToDelete, setNodeToDelete] = useState<FileNode | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { openFile, openNote, updateOpenNotePath } = useEditorStore()
  const { refreshTree } = useTreeStore()
  const { indexNote } = useSearchStore()

  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 30)
  }, [creating])

  useEffect(() => {
    if (renamingPath) setTimeout(() => renameInputRef.current?.focus(), 30)
  }, [renamingPath])

  const startCreate = (e: React.MouseEvent, parentPath: string, type: 'file' | 'folder') => {
    e.stopPropagation()
    setCreating({ parentPath, type })
    setNewName('')
    // Auto-expand parent
    setExpanded(prev => new Set([...prev, parentPath]))
  }

  const cancelCreate = () => { setCreating(null); setNewName('') }

  const startRename = (e: React.MouseEvent, node: FileNode) => {
    e.stopPropagation()
    const displayName = node.type === 'file' ? getDisplayFileName(node.name) : node.name
    setRenamingPath(node.path)
    setRenameName(displayName)
  }

  const cancelRename = () => { setRenamingPath(null); setRenameName('') }

  const submitRename = async (node: FileNode) => {
    const trimmed = renameName.trim()
    if (!trimmed || isRenaming) { cancelRename(); return }

    // Compute new name with extension for files
    const newFileName = node.type === 'file'
      ? (trimmed.endsWith('.md') ? trimmed : trimmed + '.md')
      : trimmed

    // Same name → no-op
    if (newFileName === node.name) { cancelRename(); return }

    // Compute new path (same parent directory)
    const parentPath = node.path.split('/').slice(0, -1).join('/')
    const newPath = `${parentPath}/${newFileName}`

    setIsRenaming(true)
    cancelRename()

    try {
      // Optimistic tree update
      const treeState = useTreeStore.getState()
      treeState.moveNode(node.path, newPath)

      const res = await fetch('/api/file/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: node.path, newPath, type: node.type, sha: node.sha }),
      })

      if (!res.ok) throw new Error('Rename failed on server')

      // Update editor store path if this note is currently open
      updateOpenNotePath(node.path, newPath)

      treeState.refreshTree()
    } catch (err) {
      console.error('Rename error:', err)
      useTreeStore.getState().fetchTree() // Revert on failure
    } finally {
      setIsRenaming(false)
    }
  }

  const submitCreate = async () => {
    if (!newName.trim() || !creating) { cancelCreate(); return }
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const name = newName.trim()
      const path = creating.type === 'file'
        ? `${creating.parentPath}/${name.endsWith('.md') ? name : name + '.md'}`
        : `${creating.parentPath}/${name}`
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type: creating.type }),
      })
      const data = await res.json()
      await refreshTree()
      if (creating.type === 'file' && data.path) {
        setTimeout(() => openFile(data.path), 300)
      }
    } catch (err) {
      console.error('Create error:', err)
    } finally {
      setIsSubmitting(false)
      cancelCreate()
    }
  }

  const openDeleteModal = (e: React.MouseEvent, node: FileNode) => {
    e.stopPropagation()
    setNodeToDelete(node)
  }

  const confirmDeleteAction = async () => {
    if (!nodeToDelete) return
    const node = nodeToDelete
    setNodeToDelete(null)
    setDeleting(node.path)
    try {
      if (node.type === 'file') {
        const r = await fetch(`/api/file?path=${encodeURIComponent(node.path)}`)
        const { sha } = await r.json()
        await fetch('/api/file', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: node.path, sha, message: `delete: ${node.path}` }),
        })
      } else {
        await fetch('/api/node', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: node.path }),
        })
      }
      await refreshTree()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(null)
    }
  }

  const renderNode = (node: FileNode, depth = 0): React.ReactNode => {
    const isOpen = openNote?.path === node.path
    const isExpanded = expanded.has(node.path)
    const isHovered = hoveredPath === node.path
    const isDeletingThis = deleting === node.path
    const isFolder = node.type === 'folder'
    const canModify = isFolder ? !containsReadOnlyFile(node) : isMarkdownPath(node.path)

    return (
      <div key={node.path}>
        {/* Row */}
        <div
          style={{
            paddingLeft: `${8 + depth * 16}px`,
            paddingRight: '6px',
            paddingTop: '4px',
            paddingBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            borderRadius: '6px',
            margin: '1px 4px',
            fontSize: '13px',
            color: isOpen ? 'var(--accent)' : 'var(--text-secondary)',
            background: dragOverPath === node.path ? 'rgba(88,166,255,0.2)' : isOpen ? 'var(--accent-subtle)' : isHovered ? 'var(--bg-hover)' : 'transparent',
            opacity: isDeletingThis ? 0.4 : 1,
            transition: 'background 0.1s',
            userSelect: 'none',
            position: 'relative',
          }}
          draggable={canModify}
          onDragStart={(e) => {
            if (!canModify) return
            e.dataTransfer.setData('app/node', JSON.stringify({ path: node.path, type: node.type, sha: node.sha }))
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            if (isFolder) {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOverPath(node.path)
            }
          }}
          onDragLeave={() => {
            if (dragOverPath === node.path) setDragOverPath(null)
          }}
          onDrop={async (e) => {
            if (!isFolder) return
            e.preventDefault()
            setDragOverPath(null)
            const data = e.dataTransfer.getData('app/node')
            if (!data) return
            
            try {
              const { path: oldPath, type, sha } = JSON.parse(data)
              const incomingName = oldPath.split('/').pop()!
              const newPath = `${node.path}/${incomingName}`
              
              if (oldPath === newPath) return // Same spot
              if (node.path.startsWith(oldPath)) return // Can't drop a folder into itself
              
              // Optimistic update
              const treeState = useTreeStore.getState()
              treeState.moveNode(oldPath, newPath)
              
              // Backend update
              const res = await fetch('/api/file/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath, newPath, type, sha })
              })
              
              if (!res.ok) throw new Error('Move failed on server')

              // Update editor store so saves go to the correct new path
              updateOpenNotePath(oldPath, newPath)

              // Soft refresh to secure actual SHAs post-mutation
              treeState.refreshTree()
              
            } catch (err) {
              console.error('Drag drop failed', err)
              // Hard refresh to revert optimistic update
              useTreeStore.getState().fetchTree()
            }
          }}
          onClick={() => {
            if (isFolder) {
              setExpanded(prev => {
                const next = new Set(prev)
                if (next.has(node.path)) {
                  next.delete(node.path)
                } else {
                  next.add(node.path)
                }
                return next
              })
            } else {
              openFile(node.path).then(() => {
                fetch(`/api/file?path=${encodeURIComponent(node.path)}`)
                  .then(r => r.json())
                  .then(({ content }) => indexNote(node.path, content))
                  .catch(() => {})
              })
            }
          }}
          onMouseEnter={() => setHoveredPath(node.path)}
          onMouseLeave={() => setHoveredPath(null)}
        >
          {/* Expand arrow (folders) or spacer (files) */}
          {isFolder ? (
            <span
              style={{
                fontSize: '9px', color: 'var(--text-muted)', flexShrink: 0, width: '10px',
                transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                display: 'inline-block',
              }}
            >▶</span>
          ) : (
            <span style={{ width: '10px', flexShrink: 0 }} />
          )}

          {/* Icon */}
          <span style={{ fontSize: '13px', flexShrink: 0 }}>
            {isFolder ? (isExpanded ? '📂' : '📁') : '📄'}
          </span>

          {/* Name — shows input when renaming */}
          {renamingPath === node.path ? (
            <input
              ref={renameInputRef}
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitRename(node)
                if (e.key === 'Escape') cancelRename()
              }}
              onBlur={() => submitRename(node)}
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1, background: 'var(--bg-tertiary)',
                border: '1px solid var(--accent)', borderRadius: '4px',
                color: 'var(--text-primary)', padding: '1px 6px',
                fontSize: '12px', outline: 'none', minWidth: 0,
              }}
            />
          ) : (
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: isOpen ? '500' : '400',
            }}>
              {isFolder ? node.name : getDisplayFileName(node.name)}
            </span>
          )}

          {/* Action buttons — shown on hover */}
          {isHovered && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* + Note (folders only) */}
              {isFolder && (
                <button
                  title="New note"
                  onClick={e => startCreate(e, node.path, 'file')}
                  style={btnStyle('#238636')}
                  onMouseEnter={e => hoverIn(e, '#2ea043')}
                  onMouseLeave={e => hoverOut(e, '#238636')}
                >
                  <span style={{ fontSize: '11px', fontWeight: '700', lineHeight: 1 }}>+📄</span>
                </button>
              )}

              {/* + Folder (folders only) */}
              {isFolder && (
                <button
                  title="New folder"
                  onClick={e => startCreate(e, node.path, 'folder')}
                  style={btnStyle('#1f6feb')}
                  onMouseEnter={e => hoverIn(e, '#388bfd')}
                  onMouseLeave={e => hoverOut(e, '#1f6feb')}
                >
                  <span style={{ fontSize: '11px', fontWeight: '700', lineHeight: 1 }}>+📁</span>
                </button>
              )}

              {canModify && (
                <>
                  {/* Rename */}
                  <button
                    title="Rename"
                    onClick={e => startRename(e, node)}
                    style={btnStyle('#6e7681')}
                    onMouseEnter={e => hoverIn(e, '#388bfd')}
                    onMouseLeave={e => hoverOut(e, '#6e7681')}
                  >
                    <span style={{ fontSize: '11px', lineHeight: 1 }}>✏️</span>
                  </button>

                  {/* Delete */}
                  <button
                    title="Delete"
                    onClick={e => openDeleteModal(e, node)}
                    style={btnStyle('#6e7681')}
                    onMouseEnter={e => hoverIn(e, '#f85149', true)}
                    onMouseLeave={e => hoverOut(e, '#6e7681')}
                  >
                    <span style={{ fontSize: '11px', lineHeight: 1 }}>🗑</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Inline create input — appears below parent folder */}
        {creating && creating.parentPath === node.path && (
          <div style={{
            paddingLeft: `${8 + (depth + 1) * 16 + 24}px`,
            paddingRight: '10px',
            marginBottom: '2px',
          }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitCreate()
                if (e.key === 'Escape') cancelCreate()
              }}
              onBlur={submitCreate}
              disabled={isSubmitting}
              placeholder={creating.type === 'file' ? 'note-name.md' : 'folder-name'}
              style={{
                width: '100%', background: 'var(--bg-tertiary)',
                border: '1px solid var(--accent)', borderRadius: '5px',
                color: 'var(--text-primary)', padding: '4px 8px',
                fontSize: '12px', outline: 'none',
              }}
            />
          </div>
        )}

        {/* Children */}
        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.filter(c => !(c.type === 'file' && c.name === '.gitkeep')).map(child => renderNode(child, depth + 1))}
            {node.children.filter(c => !(c.type === 'file' && c.name === '.gitkeep')).length === 0 && (
              <div style={{
                fontSize: '11px', color: 'var(--text-muted)',
                fontStyle: 'italic',
                padding: `4px 12px 4px ${8 + (depth + 1) * 16 + 24}px`,
              }}>
                empty
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Custom Delete Confirmation Modal */}
      {nodeToDelete && (
        <div
          onClick={() => setNodeToDelete(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '24px', width: '320px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', gap: '16px',
              animation: 'slideUp 0.15s ease-out'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Delete {nodeToDelete.type === 'folder' ? 'Folder' : 'Note'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{getDisplayFileName(nodeToDelete.name)}</strong>?
              <br/><br/>
              This action operates directly on GitHub and cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setNodeToDelete(null)}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', padding: '6px 16px', borderRadius: '6px',
                  fontSize: '13px', cursor: 'pointer', transition: 'background 0.1s'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >Cancel</button>
              <button
                onClick={confirmDeleteAction}
                style={{
                  background: 'var(--danger)', border: 'none',
                  color: '#fff', padding: '6px 16px', borderRadius: '6px',
                  fontSize: '13px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.1s'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '4px 0' }}>
      {nodes.length === 0 ? (
        <div style={{
          padding: '24px 16px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: '12px', lineHeight: '1.7',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
          No supported files yet.<br />
          Use the <strong style={{ color: 'var(--text-secondary)' }}>+</strong> button above<br />
          to create your first note.
        </div>
      ) : (
        nodes.map(node => renderNode(node))
      )}
      </div>
    </>
  )
}

// ─── helpers ───────────────────────────────────────────────────────────────

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    border: 'none',
    borderRadius: '4px',
    padding: '2px 5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.1s',
    height: '20px',
  }
}

function hoverIn(e: React.MouseEvent, color: string, isDelete = false) {
  const btn = e.currentTarget as HTMLButtonElement
  btn.style.background = color
  if (isDelete) btn.style.transform = 'scale(1.1)'
}

function hoverOut(e: React.MouseEvent, color: string) {
  const btn = e.currentTarget as HTMLButtonElement
  btn.style.background = color
  btn.style.transform = 'scale(1)'
}
