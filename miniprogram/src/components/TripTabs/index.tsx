import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { Trip } from '../../types/travel'

interface TripTabsProps {
  trips: Trip[]
  currentTripId: number | null
  onCreateTrip: () => void
  onSelectTrip: (tripId: number) => void
  onDeleteTrip: (tripId: number) => void
}

export default function TripTabs({
  trips,
  currentTripId,
  onCreateTrip,
  onSelectTrip,
  onDeleteTrip,
}: TripTabsProps) {
  return (
    <View className='trip-section'>
      <View className='section-heading'>
        <Text className='trip-section-label'>我的行程</Text>
        <Text className='trip-section-caption'>正在发生的故事，都在这里慢慢生长</Text>
      </View>
      <View className='trip-tabs'>
        {trips.map((trip) => (
          <View
            key={trip.id}
            className={`trip-tab ${trip.id === currentTripId ? 'active' : ''}`}
            onClick={() => onSelectTrip(trip.id)}
          >
            <View className='trip-tab-meta'>
              <Text className='trip-tab-title'>{trip.title}</Text>
              <Text className='trip-tab-status'>{trip.status === 'ongoing' ? '进行中' : '已结束'}</Text>
            </View>
            {trip.status !== 'ongoing' && (
              <Text
                className='trip-tab-delete'
                onClick={(event) => {
                  event.stopPropagation()
                  Taro.showModal({
                    title: '确认删除',
                    content: '删除这段行程后将无法恢复，继续吗？',
                    confirmColor: '#c9705c',
                    success: (res) => {
                      if (res.confirm) {
                        void onDeleteTrip(trip.id)
                      }
                    },
                  })
                }}
              >
                ×
              </Text>
            )}
          </View>
        ))}

        <View className='trip-tab add-btn' onClick={onCreateTrip}>
          <Text className='trip-tab-title'>新建行程</Text>
        </View>
      </View>
    </View>
  )
}
