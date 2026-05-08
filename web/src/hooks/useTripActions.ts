import { useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { tripApi } from '../api/trips'
import { essayApi } from '../api/essays'
import type { Fragment, Trip } from '../types/travel'

interface UseTripActionsParams {
  trips: Trip[]
  currentTripId: number | null
  setTrips: Dispatch<SetStateAction<Trip[]>>
  setCurrentTripId: Dispatch<SetStateAction<number | null>>
  setFragments: Dispatch<SetStateAction<Fragment[]>>
  loadTrips: () => Promise<number | null>
  loadFragments: (tripId: number) => Promise<void>
  resetDraft: () => void
  closeSidebar: () => void
}

const ESSAY_STYLES = [
  { label: '文艺散文', value: 'literary' },
  { label: '轻松碎碎念', value: 'casual' },
  { label: '博物观察', value: 'observational' },
] as const

export function useTripActions({
  trips,
  currentTripId,
  setTrips,
  setCurrentTripId,
  setFragments,
  loadTrips,
  loadFragments,
  resetDraft,
  closeSidebar,
}: UseTripActionsParams) {
  const currentTrip = useMemo(
    () => trips.find((trip) => trip.id === currentTripId),
    [trips, currentTripId]
  )

  const bootstrapTrips = async () => {
    const tripId = await loadTrips()
    if (tripId) {
      await loadFragments(tripId)
    }
  }

  const selectTrip = async (tripId: number) => {
    setCurrentTripId(tripId)
    resetDraft()
    closeSidebar()
    await loadFragments(tripId)
  }

  const createTrip = async () => {
    const title = window.prompt('行程名称，如：大理三日')
    if (!title) return

    const destination = window.prompt('目的地（可选），如：云南大理')

    const newTrip = await tripApi.create({
      title,
      destination: destination || undefined,
    })

    setTrips((currentTrips) => [newTrip, ...currentTrips])
    setCurrentTripId(newTrip.id)
    setFragments([])
    resetDraft()
    closeSidebar()
  }

  const deleteTrip = async (tripId: number) => {
    if (!window.confirm('删除此行程？')) return

    await tripApi.remove(tripId)
    const updatedTrips = trips.filter((trip) => trip.id !== tripId)
    setTrips(updatedTrips)

    if (currentTripId !== tripId) {
      return
    }

    const nextTripId = updatedTrips.length > 0 ? updatedTrips[0].id : null
    setCurrentTripId(nextTripId)
    resetDraft()

    if (nextTripId) {
      await loadFragments(nextTripId)
      return
    }

    setFragments([])
  }

  const finishTrip = async () => {
    if (!currentTripId) return

    const choice = window.prompt(
      '选择游记风格（输入数字）：\n1. 文艺散文\n2. 轻松碎碎念\n3. 博物观察'
    )
    if (!choice) return

    const selectedIndex = parseInt(choice, 10) - 1
    if (selectedIndex < 0 || selectedIndex >= ESSAY_STYLES.length) return

    await tripApi.update(currentTripId, { status: 'completed' })
    const essay = await essayApi.generate({
      trip_id: currentTripId,
      style: ESSAY_STYLES[selectedIndex].value,
    })

    alert('游记已生成！')
    console.log('essay id:', essay.id)

    const nextTripId = await loadTrips()
    if (nextTripId) {
      await loadFragments(nextTripId)
      return
    }

    setFragments([])
  }

  return {
    currentTrip,
    bootstrapTrips,
    selectTrip,
    createTrip,
    deleteTrip,
    finishTrip,
  }
}
