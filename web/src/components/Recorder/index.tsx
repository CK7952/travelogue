import { useState, useRef, useCallback } from 'react'
import './index.css'

interface RecorderProps {
  onRecordComplete: (blob: Blob, duration: number) => void
}

export default function Recorder({ onRecordComplete }: RecorderProps) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const dur = Date.now() - startTimeRef.current
        onRecordComplete(blob, dur)
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      startTimeRef.current = Date.now()
      setRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (e) {
      alert('无法访问麦克风，请检查权限设置')
    }
  }, [onRecordComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [recording])

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="recorder-container">
      <button
        className={`recorder-btn ${recording ? 'recording' : ''}`}
        onClick={recording ? stopRecording : startRecording}
        aria-label={recording ? '停止录音' : '开始录音'}
      >
        <span className="recorder-icon">
          {recording ? '■' : '●'}
        </span>
      </button>
      <div className="recorder-hint">
        {recording ? `录音中 ${formatDuration(duration)}` : '点击开始录音'}
      </div>
      {recording && (
        <div className="recorder-sub-hint">再次点击结束</div>
      )}
    </div>
  )
}
