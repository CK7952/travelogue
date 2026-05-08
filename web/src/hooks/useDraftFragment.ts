import { useState } from 'react'
import type { DraftFragment } from '../types/travel'

export interface DraftPhoto {
  url: string
  file: File
}

export function useDraftFragment() {
  const [draftFragment, setDraftFragment] = useState<DraftFragment | null>(null)
  const [draftPhotos, setDraftPhotos] = useState<DraftPhoto[]>([])

  const clearDraft = () => {
    setDraftFragment(null)
    setDraftPhotos((currentPhotos) => {
      currentPhotos.forEach((photo) => {
        if (photo.url.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url)
        }
      })
      return []
    })
  }

  return {
    draftFragment,
    setDraftFragment,
    draftPhotos,
    setDraftPhotos,
    clearDraft,
  }
}
