import { request } from './request'
import type { Essay, EssayGenerateResponse, GenerateEssayPayload } from '../../../shared/contracts/travel'

export const essayApi = {
  generate(payload: GenerateEssayPayload) {
    return request<EssayGenerateResponse>({
      url: '/api/essays/generate',
      method: 'POST',
      data: payload,
    })
  },
  get(id: number) {
    return request<Essay>({
      url: `/api/essays/${id}`,
      method: 'GET',
    })
  },
  listByTrip(tripId: number) {
    return request<Essay[]>({
      url: `/api/essays/trip/${tripId}`,
      method: 'GET',
    })
  },
}
