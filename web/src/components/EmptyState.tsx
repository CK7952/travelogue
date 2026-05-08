export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <div className="empty-illustration-inner">
          <span style={{ fontSize: 40, color: '#c9a227' }}>✦</span>
        </div>
      </div>
      <p className="empty-text">还没有记录</p>
      <p className="empty-text">点击下方按钮，留下第一页吧</p>
    </div>
  )
}
