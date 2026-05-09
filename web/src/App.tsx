import { useEffect, useState } from 'react'
import MobileHeader from './components/MobileHeader'
import TripSidebar from './components/TripSidebar'
import TripHeader from './components/TripHeader'
import FragmentList from './components/FragmentList'
import RecorderBar from './components/RecorderBar'
import EssayViewer from './components/EssayViewer'
import { useTrips } from './hooks/useTrips'
import { useFragments } from './hooks/useFragments'
import { useDraftFragment } from './hooks/useDraftFragment'
import { useTripActions } from './hooks/useTripActions'
import { useFragmentActions } from './hooks/useFragmentActions'
import { essayApi } from './api/essays'
import './App.css'

export default function App() {
  const { trips, setTrips, currentTripId, setCurrentTripId, loadTrips } = useTrips()
  const { fragments, setFragments, loadFragments } = useFragments()
  const { draftFragment, setDraftFragment, draftPhotos, setDraftPhotos, clearDraft } = useDraftFragment()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewingEssayId, setViewingEssayId] = useState<number | null>(null)

  const viewLatestEssay = async (tripId: number) => {
    try {
      const essays = await essayApi.listByTrip(tripId)
      if (essays.length > 0) {
        setViewingEssayId(essays[0].id)
      } else {
        alert('该行程暂无游记')
      }
    } catch {
      alert('加载游记失败')
    }
  }

  const {
    isTranscribing,
    resetDraft,
    transcribeRecording,
    choosePhoto,
    saveDraftFragment,
    deleteFragment,
  } = useFragmentActions({
    currentTripId,
    draftFragment,
    draftPhotos,
    setDraftFragment,
    setDraftPhotos,
    clearDraft,
    loadFragments,
  })

  const {
    currentTrip,
    bootstrapTrips,
    selectTrip,
    createTrip,
    deleteTrip,
    finishTrip,
  } = useTripActions({
    trips,
    currentTripId,
    setTrips,
    setCurrentTripId,
    setFragments,
    loadTrips,
    loadFragments,
    resetDraft,
    closeSidebar: () => setSidebarOpen(false),
  })

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await bootstrapTrips()
      } catch (error) {
        console.error(error)
      }
    }

    void bootstrap()
  }, [])

  return (
    <div className="app">
      <MobileHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((currentOpen) => !currentOpen)}
      />

      <div className="layout">
        <TripSidebar
          trips={trips}
          currentTripId={currentTripId}
          currentTrip={currentTrip}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onCreateTrip={() => {
            void createTrip().catch(() => {
              alert('创建失败')
            })
          }}
          onSelectTrip={(tripId) => {
            void selectTrip(tripId).catch((error) => {
              console.error(error)
            })
          }}
          onDeleteTrip={(tripId) => {
            void deleteTrip(tripId).catch(() => {
              alert('删除失败')
            })
          }}
          onFinishTrip={() => {
            void finishTrip()
              .then((id) => {
                if (id) setViewingEssayId(id)
              })
              .catch(() => {
                alert('生成失败')
              })
          }}
          onViewEssays={viewLatestEssay}
        />

        <main className="main">
          <TripHeader
            title={currentTrip ? currentTrip.title : '旅行风物记'}
            destination={currentTrip?.destination}
          />

          <FragmentList
            fragments={fragments}
            draftFragment={draftFragment}
            draftPhotos={draftPhotos}
            onDeleteFragment={(fragmentId) => {
              void deleteFragment(fragmentId).catch(() => {
                alert('删除失败')
              })
            }}
            onChoosePhoto={choosePhoto}
            onSaveDraft={() => {
              void saveDraftFragment().catch(() => {
                alert('保存失败')
              })
            }}
            onDiscardDraft={resetDraft}
          />
        </main>
      </div>

      <RecorderBar
        isTranscribing={isTranscribing}
        onRecordComplete={(blob, _duration) => {
          void transcribeRecording(blob).catch(() => {
            alert('转写失败')
          })
        }}
      />

      {viewingEssayId !== null && (
        <EssayViewer
          essayId={viewingEssayId}
          onClose={() => setViewingEssayId(null)}
        />
      )}
    </div>
  )
}
