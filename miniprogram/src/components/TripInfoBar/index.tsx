import { View, Text } from '@tarojs/components'
import type { Trip } from '../../types/travel'

interface TripInfoBarProps {
  currentTrip: Trip
  onFinishTrip: () => void
}

export default function TripInfoBar({ currentTrip, onFinishTrip }: TripInfoBarProps) {
  return (
    <View className='trip-info-bar'>
      <View className='trip-info-copy'>
        <Text className='trip-info-label'>此刻所在</Text>
        <Text className='trip-destination'>{currentTrip.destination || '尚未设置目的地'}</Text>
      </View>
      {currentTrip.status === 'ongoing' && (
        <Text className='finish-btn' onClick={onFinishTrip}>
          结束行程
        </Text>
      )}
    </View>
  )
}
