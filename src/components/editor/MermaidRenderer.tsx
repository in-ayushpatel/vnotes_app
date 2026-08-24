'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose', // allow clicks if any
  fontFamily: 'inherit',
})

// Generate a sequential ID to avoid DOM collisions
let mermaidIdCounter = 0

export function MermaidRenderer({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const renderChart = async () => {
      if (!chart.trim()) return

      try {
        const id = `mermaid-svg-${mermaidIdCounter++}`
        // mermaidAPI.render() returns a promise in mermaid v10+ which yields { svg }
        const { svg: svgCode } = await mermaid.mermaidAPI.render(id, chart)
        
        if (isMounted) {
          setSvg(svgCode)
          setError(null)
        }
      } catch (err: unknown) {
        if (isMounted) {
          // Mermaid sometimes throws a string or weird object
          const mermaidError = err as { message?: string; str?: string }
          setError(mermaidError.message || mermaidError.str || 'Syntax error in mermaid diagram')
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
    }
  }, [chart])

  if (error) {
    return (
      <div style={{ 
        padding: '16px', 
        background: 'rgba(248,81,73,0.1)', 
        border: '1px solid var(--danger)', 
        borderRadius: '6px',
        color: 'var(--danger)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Mermaid Render Error</div>
        {error}
      </div>
    )
  }

  if (!svg) {
    return <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Rendering...</div>
  }

  return (
    <div 
      ref={containerRef} 
      dangerouslySetInnerHTML={{ __html: svg }} 
      style={{
        display: 'flex', 
        justifyContent: 'center', 
        padding: '16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        margin: '1em 0',
      }} 
    />
  )
}
