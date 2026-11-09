import { IS_APP } from '../../native'
import { AppPhotoMenu } from './AppPhotoMenu'
import { Camera } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { translateKey } from '../../i18n/translate'
import { errorToKey } from '../auth/authErrors'
import { avatarUrl, type PublicProfile } from './api'
import { useUpdateMyAvatar } from './hooks'

/**
 * "Poza de profil": saved at once (separately from the "Salvează" button of the form).
 * Without a photo the initials on a pale blue circle are shown.
 */
export function AvatarField({ userId, profile }: { userId: string; profile: PublicProfile }) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [photoMenu, setPhotoMenu] = useState(false)
  const update = useUpdateMyAvatar(userId)
  const name = profile.display_name || t('profile.unnamed')

  return (
    <div className="space-y-2">
      <p className="font-medium text-ink">{t('account.photo')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={name} src={avatarUrl(profile.avatar_path)} size="2xl" />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="compact"
            loading={update.isPending && update.variables?.file !== null}
            disabled={update.isPending}
            onClick={() => (IS_APP ? setPhotoMenu(true) : input.current?.click())}
          >
            <Camera aria-hidden="true" className="size-5" strokeWidth={1.75} />
            {profile.avatar_path ? t('account.photoChange') : t('account.photoAdd')}
          </Button>
          {profile.avatar_path && (
            <Button
              variant="ghost"
              size="compact"
              loading={update.isPending && update.variables?.file === null}
              disabled={update.isPending}
              onClick={() => update.mutate({ file: null, oldPath: profile.avatar_path })}
            >
              {t('account.photoRemove')}
            </Button>
          )}
        </div>
      </div>
      {IS_APP && (
        <>
          <AppPhotoMenu
            open={photoMenu}
            onClose={() => setPhotoMenu(false)}
            onChoose={(camera) => (camera ? cameraRef : input).current?.click()}
            title={t('account.photo')}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) update.mutate({ file, oldPath: profile.avatar_path })
            }}
          />
        </>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) update.mutate({ file, oldPath: profile.avatar_path })
        }}
      />
      {update.isError && <Alert kind="error">{translateKey(t, errorToKey(update.error))}</Alert>}
    </div>
  )
}
