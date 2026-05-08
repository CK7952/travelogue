import type { DraftFragment } from '../types/travel'
import type { DraftPhoto } from '../hooks/useDraftFragment'

interface DraftFragmentCardProps {
  draftFragment: DraftFragment
  draftPhotos: DraftPhoto[]
  onChoosePhoto: () => void
  onSave: () => void
  onDiscard: () => void
}

export default function DraftFragmentCard({
  draftFragment,
  draftPhotos,
  onChoosePhoto,
  onSave,
  onDiscard,
}: DraftFragmentCardProps) {
  return (
    <div className="fragment-card draft">
      <div className="draft-badge">
        <span className="draft-label">AI 整理预览</span>
        <span className="draft-hint">点击保存确认</span>
      </div>

      <p className="fragment-content">{draftFragment.content}</p>

      {draftFragment.tags.length > 0 && (
        <div className="fragment-tags">
          {draftFragment.tags.map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {draftPhotos.length > 0 && (
        <div className="photo-list">
          {draftPhotos.map((photo, index) => (
            <div key={index} className="photo-wrapper">
              <img className="photo-thumb" src={photo.url} alt="" />
            </div>
          ))}
        </div>
      )}

      {draftPhotos.length < 3 && (
        <button className="add-photo-btn" onClick={onChoosePhoto}>
          <span className="add-photo-icon">+</span>
          <span className="add-photo-text">添加照片</span>
        </button>
      )}

      <div className="draft-actions">
        <button className="btn-save" onClick={onSave}>
          保存
        </button>
        <button className="btn-discard" onClick={onDiscard}>
          放弃
        </button>
      </div>
    </div>
  )
}
