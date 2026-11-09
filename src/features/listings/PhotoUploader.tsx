import { IS_APP } from '../../native'
import { AppPhotoMenu } from '../profile/AppPhotoMenu'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, type LucideIcon } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { compressPhoto, MAX_PHOTOS, type PhotoItem } from './photos'

type Props = {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  minPhotos: number
  /** what the category asks for ("Adaugă cel puțin 5 poze: față, spate, lateral, interior, bord.") */
  needs: string
  /** translated error (e.g. "add at least 3 photos") */
  error?: string
}

/**
 * Photo upload (plan de design, section 5: ImageUploader): an add area that says what the category
 * needs, thumbnails that can be reordered by dragging (or with the arrows), the first one marked
 * "Poza principală".
 */
export function PhotoUploader({ photos, onChange, minPhotos, needs, error }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [photoMenu, setPhotoMenu] = useState(false)
  const [processing, setProcessing] = useState(0)
  const [failed, setFailed] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // on phones: press and hold to drag, so normal scrolling still works
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const free = MAX_PHOTOS - photos.length - processing

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(free, 0))
    event.target.value = ''
    if (files.length === 0) return

    setFailed(0)
    setProcessing((n) => n + files.length)
    const added: PhotoItem[] = []
    let failures = 0
    for (const file of files) {
      try {
        const compressed = await compressPhoto(file)
        added.push({ id: crypto.randomUUID(), file: compressed, previewUrl: URL.createObjectURL(compressed) })
      } catch {
        failures += 1
      } finally {
        setProcessing((n) => n - 1)
      }
    }
    setFailed(failures)
    onChange([...photos, ...added])
  }

  function remove(id: string) {
    const photo = photos.find((item) => item.id === id)
    if (photo?.file) URL.revokeObjectURL(photo.previewUrl)
    onChange(photos.filter((item) => item.id !== id))
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= photos.length) return
    onChange(arrayMove(photos, index, target))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = photos.findIndex((item) => item.id === active.id)
    const to = photos.findIndex((item) => item.id === over.id)
    onChange(arrayMove(photos, from, to))
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-ink">{needs}</p>
        <p className="mt-0.5 text-sm text-muted">{t('listingForm.photosHint', { min: minPhotos, max: MAX_PHOTOS })}</p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {failed > 0 && <Alert kind="warning">{t('listingForm.photoFailed', { count: failed })}</Alert>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map((photo) => photo.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, index) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                index={index}
                count={photos.length}
                onRemove={() => remove(photo.id)}
                onMove={(direction) => move(index, direction)}
              />
            ))}
            {Array.from({ length: processing }, (_, i) => (
              <li
                key={`processing-${i}`}
                className="flex aspect-[4/3] items-center justify-center rounded-card border border-line bg-paper text-muted"
              >
                <Spinner />
                <span className="sr-only">{t('listingForm.photoProcessing')}</span>
              </li>
            ))}
            {free > 0 && (
              <li className={photos.length === 0 && processing === 0 ? 'col-span-full' : undefined}>
                <button
                  type="button"
                  onClick={() => (IS_APP ? setPhotoMenu(true) : inputRef.current?.click())}
                  className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed bg-paper px-3 text-center hover:border-brand hover:bg-brand-50 ${
                    error ? 'border-danger' : 'border-line-strong'
                  } ${photos.length === 0 && processing === 0 ? 'min-h-48 py-8' : 'aspect-[4/3]'}`}
                >
                  <ImagePlus aria-hidden="true" className="size-8 text-brand" strokeWidth={1.75} />
                  <span className="font-semibold text-brand">{t('listingForm.addPhotos')}</span>
                  {photos.length === 0 && processing === 0 && (
                    <span className="text-sm text-muted">{t('listingForm.addPhotosHint')}</span>
                  )}
                  <span className="text-sm text-muted tabular">
                    {photos.length}/{MAX_PHOTOS}
                  </span>
                </button>
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>

      {IS_APP && (
        <>
          <AppPhotoMenu
            open={photoMenu}
            onClose={() => setPhotoMenu(false)}
            onChoose={(camera) => (camera ? cameraRef : inputRef).current?.click()}
            title={t('listingForm.stepNames.photos')}
          />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={IS_APP ? 'image/*' : 'image/jpeg,image/png,image/webp,image/heic,image/heif'}
        multiple
        hidden
        onChange={handleFiles}
      />

      {photos.length > 1 && <p className="text-sm text-muted">{t('listingForm.photosReorderHint')}</p>}
    </div>
  )
}

type SortablePhotoProps = {
  photo: PhotoItem
  index: number
  count: number
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

function SortablePhoto({ photo, index, count, onRemove, onMove }: SortablePhotoProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative overflow-hidden rounded-card border bg-surface ${
        isDragging ? 'z-10 border-brand shadow-float' : index === 0 ? 'border-brand' : 'border-line'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={t('listingForm.photoDrag', { n: index + 1 })}
        className="relative aspect-[4/3] cursor-grab touch-manipulation overflow-hidden active:cursor-grabbing"
      >
        <img
          src={photo.previewUrl}
          alt={t('listingForm.photoAlt', { n: index + 1 })}
          className="absolute inset-0 size-full object-cover select-none"
          draggable={false}
        />
      </div>

      {index === 0 && (
        <span className="absolute top-1.5 left-1.5 rounded-full bg-brand px-2 py-0.5 type-micro text-white">
          {t('listingForm.mainPhoto')}
        </span>
      )}

      <div className="flex items-center justify-between gap-1 border-t border-line p-1">
        <div className="flex gap-1">
          <IconButton
            label={t('listingForm.photoMoveLeft')}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            Icon={ChevronLeft}
          />
          <IconButton
            label={t('listingForm.photoMoveRight')}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            Icon={ChevronRight}
          />
        </div>
        <IconButton label={t('listingForm.photoRemove')} onClick={onRemove} danger Icon={Trash2} />
      </div>
    </li>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  Icon,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  Icon: LucideIcon
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-11 items-center justify-center rounded-field disabled:opacity-30 ${
        danger ? 'text-danger hover:bg-danger-50' : 'text-ink hover:bg-paper'
      }`}
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
    </button>
  )
}
