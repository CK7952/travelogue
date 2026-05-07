export const BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://travelogue-pkmg.onrender.com')

export async function request<T = any>(options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  headers?: Record<string, string>
}): Promise<T> {
  const { url, method = 'GET', data, headers = {} } = options
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...(data instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  }

  if (data) {
    if (data instanceof FormData) {
      fetchOptions.body = data
    } else {
      fetchOptions.body = JSON.stringify(data)
    }
  }

  const res = await fetch(fullUrl, fetchOptions)
  if (!res.ok) {
    const err = await res.text().catch(() => 'Request failed')
    throw new Error(err)
  }

  // 处理204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

export async function uploadFile(
  url: string,
  file: File | Blob,
  fieldName: string,
  formData?: Record<string, string>
): Promise<{ data: string }> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  const fd = new FormData()
  fd.append(fieldName, file)
  if (formData) {
    Object.entries(formData).forEach(([k, v]) => {
      fd.append(k, v)
    })
  }

  const res = await fetch(fullUrl, {
    method: 'POST',
    body: fd,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => 'Upload failed')
    throw new Error(err)
  }

  const text = await res.text()
  return { data: text }
}
