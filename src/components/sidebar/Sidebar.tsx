'use client'

import { useState, useRef, useEffect } from 'react'
import { useTreeStore } from '@/store/treeStore'
import { useAuthStore } from '@/store/authStore'
import { useEditorStore } from '@/store/editorStore'
import { FileTree } from './FileTree'
import { SearchBox } from './SearchBox'

export function Sidebar({ onToggle }: { onToggle?: () => void }) {
  const { user, logout } = useAuthStore()
  const { tree, selectedRepo, allRepos, isLoadingTree, isLoadingRepos, fetchRepos, selectRepo, refreshTree } = useTreeStore()
  const { openFile } = useEditorStore()
  const [showRepoSelector, setShowRepoSelector] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const newInputRef = useRef<HTMLInputElement>(null)

  // Close new-note dropdown on outside click
  useEffect(() => {
    if (!showNewMenu) return
    const handler = () => setShowNewMenu(false)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [showNewMenu])

  const startCreate = (type: 'file' | 'folder') => {
    setShowNewMenu(false)
    setCreating(type)
    setNewName('')
    setTimeout(() => newInputRef.current?.focus(), 50)
  }

  const submitCreate = async () => {
    if (!newName.trim() || !selectedRepo) { setCreating(null); return }
    setIsCreating(true)
    try {
      const name = newName.trim()
      const path = creating === 'file'
        ? `notes/${name.endsWith('.md') ? name : name + '.md'}`
        : `notes/${name}`
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type: creating }),
      })
      const data = await res.json()
      await refreshTree()
      if (creating === 'file' && data.path) {
        // Give the tree a brief moment to update, then open the file
        setTimeout(() => openFile(data.path ?? path), 400)
      }
    } catch (err) {
      console.error('Create error:', err)
    } finally {
      setIsCreating(false)
      setCreating(null)
      setNewName('')
    }
  }

  const filteredRepos = allRepos.filter(r =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(repoSearch.toLowerCase())
  )

  return (
    <aside style={{
      width: '260px',
      minWidth: '220px',
      maxWidth: '320px',
      flexShrink: 0,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 14px 10px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          {onToggle && (
            <button
              onClick={onToggle}
              title="Collapse Sidebar"
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', display: 'flex', padding: '2px', borderRadius: '4px',
                transition: 'background 0.1s, color 0.1s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          )}
          <span style={{ fontSize: '18px' }}>🧠</span>
          <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', flex: 1 }}>vNotes</span>

          {/* + New button */}
          {selectedRepo && (
            <div style={{ position: 'relative' }}>
              <button
                title="New note or folder"
                onClick={e => { e.stopPropagation(); setShowNewMenu(v => !v) }}
                style={{
                  background: 'linear-gradient(135deg, #1f6feb 0%, #58a6ff 100%)',
                  border: 'none', borderRadius: '6px',
                  color: '#fff', cursor: 'pointer',
                  width: '26px', height: '26px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', lineHeight: 1,
                  boxShadow: '0 2px 8px rgba(88,166,255,0.3)',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
              >+</button>

              {showNewMenu && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: '30px', right: 0,
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '6px', zIndex: 200,
                    minWidth: '150px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    animation: 'fadeIn 0.1s ease-out',
                  }}
                >
                  {[{ label: '📄 New Note', type: 'file' as const }, { label: '📁 New Folder', type: 'folder' as const }].map(item => (
                    <button key={item.type} onClick={() => startCreate(item.type)} style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 10px', borderRadius: '6px',
                      background: 'transparent', border: 'none',
                      color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                    >{item.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inline root-level create input */}
        {creating && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                ref={newInputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitCreate()
                  if (e.key === 'Escape') { setCreating(null); setNewName('') }
                }}
                disabled={isCreating}
                autoFocus
                placeholder={creating === 'file' ? 'note-name' : 'folder-name'}
                style={{
                  flex: 1, background: 'var(--bg-tertiary)',
                  border: '1px solid var(--accent)', borderRadius: '6px',
                  color: 'var(--text-primary)', padding: '6px 8px',
                  fontSize: '12px', outline: 'none',
                  opacity: isCreating ? 0.6 : 1,
                }}
              />
              <button
                onClick={submitCreate}
                disabled={isCreating || !newName.trim()}
                title="Confirm"
                style={{
                  background: '#238636', border: 'none', borderRadius: '5px',
                  color: '#fff', cursor: 'pointer', padding: '5px 8px',
                  fontSize: '13px', fontWeight: '700', flexShrink: 0,
                  opacity: newName.trim() ? 1 : 0.4,
                }}
              >✓</button>
              <button
                onClick={() => { setCreating(null); setNewName('') }}
                title="Cancel"
                style={{
                  background: 'var(--bg-hover)', border: 'none', borderRadius: '5px',
                  color: 'var(--text-muted)', cursor: 'pointer', padding: '5px 7px',
                  fontSize: '13px', flexShrink: 0,
                }}
              >✕</button>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', paddingLeft: '2px' }}>
              {creating === 'file' ? '→ notes/' : '→ notes/'}{newName || '…'}{creating === 'file' && !newName.endsWith('.md') ? '.md' : ''}
            </div>
          </div>
        )}


        {/* Repo selector */}
        <button
          onClick={() => {
            setShowRepoSelector(true)
            fetchRepos()
          }}
          style={{
            width: '100%', textAlign: 'left', background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)', borderRadius: '8px',
            padding: '7px 10px', cursor: 'pointer', fontSize: '12px',
            color: selectedRepo ? 'var(--text-primary)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedRepo ? selectedRepo.fullName : 'Select a repository...'}
          </span>
          <span style={{ flexShrink: 0, color: 'var(--text-muted)' }}>▾</span>
        </button>
      </div>

      {/* Search */}
      {selectedRepo && (
        <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
          <SearchBox />
        </div>
      )}

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {!selectedRepo ? (
          <div style={{
            padding: '40px 16px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: '12px', lineHeight: '1.6',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗂️</div>
            Select a GitHub repo<br />to load your notes
          </div>
        ) : isLoadingTree ? (
          <div style={{ padding: '24px 16px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                height: '28px', background: 'var(--bg-tertiary)',
                borderRadius: '6px', margin: '4px 8px',
                opacity: 1 - i * 0.12,
              }} />
            ))}
          </div>
        ) : (
          <FileTree nodes={tree} />
        )}
      </div>

      {/* User footer */}
      {user && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.avatar_url}
            alt={user.login}
            width={28} height={28}
            style={{ borderRadius: '50%', border: '2px solid var(--border)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name ?? user.login}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{user.login}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '16px', padding: '4px',
              borderRadius: '4px', transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
          >
            ⏻
          </button>
        </div>
      )}

      {/* Repo Selector Modal */}
      {showRepoSelector && (
        <div
          onClick={() => setShowRepoSelector(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '16px', width: '480px', maxHeight: '70vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                Select Repository
              </h2>
              <input
                autoFocus
                value={repoSearch}
                onChange={e => setRepoSearch(e.target.value)}
                placeholder="Search repositories..."
                style={{
                  width: '100%', background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  color: 'var(--text-primary)', padding: '9px 12px',
                  fontSize: '13px', outline: 'none',
                }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'}
                onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'var(--border)'}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {isLoadingRepos ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading repositories...
                </div>
              ) : filteredRepos.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No repositories found
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={async () => {
                      await selectRepo(repo)
                      setShowRepoSelector(false)
                    }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '12px 14px', borderRadius: '8px',
                      background: selectedRepo?.fullName === repo.full_name ? 'var(--accent-subtle)' : 'transparent',
                      border: selectedRepo?.fullName === repo.full_name ? '1px solid rgba(88,166,255,0.3)' : '1px solid transparent',
                      cursor: 'pointer', marginBottom: '2px',
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (selectedRepo?.fullName !== repo.full_name)
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                    }}
                    onMouseLeave={e => {
                      if (selectedRepo?.fullName !== repo.full_name)
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '13px' }}>
                        {repo.full_name}
                      </span>
                      {repo.private && (
                        <span style={{
                          fontSize: '10px', padding: '1px 6px',
                          background: 'var(--bg-tertiary)', borderRadius: '10px',
                          color: 'var(--text-muted)',
                        }}>private</span>
                      )}
                    </div>
                    {repo.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {repo.description}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
