export interface Trip {
  id: number
  title: string
  destination: string | null
  status: string
  created_at: string
}

export interface Fragment {
  id: number
  trip_id: number
  content: string
  raw_text: string | null
  tags: string[]
  photos: string[] | null
  latitude: number | null
  longitude: number | null
  recorded_at: string
}

export interface DraftFragment {
  content: string
  raw_text: string
  tags: string[]
  latitude?: number
  longitude?: number
}

export interface CreateTripPayload {
  title: string
  destination?: string
}

export interface UpdateTripPayload {
  title?: string
  destination?: string
  status?: string
}

export interface CreateFragmentPayload {
  trip_id: number
  content: string
  raw_text: string
  tags: string[]
  latitude?: number
  longitude?: number
}

export interface TranscribeResult {
  cleaned_text?: string
  raw_text: string
  suggested_tags?: string[]
}

export interface GenerateEssayPayload {
  trip_id: number
  style: string
}

export interface Essay {
  id: number
  trip_id: number
  title: string | null
  content: string | null
  style: string
  status: string
  created_at: string
}

export interface EssayGenerateResponse {
  id: number
}
