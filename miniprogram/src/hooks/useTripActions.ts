import type { Dispatch, SetStateAction } from 'react'
import Taro from '@tarojs/taro'
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
}

const ESSAY_STYLES = ['literary', 'casual', 'observational'] as const

interface PromptResult {
  confirm: boolean
  content?: string
}

async function promptTextInput(title: string, placeholderText: string) {
  return Taro.showModal({
    title,
    placeholderText,
    editable: true,
  } as never) as Promise<PromptResult>
}

export function useTripActions({
  trips,
  currentTripId,
  setTrips,
  setCurrentTripId,
  setFragments,
  loadTrips,
  loadFragments,
  resetDraft,
}: UseTripActionsParams) {
  const bootstrapTrips = async () => {
    const tripId = await loadTrips()
    if (tripId) {
      await loadFragments(tripId)
    }
  }

  const selectTrip = async (tripId: number) => {
    setCurrentTripId(tripId)
    resetDraft()
    await loadFragments(tripId)
  }

  const createTrip = () => {
    void (async () => {
      const titleRes = await promptTextInput('新建行程', '行程名称，如：大理三日')
      if (!titleRes.confirm || !titleRes.content) return

      const destRes = await promptTextInput('添加目的地', '目的地（可选），如：云南大理')

      try {
        const newTrip = await tripApi.create({
          title: titleRes.content,
          destination: destRes.confirm && destRes.content ? destRes.content : undefined,
        })
        setTrips((currentTrips) => [newTrip, ...currentTrips])
        setCurrentTripId(newTrip.id)
        setFragments([])
        resetDraft()
        Taro.showToast({ title: '创建成功', icon: 'success' })
      } catch {
        Taro.showToast({ title: '创建失败', icon: 'none' })
      }
    })()
  }

  const deleteTrip = async (tripId: number) => {
    await tripApi.remove(tripId)
    const updatedTrips = trips.filter((trip) => trip.id !== tripId)
    setTrips(updatedTrips)

    if (currentTripId !== tripId) {
      Taro.showToast({ title: '已删除', icon: 'success' })
      return
    }

    const nextTripId = updatedTrips.length > 0 ? updatedTrips[0].id : null
    setCurrentTripId(nextTripId)
    resetDraft()

    if (nextTripId) {
      await loadFragments(nextTripId)
    } else {
      setFragments([])
    }

    Taro.showToast({ title: '已删除', icon: 'success' })
  }

  const finishTrip = () => {
    if (!currentTripId) return

    Taro.showActionSheet({
      itemList: ['文艺散文', '轻松碎碎念', '博物观察'],
      success: async (res) => {
        const style = ESSAY_STYLES[res.tapIndex]
        Taro.showLoading({ title: '生成中...' })

        try {
          await tripApi.update(currentTripId, { status: 'completed' })
          const essay = await essayApi.generate({
            trip_id: currentTripId,
            style,
          })

          Taro.hideLoading()
          Taro.navigateTo({ url: `/pages/essay/index?id=${essay.id}` })
          await bootstrapTrips()
        } catch {
          Taro.hideLoading()
          Taro.showToast({ title: '生成失败', icon: 'none' })
        }
      },
    })
  }

  return {
    bootstrapTrips,
    selectTrip,
    createTrip,
    deleteTrip,
    finishTrip,
  }
}
