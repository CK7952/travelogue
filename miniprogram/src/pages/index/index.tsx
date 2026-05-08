import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import Recorder from '../../components/Recorder'
import TripTabs from '../../components/TripTabs'
import TripInfoBar from '../../components/TripInfoBar'
import FragmentFeed from '../../components/FragmentFeed'
import { useTrips } from '../../hooks/useTrips'
import { useFragments } from '../../hooks/useFragments'
import { useDraftFragment } from '../../hooks/useDraftFragment'
import { useTripActions } from '../../hooks/useTripActions'
import { useFragmentActions } from '../../hooks/useFragmentActions'
import './index.scss'

export default function Index() {
  const { trips, setTrips, currentTripId, setCurrentTripId, loadTrips } = useTrips()
  const { fragments, setFragments, loadFragments } = useFragments()
  const { draftFragment, setDraftFragment, draftPhotos, setDraftPhotos, clearDraft } = useDraftFragment()

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

  const { bootstrapTrips, selectTrip, createTrip, deleteTrip, finishTrip } = useTripActions({
    trips,
    currentTripId,
    setTrips,
    setCurrentTripId,
    setFragments,
    loadTrips,
    loadFragments,
    resetDraft,
  })

  useEffect(() => {
    void bootstrapTrips().catch((error) => {
      console.error(error)
    })
  }, [])

  const currentTrip = trips.find((trip) => trip.id === currentTripId)

  return (
    <View className='index-page'>
      <View className='page-glow page-glow-left' />
      <View className='page-glow page-glow-right' />

      <View className='journal-header'>
        <Text className='journal-kicker'>TRAVEL JOURNAL</Text>
        <Text className='journal-title'>旅途手札</Text>
        <Text className='journal-subtitle'>把风、光影和转瞬即逝的心情，安静收藏进今天。</Text>
      </View>

      <TripTabs
        trips={trips}
        currentTripId={currentTripId}
        onCreateTrip={createTrip}
        onSelectTrip={(tripId) => {
          void selectTrip(tripId).catch((error) => {
            console.error(error)
          })
        }}
        onDeleteTrip={(tripId) => {
          void deleteTrip(tripId).catch(() => {
            Taro.showToast({ title: '删除失败', icon: 'none' })
          })
        }}
      />

      {currentTrip && <TripInfoBar currentTrip={currentTrip} onFinishTrip={finishTrip} />}

      <FragmentFeed
        fragments={fragments}
        draftFragment={draftFragment}
        draftPhotos={draftPhotos}
        onDeleteFragment={(fragmentId) => {
          void deleteFragment(fragmentId).catch(() => {
            Taro.showToast({ title: '删除失败', icon: 'none' })
          })
        }}
        onChoosePhoto={choosePhoto}
        onSaveDraft={() => {
          void saveDraftFragment().catch(() => {
            Taro.showToast({ title: '保存失败', icon: 'none' })
          })
        }}
        onDiscardDraft={resetDraft}
      />

      <View className='recorder-section'>
        {isTranscribing ? (
          <View className='transcribing-hint'>
            <Text>正在整理你的语音片段...</Text>
          </View>
        ) : (
          <Recorder
            onRecordComplete={(filePath, _duration) => {
              void transcribeRecording(filePath).catch(() => {
                Taro.showToast({ title: '转写失败', icon: 'none' })
              })
            }}
          />
        )}
      </View>
    </View>
  )
}
