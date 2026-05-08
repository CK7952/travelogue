import { useState } from 'react'
import type { DraftFragment } from '../types/travel'

export function useDraftFragment() {
  const [draftFragment, setDraftFragment] = useState<DraftFragment | null>(null)
  const [draftPhotos, setDraftPhotos] = useState<string[]>([])

  const clearDraft = () => {
    setDraftFragment(null)
    setDraftPhotos([])
  }

  return {
    draftFragment,
    setDraftFragment,
    draftPhotos,
    setDraftPhotos,
    clearDraft,
  }
}
