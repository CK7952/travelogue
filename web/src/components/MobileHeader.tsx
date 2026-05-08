interface MobileHeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export default function MobileHeader({ sidebarOpen, onToggleSidebar }: MobileHeaderProps) {
  return (
    <div className="mobile-header">
      <button className="menu-btn" onClick={onToggleSidebar}>
        {sidebarOpen ? '×' : '☰'}
      </button>
      <div className="mobile-brand">
        <span className="brand-title">旅行风物记</span>
        <span className="brand-sub">TRAVEL JOURNAL</span>
      </div>
      <div style={{ width: 40 }} />
    </div>
  )
}
