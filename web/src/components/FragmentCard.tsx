import type { Fragment } from '../types/travel'

interface FragmentCardProps {
  fragment: Fragment
  onDelete: (fragmentId: number) => void
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    hour: date.getHours().toString().padStart(2, '0'),
    minute: date.getMinutes().toString().padStart(2, '0'),
  }
}

export default function FragmentCard({ fragment, onDelete }: FragmentCardProps) {
  const date = formatDate(fragment.recorded_at)

  return (
    <div className="fragment-card">
      <div className="fragment-header">
        <div className="date-stamp">
          <span className="date-day">{date.day}</span>
          <div className="date-rest">
            <span>{date.month}月</span>
            <span>
              {date.hour}:{date.minute}
            </span>
          </div>
        </div>

        <button className="fragment-delete" onClick={() => onDelete(fragment.id)}>
          删除
        </button>
      </div>

      <p className="fragment-content">{fragment.content}</p>

      {fragment.tags.length > 0 && (
        <div className="fragment-tags">
          {fragment.tags.map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {fragment.photos && fragment.photos.length > 0 && (
        <div className="photo-list">
          {fragment.photos.map((url, index) => (
            <div key={index} className="photo-wrapper">
              <img className="photo-thumb" src={`/uploads${url}`} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
