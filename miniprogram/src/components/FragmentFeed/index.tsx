import { View, Text, Image } from '@tarojs/components'
import { BASE_URL } from '../../api/request'
import type { DraftFragment, Fragment } from '../../types/travel'

interface FragmentFeedProps {
  fragments: Fragment[]
  draftFragment: DraftFragment | null
  draftPhotos: string[]
  onDeleteFragment: (fragmentId: number) => void
  onChoosePhoto: () => void
  onSaveDraft: () => void
  onDiscardDraft: () => void
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    hour: date.getHours().toString().padStart(2, '0'),
    minute: date.getMinutes().toString().padStart(2, '0'),
  }
}

export default function FragmentFeed({
  fragments,
  draftFragment,
  draftPhotos,
  onDeleteFragment,
  onChoosePhoto,
  onSaveDraft,
  onDiscardDraft,
}: FragmentFeedProps) {
  return (
    <View className='fragment-list'>
      {fragments.length === 0 && !draftFragment && (
        <View className='empty-state'>
          <View className='empty-illustration'>
            <View className='empty-illustration-inner'>
              <Text className='empty-mark'>✦</Text>
            </View>
          </View>
          <Text className='empty-title'>还没有留下记录</Text>
          <Text className='empty-text'>按住下方按钮说几句话，把此刻的风景与心情收进旅程里。</Text>
        </View>
      )}

      {fragments.map((fragment) => {
        const date = formatDate(fragment.recorded_at)
        return (
          <View key={fragment.id} className='fragment-card'>
            <View className='fragment-header'>
              <View className='fragment-date-stamp'>
                <Text className='fragment-date-day'>{date.day}</Text>
                <View style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text className='fragment-date-rest'>{date.month} 月</Text>
                  <Text className='fragment-date-rest'>
                    {date.hour}:{date.minute}
                  </Text>
                </View>
              </View>
              <Text className='fragment-delete' onClick={() => onDeleteFragment(fragment.id)}>
                删除
              </Text>
            </View>

            <Text className='fragment-content'>{fragment.content}</Text>

            {fragment.tags.length > 0 && (
              <View className='fragment-tags'>
                {fragment.tags.map((tag) => (
                  <Text key={tag} className='tag'>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}

            {fragment.photos && fragment.photos.length > 0 && (
              <View className='photo-list'>
                {fragment.photos.map((url, index) => (
                  <View key={index} className='photo-wrapper'>
                    <Image className='photo-thumb' src={`${BASE_URL}${url}`} mode='aspectFill' />
                  </View>
                ))}
              </View>
            )}
          </View>
        )
      })}

      {draftFragment && (
        <View className='fragment-card draft'>
          <View className='draft-badge'>
            <Text className='draft-label'>AI 整理预览</Text>
            <Text className='draft-hint'>确认后会收入本次旅程</Text>
          </View>
          <Text className='fragment-content'>{draftFragment.content}</Text>

          {draftFragment.tags.length > 0 && (
            <View className='fragment-tags'>
              {draftFragment.tags.map((tag) => (
                <Text key={tag} className='tag'>
                  #{tag}
                </Text>
              ))}
            </View>
          )}

          {draftPhotos.length > 0 && (
            <View className='photo-list'>
              {draftPhotos.map((path, index) => (
                <View key={index} className='photo-wrapper'>
                  <Image className='photo-thumb' src={path} mode='aspectFill' />
                </View>
              ))}
            </View>
          )}

          {draftPhotos.length < 3 && (
            <View className='add-photo-btn' onClick={onChoosePhoto}>
              <Text className='add-photo-icon'>+</Text>
              <Text className='add-photo-text'>添加照片</Text>
            </View>
          )}

          <View className='draft-actions'>
            <Text className='btn-save' onClick={onSaveDraft}>
              保存片段
            </Text>
            <Text className='btn-discard' onClick={onDiscardDraft}>
              放弃草稿
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
