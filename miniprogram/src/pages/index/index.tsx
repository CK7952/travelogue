import { useState, useEffect, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import { request, uploadFile, BASE_URL } from '../../api/request'
import Recorder from '../../components/Recorder'
import './index.scss'

interface Trip {
  id: number
  title: string
  destination: string
  status: string
  created_at: string
}

export default function Index() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [currentTripId, setCurrentTripId] = useState<number | null>(null)
  const [fragments, setFragments] = useState<any[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [draftFragment, setDraftFragment] = useState<any>(null)
  const [draftPhotos, setDraftPhotos] = useState<string[]>([])

  // 加载行程列表
  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async () => {
    try {
      const data = await request<Trip[]>({ url: '/api/trips' })
      setTrips(data)
      // 默认选中第一个进行中的行程
      const ongoing = data.find((t) => t.status === 'ongoing')
      if (ongoing) {
        setCurrentTripId(ongoing.id)
        loadFragments(ongoing.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadFragments = async (tripId: number) => {
    try {
      const data = await request({ url: `/api/fragments/trip/${tripId}` })
      setFragments(data)
    } catch (e) {
      console.error(e)
    }
  }

  // 创建新行程
  const createTrip = () => {
    Taro.showModal({
      title: '新建行程',
      editable: true,
      placeholderText: '行程名称，如：大理三日',
      success: (titleRes) => {
        if (!titleRes.confirm || !titleRes.content) return
        Taro.showModal({
          title: '添加目的地',
          editable: true,
          placeholderText: '目的地（可选），如：云南大理',
          success: (destRes) => {
            request<Trip>({
              url: '/api/trips',
              method: 'POST',
              data: {
                title: titleRes.content,
                destination: destRes.confirm && destRes.content ? destRes.content : undefined,
              },
            })
              .then((newTrip) => {
                setTrips([newTrip, ...trips])
                setCurrentTripId(newTrip.id)
                setFragments([])
                Taro.showToast({ title: '创建成功', icon: 'success' })
              })
              .catch(() => {
                Taro.showToast({ title: '创建失败', icon: 'none' })
              })
          },
        })
      },
    })
  }

  // 录音完成回调
  const handleRecordComplete = useCallback(
    async (filePath: string, duration: number) => {
      if (!currentTripId) {
        Taro.showToast({ title: '请先选择或创建行程', icon: 'none' })
        return
      }

      setIsTranscribing(true)
      try {
        // 获取位置
        let latitude: number | undefined
        let longitude: number | undefined
        try {
          const loc = await Taro.getLocation({ type: 'wgs84' })
          latitude = loc.latitude
          longitude = loc.longitude
        } catch (e) {
          // 位置获取失败继续
        }

        // 上传语音并转写
        const formData: Record<string, string> = {
          trip_id: String(currentTripId),
        }
        if (latitude !== undefined) {
          formData.latitude = String(latitude)
        }
        if (longitude !== undefined) {
          formData.longitude = String(longitude)
        }

        const uploadRes = await uploadFile(
          '/api/fragments/transcribe',
          filePath,
          'audio',
          formData
        )

        const result = JSON.parse(uploadRes.data)
        setDraftFragment({
          content: result.cleaned_text || result.raw_text,
          raw_text: result.raw_text,
          tags: result.suggested_tags || [],
          latitude,
          longitude,
        })
        setDraftPhotos([])
      } catch (e) {
        Taro.showToast({ title: '转写失败', icon: 'none' })
      } finally {
        setIsTranscribing(false)
      }
    },
    [currentTripId]
  )

  // 选择/拍照
  const choosePhoto = () => {
    Taro.chooseImage({
      count: 3 - draftPhotos.length,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        setDraftPhotos([...draftPhotos, ...res.tempFilePaths])
      },
    })
  }

  // 保存碎片
  const saveFragment = async () => {
    if (!draftFragment || !currentTripId) return
    try {
      const payload: Record<string, any> = {
        trip_id: currentTripId,
        content: draftFragment.content,
        raw_text: draftFragment.raw_text,
        tags: draftFragment.tags || [],
      }
      if (draftFragment.latitude !== undefined && draftFragment.latitude !== '') {
        payload.latitude = draftFragment.latitude
      }
      if (draftFragment.longitude !== undefined && draftFragment.longitude !== '') {
        payload.longitude = draftFragment.longitude
      }
      const savedFragment = await request<any>({
        url: '/api/fragments',
        method: 'POST',
        data: payload,
      })

      // 上传照片
      if (draftPhotos.length > 0 && savedFragment.id) {
        for (const photoPath of draftPhotos) {
          await uploadFile(`/api/fragments/${savedFragment.id}/photos`, photoPath, 'photo')
        }
      }

      setDraftFragment(null)
      setDraftPhotos([])
      loadFragments(currentTripId)
      Taro.showToast({ title: '已保存', icon: 'success' })
    } catch (e) {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    }
  }

  // 放弃碎片
  const discardFragment = () => {
    setDraftFragment(null)
    setDraftPhotos([])
  }

  // 删除行程
  const deleteTrip = (tripId: number) => {
    request({
      url: `/api/trips/${tripId}`,
      method: 'DELETE',
    })
      .then(() => {
        const updated = trips.filter((t) => t.id !== tripId)
        setTrips(updated)
        if (currentTripId === tripId) {
          setCurrentTripId(updated.length > 0 ? updated[0].id : null)
          setFragments([])
        }
        Taro.showToast({ title: '已删除', icon: 'success' })
      })
      .catch(() => {
        Taro.showToast({ title: '删除失败', icon: 'none' })
      })
  }

  // 删除碎片
  const deleteFragment = async (fragmentId: number) => {
    const res = await Taro.showModal({
      title: '确认删除',
      content: '确定删除这条记录吗？',
      confirmColor: '#ff4d4f',
    })
    if (!res.confirm) return
    try {
      await request({
        url: `/api/fragments/${fragmentId}`,
        method: 'DELETE',
      })
      if (currentTripId) {
        loadFragments(currentTripId)
      }
      Taro.showToast({ title: '已删除', icon: 'success' })
    } catch (e) {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  // 结束行程并生成小记
  const finishTrip = async () => {
    if (!currentTripId) return
    Taro.showActionSheet({
      itemList: ['文艺散文', '轻松碎碎念', '博物观察'],
      success: async (res) => {
        const styles = ['literary', 'casual', 'observational']
        const style = styles[res.tapIndex]
        Taro.showLoading({ title: '生成中...' })
        try {
          await request({
            url: `/api/trips/${currentTripId}`,
            method: 'PUT',
            data: { status: 'completed' },
          })
          const essay = await request({
            url: '/api/essays/generate',
            method: 'POST',
            data: { trip_id: currentTripId, style },
          })
          Taro.hideLoading()
          Taro.navigateTo({ url: `/pages/essay/index?id=${essay.id}` })
          loadTrips()
        } catch (e) {
          Taro.hideLoading()
          Taro.showToast({ title: '生成失败', icon: 'none' })
        }
      },
    })
  }

  const currentTrip = trips.find((t) => t.id === currentTripId)

  return (
    <View className='index-page'>
      {/* 手账标题 */}
      <View className='journal-header'>
        <Text className='journal-title'>旅行手账</Text>
        <Text className='journal-subtitle'>TRAVEL JOURNAL</Text>
      </View>

      {/* 行程便签区 */}
      <View className='trip-section'>
        <Text className='trip-section-label'>我的行程</Text>
        <View className='trip-tabs'>
          {trips.map((trip) => (
            <View
              key={trip.id}
              className={`trip-tab ${trip.id === currentTripId ? 'active' : ''}`}
              onClick={() => {
                setCurrentTripId(trip.id)
                loadFragments(trip.id)
                setDraftFragment(null)
              }}
            >
              <Text className='trip-tab-title'>{trip.title}</Text>
              <Text className='trip-tab-status'>
                {trip.status === 'ongoing' ? '进行中' : '已结束'}
              </Text>
              {trip.status !== 'ongoing' && (
                <Text
                  className='trip-tab-delete'
                  onClick={(e: any) => {
                    e.stopPropagation()
                    Taro.showModal({
                      title: '确认删除',
                      content: '删除此行程？',
                      confirmColor: '#c9705c',
                      success: (res) => {
                        if (res.confirm) deleteTrip(trip.id)
                      },
                    })
                  }}
                >
                  ×
                </Text>
              )}
            </View>
          ))}
          <View className='trip-tab add-btn' onClick={createTrip}>
            <Text className='trip-tab-title'>+</Text>
          </View>
        </View>
      </View>

      {/* 当前行程信息 */}
      {currentTrip && (
        <View className='trip-info-bar'>
          <Text className='trip-destination'>
            {currentTrip.destination || '未设置目的地'}
          </Text>
          {currentTrip.status === 'ongoing' && (
            <Text className='finish-btn' onClick={finishTrip}>
              结束行程
            </Text>
          )}
        </View>
      )}

      {/* 碎片列表 */}
      <View className='fragment-list'>
        {fragments.length === 0 && !draftFragment && (
          <View className='empty-state'>
            <View className='empty-illustration'>
              <View className='empty-illustration-inner'>
                <Text style={{ fontSize: '32px', color: '#c9a227' }}>✦</Text>
              </View>
            </View>
            <Text className='empty-text'>还没有记录</Text>
            <Text className='empty-text'>按住下方按钮，留下第一页吧</Text>
          </View>
        )}

        {fragments.map((f) => (
          <View key={f.id} className='fragment-card'>
            <View className='fragment-header'>
              <View className='fragment-date-stamp'>
                <Text className='fragment-date-day'>
                  {new Date(f.recorded_at).getDate()}
                </Text>
                <View style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text className='fragment-date-rest'>
                    {new Date(f.recorded_at).getMonth() + 1}月
                  </Text>
                  <Text className='fragment-date-rest'>
                    {new Date(f.recorded_at).getHours().toString().padStart(2, '0')}:
                    {new Date(f.recorded_at).getMinutes().toString().padStart(2, '0')}
                  </Text>
                </View>
              </View>
              <Text className='fragment-delete' onClick={() => deleteFragment(f.id)}>删除</Text>
            </View>
            <Text className='fragment-content'>{f.content}</Text>
            {f.tags && f.tags.length > 0 && (
              <View className='fragment-tags'>
                {f.tags.map((tag: string) => (
                  <Text key={tag} className='tag'>#{tag}</Text>
                ))}
              </View>
            )}
            {f.photos && f.photos.length > 0 && (
              <View className='photo-list'>
                {f.photos.map((url: string, idx: number) => (
                  <View key={idx} className='photo-wrapper'>
                    <Image className='photo-thumb' src={`${BASE_URL}${url}`} mode='aspectFill' />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* 草稿确认 */}
        {draftFragment && (
          <View className='fragment-card draft'>
            <View className='draft-badge'>
              <Text className='draft-label'>AI 整理预览</Text>
              <Text className='draft-hint'>点击保存确认</Text>
            </View>
            <Text className='fragment-content'>{draftFragment.content}</Text>
            {draftFragment.tags && draftFragment.tags.length > 0 && (
              <View className='fragment-tags'>
                {draftFragment.tags.map((tag: string) => (
                  <Text key={tag} className='tag'>#{tag}</Text>
                ))}
              </View>
            )}
            {/* 草稿照片 */}
            {draftPhotos.length > 0 && (
              <View className='photo-list'>
                {draftPhotos.map((path, idx) => (
                  <View key={idx} className='photo-wrapper'>
                    <Image className='photo-thumb' src={path} mode='aspectFill' />
                  </View>
                ))}
              </View>
            )}
            {draftPhotos.length < 3 && (
              <View className='add-photo-btn' onClick={choosePhoto}>
                <Text className='add-photo-icon'>+</Text>
                <Text className='add-photo-text'>添加照片</Text>
              </View>
            )}
            <View className='draft-actions'>
              <Text className='btn-save' onClick={saveFragment}>保存</Text>
              <Text className='btn-discard' onClick={discardFragment}>放弃</Text>
            </View>
          </View>
        )}
      </View>

      {/* 录音按钮 */}
      <View className='recorder-section'>
        {isTranscribing ? (
          <View className='transcribing-hint'>
            <Text>正在转写语音...</Text>
          </View>
        ) : (
          <Recorder onRecordComplete={handleRecordComplete} />
        )}
      </View>
    </View>
  )
}
