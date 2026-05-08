import Recorder from './Recorder'

interface RecorderBarProps {
  isTranscribing: boolean
  onRecordComplete: (blob: Blob, duration: number) => void
}

export default function RecorderBar({ isTranscribing, onRecordComplete }: RecorderBarProps) {
  return (
    <div className="recorder-bar">
      {isTranscribing ? (
        <div className="transcribing-hint">
          <span className="spinner" />
          <span>正在转写语音...</span>
        </div>
      ) : (
        <Recorder onRecordComplete={onRecordComplete} />
      )}
    </div>
  )
}
