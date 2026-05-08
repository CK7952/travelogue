import { request } from './request'
import type { CreateTripPayload, Trip, UpdateTripPayload } from '../../../shared/contracts/travel'

export const tripApi = {
  list() {
    return request<Trip[]>({ url: '/api/trips' })
  },

  create(payload: CreateTripPayload) {
    return request<Trip>({
      url: '/api/trips',
      method: 'POST',
      data: payload,
    })
  },

  update(tripId: number, payload: UpdateTripPayload) {
    return request<Trip>({
      url: `/api/trips/${tripId}`,
      method: 'PUT',
      data: payload,
    })
  },

  remove(tripId: number) {
    return request({
      url: `/api/trips/${tripId}`,
      method: 'DELETE',
    })
  },
}
