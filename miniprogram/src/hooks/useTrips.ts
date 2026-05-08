import { useState } from 'react'
import { tripApi } from '../api/trips'
import type { Trip } from '../types/travel'

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [currentTripId, setCurrentTripId] = useState<number | null>(null)

  const loadTrips = async () => {
    const data = await tripApi.list()
    setTrips(data)

    const ongoing = data.find((trip) => trip.status === 'ongoing')
    if (ongoing) {
      setCurrentTripId(ongoing.id)
      return ongoing.id
    }

    if (data.length > 0) {
      setCurrentTripId(data[0].id)
      return data[0].id
    }

    setCurrentTripId(null)
    return null
  }

  return {
    trips,
    setTrips,
    currentTripId,
    setCurrentTripId,
    loadTrips,
  }
}
