import Taro from '@tarojs/taro'

// 开发环境改成你的后端地址
export const BASE_URL = 'http://192.168.1.6:8000'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, header = {} } = options

  try {
    const res = await Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header,
      },
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data as T
    } else {
      throw new Error(`Request failed: ${res.statusCode}`)
    }
  } catch (err) {
    Taro.showToast({ title: '网络错误', icon: 'none' })
    throw err
  }
}

export function uploadFile(url: string, filePath: string, name: string, formData?: Record<string, any>) {
  return Taro.uploadFile({
    url: `${BASE_URL}${url}`,
    filePath,
    name,
    formData,
  })
}
