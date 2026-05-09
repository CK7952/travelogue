import { useEffect, useState } from 'react'
import type { Essay } from '../types/travel'
import { essayApi } from '../api/essays'

interface EssayViewerProps {
  essayId: number
  onClose: () => void
}

const STYLE_LABELS: Record<string, string> = {
  literary: '文艺散文',
  casual: '轻松碎碎念',
  observational: '博物观察',
}

export default function EssayViewer({ essayId, onClose }: EssayViewerProps) {
  const [essay, setEssay] = useState<Essay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    essayApi.get(essayId)
      .then((data) => {
        if (!cancelled) setEssay(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [essayId])

  return (
    <div className="essay-overlay" onClick={onClose}>
      <div className="essay-panel" onClick={(e) => e.stopPropagation()}>
        <button className="essay-close" onClick={onClose}>×</button>

        {loading && <div className="essay-empty">正在加载游记…</div>}

        {error && (
          <div className="essay-empty" style={{ color: 'var(--accent-clay)' }}>
            加载失败：{error}
          </div>
        )}

        {!loading && essay && (
          <div className="essay-body">
            <div className="essay-meta">
              <span className="essay-style">
                {STYLE_LABELS[essay.style] || essay.style}
              </span>
              <span className="essay-date">
                {new Date(essay.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>

            <h1 className="essay-title">
              {essay.title || '未命名游记'}
            </h1>

            <div className="essay-content">
              {essay.content ? (
                essay.content.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))
              ) : (
                <p style={{ color: 'var(--ink-fade)' }}>暂无内容</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
