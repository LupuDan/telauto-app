import { useTranslation } from 'react-i18next'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { useBackHandler } from '../../native'
export function AppPhotoMenu({
  open,
  onClose,
  onChoose,
  title,
}: {
  open: boolean
  onClose: () => void
  onChoose: (camera: boolean) => void
  title: string
}) {
  const { t } = useTranslation()
  useBackHandler(() => {
    onClose()
    return true
  }, open)
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        {[true, false].map((camera) => (
          <Button
            key={String(camera)}
            fullWidth
            variant="secondary"
            onClick={() => {
              onClose()
              onChoose(camera)
            }}
          >
            {t(camera ? 'appShell.photoCamera' : 'appShell.photoGallery')}
          </Button>
        ))}
      </div>
    </Sheet>
  )
}
