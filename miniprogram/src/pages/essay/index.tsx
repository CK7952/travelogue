import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { request } from '../../api/request'
import './index.scss'

interface Essay {
  id: number
  title: string
  content: string
  style: string
  status: string
  created_at: string
}

const styleNames: Record<string, string> = {
  literary: '文艺散文',
  casual: '轻松碎碎念',
  observational: '博物观察',
}

export default function EssayPage() {
  const router = useRouter()
  const [essay, setEssay] = useState<Essay | null>(null)
  const essayId = router.params.id

  useEffect(() => {
    if (essayId) {
      loadEssay(Number(essayId))
    }
  }, [essayId])

  const loadEssay = async (id: number) => {
    try {
      const data = await request<Essay>({ url: `/api/essays/${id}` })
      setEssay(data)
    } catch (e) {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }
  }

  if (!essay) {
    return (
      <View className='essay-page'>
        <Text className='loading'>加载中...</Text>
      </View>
    )
  }

  // 简单按换行分段渲染
  const paragraphs = essay.content.split('\n').filter((p) => p.trim())

  return (
    <ScrollView className='essay-page' scrollY>
      <View className='essay-header'>
        <Text className='essay-style'>{styleNames[essay.style] || essay.style}</Text>
        <Text className='essay-title'>{essay.title}</Text>
        <Text className='essay-date'>
          {new Date(essay.created_at).toLocaleDateString('zh-CN')}
        </Text>
      </View>

      <View className='essay-body'>
        {paragraphs.map((p, i) => (
          <Text key={i} className='essay-paragraph'>
            {p}
          </Text>
        ))}
      </View>

      <View className='essay-footer'>
        <Text className='footer-hint'>— 由你的旅途碎片自动生成 —</Text>
      </View>
    </ScrollView>
  )
}
