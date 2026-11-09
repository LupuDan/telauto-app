import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/** Keep list offsets by router entry; retry restoration as suspended content obtains its height. */
export function useScrollRestoration() {
  const location = useLocation()
  const navigation = useNavigationType()
  const positions = useRef(new Map<string, number>())
  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])
  useLayoutEffect(() => {
    const savedPositions = positions.current
    const target = navigation === 'POP' ? (savedPositions.get(location.key) ?? 0) : 0
    let restoring = true
    const restore = () => window.scrollTo({ top: target, behavior: 'instant' })
    restore()
    const observer = new ResizeObserver(() => {
      if (restoring) restore()
    })
    observer.observe(document.body)
    const stop = () => {
      restoring = false
      observer.disconnect()
    }
    const save = () => {
      if (!restoring) savedPositions.set(location.key, window.scrollY)
    }
    const timer = window.setTimeout(stop, 3000)
    window.addEventListener('scroll', save, { passive: true })
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    return () => {
      // no saving here: by now the next screen (or its loading placeholder) may already have moved the page to the top
      observer.disconnect()
      window.clearTimeout(timer)
      window.removeEventListener('scroll', save)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [location.key, navigation])
}
