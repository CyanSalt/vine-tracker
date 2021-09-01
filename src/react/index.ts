import { Children, cloneElement, createContext, createElement, forwardRef, isValidElement, useCallback, useContext, useRef } from 'react'
import { addListener, executeCollectBy, executeTrackBy, removeListener, trackByFinally } from '../lib/integration'
import type { TrackByContext, TrackByEvent, TrackByIteration } from '../lib/integration'
import type { ComponentType, ForwardedRef, FunctionComponent, ReactElement } from 'react'

const TrackerContext = createContext<TrackByContext[]>([])

export interface TrackerProps {
  context?: boolean | TrackByContext,
  by?: TrackByEvent | `${keyof HTMLElementEventMap}.${string}`,
  data?: Record<string, any>,
}

function setRef<T extends HTMLElement>(ref: ForwardedRef<T>, element: T | null) {
  if (!ref) return
  if (typeof ref === 'function') {
    ref(element)
  } else {
    ref.current = element
  }
}

function createContextIterator(tree: TrackByContext[]): TrackByIteration[] {
  return tree.map(context => ({ context }))
}

export const Tracker: FunctionComponent<TrackerProps> = props => {
  let tree = useContext(TrackerContext)
  if (props.context) {
    const context: TrackByContext = props.context === true
      ? { [props.by ?? 'default']: props.data }
      : props.context
    tree = [context].concat(tree)
  }
  let children = props.children
  const elementMapRef = useRef(new WeakMap<ReactElement, HTMLElement>())
  if (props.by && !props.context) {
    let event = props.by as TrackByEvent
    let action: string = event
    const dotIndex = event.indexOf('.')
    if (dotIndex !== -1) {
      action = event.slice(dotIndex + 1)
      event = event.slice(0, dotIndex) as keyof HTMLElementEventMap
    }
    const listener = () => {
      executeTrackBy(createContextIterator(tree), action, props.data)
    }
    children = Children.map(props.children, child => {
      if (!isValidElement(child)) return child
      return cloneElement(child, {
        ref: (element: HTMLElement | null) => {
          setRef(child['ref'], element)
          const elementMap = elementMapRef.current
          if (element) {
            if (!elementMap.has(child)) {
              elementMap.set(child, element)
              addListener(element, event, listener)
            }
          } else {
            if (elementMap.has(child)) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const recentElement = elementMap.get(child)!
              removeListener(recentElement, event, listener)
            }
          }
        },
      })
    })
  }
  return createElement(TrackerContext.Provider, { value: tree }, children)
}

export interface TrackerComponentProps {
  trackBy: {
    (key: string, data?: Record<string, any>, channels?: string[]): ReturnType<typeof executeTrackBy>,
    final: typeof trackByFinally,
  },
  collectBy: (key: string, data?: Record<string, any>) => ReturnType<typeof executeCollectBy>,
}

export function useTracker(): TrackerComponentProps {
  const tree = useContext(TrackerContext)
  const trackBy = useCallback((key: string, data?: Record<string, any>, channels?: string[]) => {
    return executeTrackBy(createContextIterator(tree), key, data, channels)
  }, [tree]) as TrackerComponentProps['trackBy']
  trackBy.final = trackByFinally
  const collectBy = useCallback((key: string, data?: Record<string, any>) => {
    return executeCollectBy(createContextIterator(tree), key, data)
  }, [tree])
  return {
    trackBy,
    collectBy,
  }
}

export function withTracker<P extends TrackerComponentProps, C extends ComponentType<P>>(component: C) {
  return forwardRef((props, ref) => {
    const trackerComponentProps = useTracker()
    return createElement(component, { ...props, ...trackerComponentProps, ref }, props.children)
  }) as ComponentType<Omit<P, keyof TrackerComponentProps>>
}
