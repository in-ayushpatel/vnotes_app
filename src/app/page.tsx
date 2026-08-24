'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true)
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err) setError(err === 'auth_failed' ? 'Authentication failed. Please try again.' : 'Login error. Please try again.')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '800px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(88,166,255,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </div>

      <div className={`relative z-10 flex flex-col items-center text-center max-w-2xl px-6 ${mounted ? 'fade-in' : 'opacity-0'}`}>
        {/* Logo mark */}
        <div style={{
          width: '72px', height: '72px', marginBottom: '24px',
          background: 'linear-gradient(135deg, #1f6feb 0%, #58a6ff 100%)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(88,166,255,0.25)',
          fontSize: '32px',
        }}>
          🧠
        </div>

        <h1 style={{
          fontSize: '3rem', fontWeight: '700', lineHeight: '1.15',
          background: 'linear-gradient(135deg, #e6edf3 0%, #8b949e 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
        }}>
          vNotes
        </h1>

        <p style={{
          fontSize: '1.125rem', color: 'var(--text-secondary)',
          marginBottom: '8px', lineHeight: '1.6',
        }}>
          Your notes. Your GitHub repo. Zero lock-in.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '40px' }}>
          Write in Markdown · Sync to GitHub · Access anywhere
        </p>

        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
            borderRadius: '8px', padding: '12px 20px', color: '#f85149',
            marginBottom: '24px', fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        <Link
          href="/api/auth/login"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
            color: '#ffffff', padding: '14px 28px',
            borderRadius: '10px', fontWeight: '600', fontSize: '1rem',
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(46,160,67,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'
            ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(46,160,67,0.4)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 16px rgba(46,160,67,0.3)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Continue with GitHub
        </Link>

        {/* Feature grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px', marginTop: '56px', width: '100%',
        }}>
          {[
            { icon: '📁', title: 'Folder-based', desc: 'Organize notes just like Obsidian' },
            { icon: '✍️', title: 'Markdown-native', desc: 'Full GFM support with live preview' },
            { icon: '🔄', title: 'GitHub-synced', desc: 'Every save is a Git commit' },
          ].map((f) => (
            <div key={f.title} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>{f.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p style={{ position: 'absolute', bottom: '24px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        Your notes live in your GitHub repo. Always.
      </p>
    </div>
  )
}
