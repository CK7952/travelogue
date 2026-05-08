import { View, Text } from '@tarojs/components'
import './index.scss'

export default function TripDetail() {
  return (
    <View className='trip-detail-page'>
      <View className='detail-card'>
        <Text className='detail-kicker'>COMING SOON</Text>
        <Text className='detail-title'>行程详情</Text>
        <Text className='hint'>地图视图、时间轴与旅程摘要会在这里展开，保持同样安静克制的风格。</Text>
      </View>
    </View>
  )
}
