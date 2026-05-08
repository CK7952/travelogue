import type { Fragment, DraftFragment } from '../types/travel'
import type { DraftPhoto } from '../hooks/useDraftFragment'
import EmptyState from './EmptyState'
import FragmentCard from './FragmentCard'
import DraftFragmentCard from './DraftFragmentCard'

interface FragmentListProps {
  fragments: Fragment[]
  draftFragment: DraftFragment | null
  draftPhotos: DraftPhoto[]
  onDeleteFragment: (fragmentId: number) => void
  onChoosePhoto: () => void
  onSaveDraft: () => void
  onDiscardDraft: () => void
}

export default function FragmentList({
  fragments,
  draftFragment,
  draftPhotos,
  onDeleteFragment,
  onChoosePhoto,
  onSaveDraft,
  onDiscardDraft,
}: FragmentListProps) {
  return (
    <div className="content">
      {fragments.length === 0 && !draftFragment && <EmptyState />}

      <div className="fragment-grid">
        {fragments.map((fragment) => (
          <FragmentCard key={fragment.id} fragment={fragment} onDelete={onDeleteFragment} />
        ))}

        {draftFragment && (
          <DraftFragmentCard
            draftFragment={draftFragment}
            draftPhotos={draftPhotos}
            onChoosePhoto={onChoosePhoto}
            onSave={onSaveDraft}
            onDiscard={onDiscardDraft}
          />
        )}
      </div>
    </div>
  )
}
