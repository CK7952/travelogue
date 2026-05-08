import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { fragmentApi, type CreateFragmentPayload } from '../api/fragments'
import type { DraftFragment } from '../types/travel'
import type { DraftPhoto } from './useDraftFragment'

interface UseFragmentActionsParams {
  currentTripId: number | null
  draftFragment: DraftFragment | null
  draftPhotos: DraftPhoto[]
  setDraftFragment: Dispatch<SetStateAction<DraftFragment | null>>
  setDraftPhotos: Dispatch<SetStateAction<DraftPhoto[]>>
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

  const transcribeRecording = async (blob: Blob) => {
    if (!currentTripId) {
      alert('请先选择或创建行程')
      return
    }

    setIsTranscribing(true)

    try {
      let latitude: number | undefined
      let longitude: number | undefined

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        latitude = position.coords.latitude
        longitude = position.coords.longitude
      } catch {
        // Ignore location failures and continue recording flow.
      }

      const file = new File([blob], 'recording.webm', { type: blob.type })
      const result = await fragmentApi.transcribe({
        tripId: currentTripId,
        audio: file,
        latitude,
        longitude,
      })

      const nextDraft: DraftFragment = {
        content: result.cleaned_text || result.raw_text,
        raw_text: result.raw_text,
        tags: result.suggested_tags || [],
        latitude,
        longitude,
      }

      resetDraft()
      setDraftFragment(nextDraft)
      setDraftPhotos([])
    } finally {
      setIsTranscribing(false)
    }
  }

  const choosePhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true

    input.onchange = () => {
      if (!input.files || !currentTripId || !draftFragment) return

      const files = Array.from(input.files).slice(0, 3 - draftPhotos.length)
      files.forEach((file) => {
        const previewUrl = URL.createObjectURL(file)
        setDraftPhotos((currentPhotos) => [...currentPhotos, { url: previewUrl, file }])
      })
    }

    input.click()
  }

  const saveDraftFragment = async () => {
    if (!draftFragment || !currentTripId) return

    const payload: CreateFragmentPayload = {
      trip_id: currentTripId,
      content: draftFragment.content,
      raw_text: draftFragment.raw_text,
      tags: draftFragment.tags,
    }

    if (draftFragment.latitude !== undefined && draftFragment.longitude !== undefined) {
      payload.latitude = draftFragment.latitude
      payload.longitude = draftFragment.longitude
    }

    const savedFragment = await fragmentApi.create(payload)

    if (draftPhotos.length > 0 && savedFragment.id) {
      for (const photo of draftPhotos) {
        try {
          await fragmentApi.uploadPhoto(savedFragment.id, photo.file)
        } catch {
          console.error('upload photo failed')
        }
      }
    }

    resetDraft()
    await loadFragments(currentTripId)
  }

  const deleteFragment = async (fragmentId: number) => {
    if (!window.confirm('确定删除这条记录吗？')) return
    if (!currentTripId) return

    await fragmentApi.remove(fragmentId)
    await loadFragments(currentTripId)
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
