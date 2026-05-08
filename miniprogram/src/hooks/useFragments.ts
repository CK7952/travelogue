import { useState } from 'react'
import { fragmentApi } from '../api/fragments'
import type { Fragment } from '../types/travel'

export function useFragments() {
  const [fragments, setFragments] = useState<Fragment[]>([])

  const loadFragments = async (tripId: number) => {
    const data = await fragmentApi.listByTrip(tripId)
    setFragments(data)
  }

  return {
    fragments,
    setFragments,
    loadFragments,
  }
}
