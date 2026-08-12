import { useEditorStore } from '@/store/editorStore'
import { useTreeStore } from '@/store/treeStore'
import { useUIStore } from '@/store/uiStore'
import { getFileLanguage, isMarkdownPath } from '@/lib/fileTypes'

type ViewMode = 'edit' | 'rich' | 'split' | 'preview'

interface TopBarProps {
  viewMode: ViewMode
  editorPreference: 'edit' | 'rich'
  onSetMode: (m: ViewMode) => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  isMobile: boolean
}

const MODES: { mode: ViewMode; icon: string; title: string; color: string }[] = [
  { mode: 'edit',    icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', title: 'Raw Markdown', color: '#ffa657' },
  { mode: 'rich',    icon: 'M12 3c0 4.5 3.5 8 8 8-4.5 0-8 3.5-8 8 0-4.5-3.5-8-8-8 4.5 0 8-3.5 8-8z', title: 'Rich Editor', color: '#d2a8ff' },
  { mode: 'split',   icon: 'M3 3h18v18H3z M12 3v18', title: 'Side-by-side', color: '#79c0ff' },
  { mode: 'preview', icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', title: 'Preview only', color: '#56d364' },
]

export function TopBar({ viewMode, editorPreference, onSetMode, sidebarCollapsed, onToggleSidebar, isMobile }: TopBarProps) {
  const { openNote, saveStatus, saveNote, isDirty } = useEditorStore()
  const { selectedRepo } = useTreeStore()
  const { toggleCommandPalette } = useUIStore()
  const isMarkdown = openNote ? isMarkdownPath(openNote.path) : false
  const fileLanguage = openNote ? getFileLanguage(openNote.path) : null

  const breadcrumb = openNote?.path
    ? openNote.path.replace(/^notes\//, '').replace(/\.md$/i, '').split('/').join(' / ')
    : null

  const statusLabel = (() => {
    if (saveStatus.status === 'saving') return { label: 'Saving...', color: 'var(--warning)', dot: true }
    if (saveStatus.status === 'saved')  return { label: 'Saved',     color: 'var(--success)', dot: false }
    if (saveStatus.status === 'error')  return { label: saveStatus.message ?? 'Error', color: 'var(--danger)', dot: false }
    if (isDirty) return { label: 'Unsaved', color: 'var(--text-muted)', dot: false }
    return null
  })()

  return (
    <div style={{
      height: '48px', flexShrink: 0,
      background: 'rgba(22,27,34,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: '12px',
    }}>
      {/* Hamburger & App Icon (only when sidebar is collapsed on mobile or desktop) */}
      {sidebarCollapsed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '6px' }}>
          <button
            onClick={onToggleSidebar}
            title="Expand Sidebar"
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px',
              transition: 'background 0.1s, color 0.1s'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <span style={{ fontSize: '18px' }}>🧠</span>
            {!isMobile && <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>vNotes</span>}
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {breadcrumb ? (
          <div style={{ 
            fontSize: '12px', color: 'var(--text-muted)', 
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
          }}>
            {!isMobile && (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedRepo?.fullName}</span>
                <span style={{ margin: '0 6px' }}>·</span>
              </>
            )}
            <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{breadcrumb}</span>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedRepo ? `${selectedRepo.fullName} · Select a note` : 'No repo selected'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Search Toggle (for mobile and shortcut discovery) */}
        <button
          onClick={toggleCommandPalette}
          title="Search note (⌘P)"
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', padding: '6px', borderRadius: '4px',
            transition: 'background 0.1s, color 0.1s'
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {!isMarkdown && openNote && (
          <div style={{
            border: '1px solid var(--border)', borderRadius: '999px', padding: '3px 8px',
            color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', fontSize: '11px',
          }}>
            {fileLanguage?.label ?? 'Text'} · Read only
          </div>
        )}

        {/* Save status */}
        {isMarkdown && statusLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: statusLabel.color }}>
            {statusLabel.dot && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusLabel.color, animation: 'pulse-dot 1s infinite' }} />
            )}
            {!isMobile && statusLabel.label}
          </div>
        )}

        {openNote && isMarkdown && (
          <>
            {/* Save Button */}
            <button
              onClick={saveNote}
              title="Save (⌘S)"
              disabled={!isDirty}
              style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: isMobile ? '5px' : '5px 10px',
                width: isMobile ? '32px' : 'auto', height: isMobile ? '28px' : 'auto',
                fontSize: '11px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isDirty ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: isDirty ? 'pointer' : 'default', transition: 'all 0.1s',
              }}
              onMouseEnter={e => { if (isDirty) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
            >
              {isMobile ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              ) : '⌘S'}
            </button>

            {/* View mode buttons */}
            <div style={{
              display: 'flex', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '8px',
              border: '1px solid var(--border)', flexShrink: 0,
            }}>
              {MODES.filter(m => !isMobile || m.mode !== 'split').map(({ mode, icon, title, color }, i) => {
                const active = viewMode === mode || (viewMode === 'split' && (mode === 'edit' || mode === 'rich') && editorPreference === mode)
                return (
                  <button
                    key={mode}
                    onClick={() => onSetMode(mode)}
                    title={title}
                    style={{
                      background: active ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                      border: active ? `1px solid ${color}66` : '1px solid transparent',
                      borderRadius: '6px',
                      width: '32px', height: '28px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: active ? color : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={icon} />
                    </svg>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
