import { request } from './request'
import type { EssayGenerateResponse, GenerateEssayPayload } from '../../../shared/contracts/travel'

export const essayApi = {
  generate(payload: GenerateEssayPayload) {
    return request<EssayGenerateResponse>({
      url: '/api/essays/generate',
      method: 'POST',
      data: payload,
    })
  },
}
