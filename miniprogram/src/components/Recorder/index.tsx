import { useState, useRef, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import './index.scss'

interface RecorderProps {
  onRecordComplete: (filePath: string, duration: number) => void
}

export default function Recorder({ onRecordComplete }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const timerRef = useRef<any>(null)
  const recorderManager = useRef(Taro.getRecorderManager())

  const startRecord = useCallback(() => {
    setIsRecording(true)
    setRecordTime(0)

    timerRef.current = setInterval(() => {
      setRecordTime((prev) => {
        if (prev >= 28) {
          // 接近 30 秒时自动停止，避免超出平台限制。
          stopRecord()
          return prev
        }
        return prev + 1
      })
    }, 1000)

    recorderManager.current.start({
      duration: 30000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
    })
  }, [])

  const stopRecord = useCallback(() => {
    if (!isRecording) return
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recorderManager.current.stop()
  }, [isRecording])

  recorderManager.current.onStop((res) => {
    if (res.tempFilePath && recordTime > 0) {
      onRecordComplete(res.tempFilePath, recordTime)
    }
  })

  return (
    <View className='recorder-container'>
      <View
        className={`recorder-btn ${isRecording ? 'recording' : ''}`}
        onTouchStart={startRecord}
        onTouchEnd={stopRecord}
      >
        <Text className='recorder-icon'>{isRecording ? '■' : '●'}</Text>
      </View>
      <Text className='recorder-hint'>
        {isRecording ? `录音中 ${recordTime}s / 30s` : '按住说话'}
      </Text>
      {!isRecording && (
        <Text className='recorder-sub-hint'>最长 30 秒，松手后自动整理成片段</Text>
      )}
    </View>
  )
}
