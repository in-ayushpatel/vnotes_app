export function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.5 }}>📝</div>
      <h3 style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '15px' }}>
        No note selected
      </h3>
      <p style={{ fontSize: '13px', lineHeight: '1.6', textAlign: 'center', maxWidth: '240px' }}>
        Pick a file from the sidebar, or click <b style={{ color: 'var(--text-primary)' }}>+</b> to create a new note.
      </p>
      <div style={{
        marginTop: '24px', padding: '12px 16px',
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '10px', fontSize: '12px', lineHeight: '2',
      }}>
        <div><kbd style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px', marginRight: '6px' }}>⌘P</kbd> Go to file</div>
        <div><kbd style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px', marginRight: '6px' }}>⌘K</kbd> Search notes</div>
        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          Click <b style={{ color: 'var(--text-primary)' }}>+</b> for new note
        </div>
      </div>
    </div>
  )
}
