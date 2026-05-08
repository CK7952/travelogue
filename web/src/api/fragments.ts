import { request, uploadFile } from './request'
import type {
  CreateFragmentPayload,
  Fragment,
  TranscribeResult,
} from '../../../shared/contracts/travel'
export type { CreateFragmentPayload, TranscribeResult } from '../../../shared/contracts/travel'

export interface TranscribePayload {
  tripId: number
  audio: File | Blob
  latitude?: number
  longitude?: number
}

export const fragmentApi = {
  listByTrip(tripId: number) {
    return request<Fragment[]>({ url: `/api/fragments/trip/${tripId}` })
  },

  create(payload: CreateFragmentPayload) {
    return request<Fragment>({
      url: '/api/fragments',
      method: 'POST',
      data: payload,
    })
  },

  remove(fragmentId: number) {
    return request({
      url: `/api/fragments/${fragmentId}`,
      method: 'DELETE',
    })
  },

  async transcribe(payload: TranscribePayload) {
    const formData: Record<string, string> = {
      trip_id: String(payload.tripId),
    }

    if (payload.latitude !== undefined && payload.longitude !== undefined) {
      formData.latitude = String(payload.latitude)
      formData.longitude = String(payload.longitude)
    }

    const response = await uploadFile('/api/fragments/transcribe', payload.audio, 'audio', formData)
    return JSON.parse(response.data) as TranscribeResult
  },

  uploadPhoto(fragmentId: number, photo: File | Blob) {
    return uploadFile(`/api/fragments/${fragmentId}/photos`, photo, 'photo')
  },
}
