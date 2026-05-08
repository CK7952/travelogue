import { useState } from 'react'
import Taro from '@tarojs/taro'
import type { Dispatch, SetStateAction } from 'react'
import { fragmentApi, type CreateFragmentPayload } from '../api/fragments'
import type { DraftFragment } from '../types/travel'

interface UseFragmentActionsParams {
  currentTripId: number | null
  draftFragment: DraftFragment | null
  draftPhotos: string[]
  setDraftFragment: Dispatch<SetStateAction<DraftFragment | null>>
  setDraftPhotos: Dispatch<SetStateAction<string[]>>
  clearDraft: () => void
  loadFragments: (tripId: number) => Promise<void>
}

export function useFragmentActions({
  currentTripId,
  draftFragment,
  draftPhotos,
  setDraftFragment,
  setDraftPhotos,
  clearDraft,
  loadFragments,
}: UseFragmentActionsParams) {
  const [isTranscribing, setIsTranscribing] = useState(false)

  const resetDraft = () => {
    clearDraft()
  }

  const transcribeRecording = async (filePath: string) => {
    if (!currentTripId) {
      Taro.showToast({ title: '请先选择或创建行程', icon: 'none' })
      return
    }

    setIsTranscribing(true)

    try {
      let latitude: number | undefined
      let longitude: number | undefined

      try {
        const location = await Taro.getLocation({ type: 'wgs84' })
        latitude = location.latitude
        longitude = location.longitude
      } catch {
        // Ignore location failures and continue recording flow.
      }

      const result = await fragmentApi.transcribe({
        tripId: currentTripId,
        filePath,
        latitude,
        longitude,
      })

      setDraftFragment({
        content: result.cleaned_text || result.raw_text,
        raw_text: result.raw_text,
        tags: result.suggested_tags || [],
        latitude,
        longitude,
      })
      setDraftPhotos([])
    } finally {
      setIsTranscribing(false)
    }
  }

  const choosePhoto = () => {
    Taro.chooseImage({
      count: 3 - draftPhotos.length,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        setDraftPhotos((currentPhotos) => [...currentPhotos, ...res.tempFilePaths])
      },
    })
  }

  const saveDraftFragment = async () => {
    if (!draftFragment || !currentTripId) return

    const payload: CreateFragmentPayload = {
      trip_id: currentTripId,
      content: draftFragment.content,
      raw_text: draftFragment.raw_text,
      tags: draftFragment.tags || [],
    }

    if (draftFragment.latitude !== undefined) {
      payload.latitude = draftFragment.latitude
    }

    if (draftFragment.longitude !== undefined) {
      payload.longitude = draftFragment.longitude
    }

    const savedFragment = await fragmentApi.create(payload)

    if (draftPhotos.length > 0 && savedFragment.id) {
      for (const photoPath of draftPhotos) {
        await fragmentApi.uploadPhoto(savedFragment.id, photoPath)
      }
    }

    resetDraft()
    await loadFragments(currentTripId)
    Taro.showToast({ title: '已保存', icon: 'success' })
  }

  const deleteFragment = async (fragmentId: number) => {
    const res = await Taro.showModal({
      title: '确认删除',
      content: '确定删除这条记录吗？',
      confirmColor: '#ff4d4f',
    })
    if (!res.confirm || !currentTripId) return

    await fragmentApi.remove(fragmentId)
    await loadFragments(currentTripId)
    Taro.showToast({ title: '已删除', icon: 'success' })
  }

  return {
    isTranscribing,
    resetDraft,
    transcribeRecording,
    choosePhoto,
    saveDraftFragment,
    deleteFragment,
  }
}
