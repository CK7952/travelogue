import type { Trip } from '../types/travel'

interface TripSidebarProps {
  trips: Trip[]
  currentTripId: number | null
  currentTrip?: Trip
  sidebarOpen: boolean
  onCloseSidebar: () => void
  onCreateTrip: () => void
  onSelectTrip: (tripId: number) => void
  onDeleteTrip: (tripId: number) => void
  onFinishTrip: () => void
}

export default function TripSidebar({
  trips,
  currentTripId,
  currentTrip,
  sidebarOpen,
  onCloseSidebar,
  onCreateTrip,
  onSelectTrip,
  onDeleteTrip,
  onFinishTrip,
}: TripSidebarProps) {
  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h1 className="brand-title">旅行风物记</h1>
          <p className="brand-sub">TRAVEL JOURNAL</p>
        </div>

        <div className="sidebar-section">
          <div className="section-header">
            <span className="section-label">我的行程</span>
            <button className="add-trip-btn" onClick={onCreateTrip}>
              + 新建
            </button>
          </div>

          <div className="trip-list">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className={`trip-item ${trip.id === currentTripId ? 'active' : ''}`}
                onClick={() => onSelectTrip(trip.id)}
              >
                <div className="trip-item-main">
                  <span className="trip-item-title">{trip.title}</span>
                  <span className={`trip-item-status ${trip.status}`}>
                    {trip.status === 'ongoing' ? '进行中' : '已结束'}
                  </span>
                </div>

                {trip.destination && <span className="trip-item-dest">{trip.destination}</span>}

                {trip.status !== 'ongoing' && (
                  <button
                    className="trip-item-delete"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDeleteTrip(trip.id)
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {trips.length === 0 && <div className="empty-trips">暂无行程，点击新建开始记录</div>}
          </div>
        </div>

        {currentTrip && (
          <div className="sidebar-footer">
            <div className="current-trip-bar">
              <span className="current-trip-name">{currentTrip.title}</span>
              {currentTrip.status === 'ongoing' && (
                <button className="finish-btn" onClick={onFinishTrip}>
                  结束行程
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={onCloseSidebar} />}
    </>
  )
}
