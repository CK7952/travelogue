import { useState, useEffect, useCallback } from 'react'
import { request, uploadFile } from './api/request'
import Recorder from './components/Recorder'
import './App.css'

interface Trip {
  id: number
  title: string
  destination: string | null
  status: string
  created_at: string
}

interface Fragment {
  id: number
  trip_id: number
  content: string
  raw_text: string | null
  tags: string[]
  photos: string[] | null
  latitude: number | null
  longitude: number | null
  recorded_at: string
}

interface DraftFragment {
  content: string
  raw_text: string
  tags: string[]
  latitude?: number
  longitude?: number
}

export default function App() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [currentTripId, setCurrentTripId] = useState<number | null>(null)
  const [fragments, setFragments] = useState<Fragment[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [draftFragment, setDraftFragment] = useState<DraftFragment | null>(null)
  const [draftPhotos, setDraftPhotos] = useState<{ url: string; file: File }[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async () => {
    try {
      const data = await request<Trip[]>({ url: '/api/trips' })
      setTrips(data)
      const ongoing = data.find((t) => t.status === 'ongoing')
      if (ongoing) {
        setCurrentTripId(ongoing.id)
        loadFragments(ongoing.id)
      } else if (data.length > 0) {
        setCurrentTripId(data[0].id)
        loadFragments(data[0].id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadFragments = async (tripId: number) => {
    try {
      const data = await request<Fragment[]>({ url: `/api/fragments/trip/${tripId}` })
      setFragments(data)
    } catch (e) {
      console.error(e)
    }
  }

  const createTrip = async () => {
    const title = window.prompt('行程名称，如：大理三日')
    if (!title) return
    const destination = window.prompt('目的地（可选），如：云南大理')
    try {
      const newTrip = await request<Trip>({
        url: '/api/trips',
        method: 'POST',
        data: {
          title,
          destination: destination || undefined,
        },
      })
      setTrips((prev) => [newTrip, ...prev])
      setCurrentTripId(newTrip.id)
      setFragments([])
      setDraftFragment(null)
      setSidebarOpen(false)
    } catch {
      alert('创建失败')
    }
  }

  const handleRecordComplete = useCallback(
    async (blob: Blob, _duration: number) => {
      if (!currentTripId) {
        alert('请先选择或创建行程')
        return
      }
      setIsTranscribing(true)
      try {
        let latitude: number | undefined
        let longitude: number | undefined
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          latitude = pos.coords.latitude
          longitude = pos.coords.longitude
        } catch {
          // ignore
        }

        const file = new File([blob], 'recording.webm', { type: blob.type })
        const formData: Record<string, string> = { trip_id: String(currentTripId) }
        if (latitude !== undefined) {
          formData.latitude = String(latitude)
          formData.longitude = String(longitude!)
        }

        const uploadRes = await uploadFile('/api/fragments/transcribe', file, 'audio', formData)
        const result = JSON.parse(uploadRes.data)
        setDraftFragment({
          content: result.cleaned_text || result.raw_text,
          raw_text: result.raw_text,
          tags: result.suggested_tags || [],
          latitude,
          longitude,
        })
        setDraftPhotos([])
      } catch {
        alert('转写失败')
      } finally {
        setIsTranscribing(false)
      }
    },
    [currentTripId]
  )

  const choosePhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      if (!input.files || !currentTripId || !draftFragment) return
      const files = Array.from(input.files).slice(0, 3 - draftPhotos.length)
      for (const file of files) {
        try {
          const previewUrl = URL.createObjectURL(file)
          setDraftPhotos((prev) => [...prev, { url: previewUrl, file }])
        } catch {
          alert('选择照片失败')
        }
      }
    }
    input.click()
  }

  const saveFragment = async () => {
    if (!draftFragment || !currentTripId) return
    try {
      const payload: Record<string, any> = {
        trip_id: currentTripId,
        content: draftFragment.content,
        raw_text: draftFragment.raw_text,
        tags: draftFragment.tags || [],
      }
      if (draftFragment.latitude !== undefined) {
        payload.latitude = draftFragment.latitude
        payload.longitude = draftFragment.longitude
      }
      const savedFragment = await request<Fragment>({
        url: '/api/fragments',
        method: 'POST',
        data: payload,
      })

      if (draftPhotos.length > 0 && savedFragment.id) {
        for (const photo of draftPhotos) {
          try {
            await uploadFile(`/api/fragments/${savedFragment.id}/photos`, photo.file, 'photo')
          } catch {
            console.error('upload photo failed')
          }
        }
      }

      setDraftFragment(null)
      setDraftPhotos([])
      loadFragments(currentTripId)
    } catch {
      alert('保存失败')
    }
  }

  const discardFragment = () => {
    draftPhotos.forEach((photo) => {
      if (photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url)
    })
    setDraftFragment(null)
    setDraftPhotos([])
  }

  const deleteTrip = async (tripId: number) => {
    if (!window.confirm('删除此行程？')) return
    try {
      await request({ url: `/api/trips/${tripId}`, method: 'DELETE' })
      const updated = trips.filter((t) => t.id !== tripId)
      setTrips(updated)
      if (currentTripId === tripId) {
        setCurrentTripId(updated.length > 0 ? updated[0].id : null)
        setFragments([])
      }
    } catch {
      alert('删除失败')
    }
  }

  const deleteFragment = async (fragmentId: number) => {
    if (!window.confirm('确定删除这条记录吗？')) return
    try {
      await request({ url: `/api/fragments/${fragmentId}`, method: 'DELETE' })
      if (currentTripId) loadFragments(currentTripId)
    } catch {
      alert('删除失败')
    }
  }

  const finishTrip = async () => {
    if (!currentTripId) return
    const styles = [
      { label: '文艺散文', value: 'literary' },
      { label: '轻松碎碎念', value: 'casual' },
      { label: '博物观察', value: 'observational' },
    ]
    const choice = window.prompt(
      '选择小记风格（输入数字）：\n1. 文艺散文\n2. 轻松碎碎念\n3. 博物观察'
    )
    if (!choice) return
    const idx = parseInt(choice, 10) - 1
    if (idx < 0 || idx >= styles.length) return
    const style = styles[idx].value

    try {
      await request({
        url: `/api/trips/${currentTripId}`,
        method: 'PUT',
        data: { status: 'completed' },
      })
      const essay = await request<{ id: number }>({
        url: '/api/essays/generate',
        method: 'POST',
        data: { trip_id: currentTripId, style },
      })
      alert('小记已生成！')
      console.log('essay id:', essay.id)
      loadTrips()
    } catch {
      alert('生成失败')
    }
  }

  const currentTrip = trips.find((t) => t.id === currentTripId)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      hour: d.getHours().toString().padStart(2, '0'),
      minute: d.getMinutes().toString().padStart(2, '0'),
    }
  }

  return (
    <div className="app">
      {/* 移动端顶部栏 */}
      <div className="mobile-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <div className="mobile-brand">
          <span className="brand-title">旅行风物志</span>
          <span className="brand-sub">TRAVEL JOURNAL</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="layout">
        {/* 侧边栏 */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand">
            <h1 className="brand-title">旅行风物志</h1>
            <p className="brand-sub">TRAVEL JOURNAL</p>
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-label">我的行程</span>
              <button className="add-trip-btn" onClick={createTrip}>+ 新建</button>
            </div>
            <div className="trip-list">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className={`trip-item ${trip.id === currentTripId ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentTripId(trip.id)
                    loadFragments(trip.id)
                    setDraftFragment(null)
                    setSidebarOpen(false)
                  }}
                >
                  <div className="trip-item-main">
                    <span className="trip-item-title">{trip.title}</span>
                    <span className={`trip-item-status ${trip.status}`}>
                      {trip.status === 'ongoing' ? '进行中' : '已结束'}
                    </span>
                  </div>
                  {trip.destination && (
                    <span className="trip-item-dest">{trip.destination}</span>
                  )}
                  {trip.status !== 'ongoing' && (
                    <button
                      className="trip-item-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTrip(trip.id)
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {trips.length === 0 && (
                <div className="empty-trips">暂无行程，点击新建开始记录</div>
              )}
            </div>
          </div>

          {currentTrip && (
            <div className="sidebar-footer">
              <div className="current-trip-bar">
                <span className="current-trip-name">{currentTrip.title}</span>
                {currentTrip.status === 'ongoing' && (
                  <button className="finish-btn" onClick={finishTrip}>
                    结束行程
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* 遮罩 */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* 主内容区 */}
        <main className="main">
          {/* 桌面端标题 */}
          <div className="desktop-header">
            <h2 className="page-title">
              {currentTrip ? currentTrip.title : '旅行风物志'}
            </h2>
            {currentTrip?.destination && (
              <p className="page-subtitle">{currentTrip.destination}</p>
            )}
          </div>

          <div className="content">
            {fragments.length === 0 && !draftFragment && (
              <div className="empty-state">
                <div className="empty-illustration">
                  <div className="empty-illustration-inner">
                    <span style={{ fontSize: 40, color: '#c9a227' }}>✦</span>
                  </div>
                </div>
                <p className="empty-text">还没有记录</p>
                <p className="empty-text">点击下方按钮，留下第一页吧</p>
              </div>
            )}

            <div className="fragment-grid">
              {fragments.map((f) => {
                const d = formatDate(f.recorded_at)
                return (
                  <div key={f.id} className="fragment-card">
                    <div className="fragment-header">
                      <div className="date-stamp">
                        <span className="date-day">{d.day}</span>
                        <div className="date-rest">
                          <span>{d.month}月</span>
                          <span>{d.hour}:{d.minute}</span>
                        </div>
                      </div>
                      <button
                        className="fragment-delete"
                        onClick={() => deleteFragment(f.id)}
                      >
                        删除
                      </button>
                    </div>
                    <p className="fragment-content">{f.content}</p>
                    {f.tags && f.tags.length > 0 && (
                      <div className="fragment-tags">
                        {f.tags.map((tag) => (
                          <span key={tag} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                    {f.photos && f.photos.length > 0 && (
                      <div className="photo-list">
                        {f.photos.map((url, idx) => (
                          <div key={idx} className="photo-wrapper">
                            <img
                              className="photo-thumb"
                              src={`/uploads${url}`}
                              alt=""
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 草稿卡片 */}
              {draftFragment && (
                <div className="fragment-card draft">
                  <div className="draft-badge">
                    <span className="draft-label">AI 整理预览</span>
                    <span className="draft-hint">点击保存确认</span>
                  </div>
                  <p className="fragment-content">{draftFragment.content}</p>
                  {draftFragment.tags.length > 0 && (
                    <div className="fragment-tags">
                      {draftFragment.tags.map((tag) => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                  {draftPhotos.length > 0 && (
                    <div className="photo-list">
                      {draftPhotos.map((photo, idx) => (
                        <div key={idx} className="photo-wrapper">
                          <img className="photo-thumb" src={photo.url} alt="" />
                        </div>
                      ))}
                    </div>
                  )}
                  {draftPhotos.length < 3 && (
                    <button className="add-photo-btn" onClick={choosePhoto}>
                      <span className="add-photo-icon">+</span>
                      <span className="add-photo-text">添加照片</span>
                    </button>
                  )}
                  <div className="draft-actions">
                    <button className="btn-save" onClick={saveFragment}>
                      保存
                    </button>
                    <button className="btn-discard" onClick={discardFragment}>
                      放弃
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 底部录音区 */}
      <div className="recorder-bar">
        {isTranscribing ? (
          <div className="transcribing-hint">
            <span className="spinner" />
            <span>正在转写语音...</span>
          </div>
        ) : (
          <Recorder onRecordComplete={handleRecordComplete} />
        )}
      </div>
    </div>
  )
}
