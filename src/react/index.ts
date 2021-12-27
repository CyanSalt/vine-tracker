import type { ComponentType, ForwardedRef, FunctionComponent, PropsWithChildren, ReactElement } from 'react'
import { Children, cloneElement, createContext, createElement, forwardRef, isValidElement, useContext, useMemo, useRef } from 'react'
import type { TrackByContext, TrackByEvent, TrackByIteration } from '../lib/integration'
import { addListener, executeCollectBy, executeTrackBy, removeListener, trackByFinally } from '../lib/integration'

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

export const Tracker: FunctionComponent<TrackerProps> = (props: PropsWithChildren<TrackerProps>) => {
  const { context, by, data, children } = props
  const tree = useContext(TrackerContext)

  // Build concatenated context
  const contextNode = useMemo(() => {
    return context === true
      ? { [by ?? 'default']: data } as TrackByContext
      : context
  }, [context, by, data])
  const contextValue = useMemo(() => {
    return contextNode
      ? [contextNode].concat(tree)
      : tree
  }, [tree, contextNode])

  // Check if event handling needed
  const event = useMemo(() => {
    if (!context && by) {
      let name = by as TrackByEvent
      let action: string = by
      const dotIndex = by.indexOf('.')
      if (dotIndex !== -1) {
        name = by.slice(0, dotIndex) as keyof HTMLElementEventMap
        action = by.slice(dotIndex + 1)
      }
      return {
        name,
        listener() {
          executeTrackBy(createContextIterator(tree), action, data)
        },
      }
    } else {
      return undefined
    }
  }, [tree, context, by, data])

  // Create bound children
  const elementMapRef = useRef(new WeakMap<ReactElement, HTMLElement>())
  const boundChildren = useMemo(() => {
    if (event) {
      return Children.map(children, child => {
        if (!isValidElement(child)) return child
        return cloneElement(child, {
          ref: (element: HTMLElement | null) => {
            setRef(child['ref'], element)
            const elementMap = elementMapRef.current
            if (element) {
              if (!elementMap.has(child)) {
                elementMap.set(child, element)
                addListener(element, event.name, event.listener)
              }
            } else {
              if (elementMap.has(child)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const recentElement = elementMap.get(child)!
                removeListener(recentElement, event.name, event.listener)
              }
            }
          },
        })
      })
    } else {
      return children
    }
  }, [children, event])

  // Render finally
  return createElement(TrackerContext.Provider, { value: contextValue }, boundChildren)
}

Tracker.displayName = 'Tracker'

export interface TrackerComponentProps {
  trackBy: {
    (key: string, data?: Record<string, any>, channels?: string[]): ReturnType<typeof executeTrackBy>,
    final: typeof trackByFinally,
  },
  collectBy: (key: string, data?: Record<string, any>) => ReturnType<typeof executeCollectBy>,
}

export function useTracker(): TrackerComponentProps {
  const tree = useContext(TrackerContext)
  return useMemo(() => {
    const trackBy = (key: string, data?: Record<string, any>, channels?: string[]) => {
      return executeTrackBy(createContextIterator(tree), key, data, channels)
    }
    trackBy.final = trackByFinally
    const collectBy = (key: string, data?: Record<string, any>) => {
      return executeCollectBy(createContextIterator(tree), key, data)
    }
    return {
      trackBy,
      collectBy,
    }
  }, [tree])
}

export function withTracker<P extends TrackerComponentProps, C extends ComponentType<P>>(component: C) {
  const Component = forwardRef<unknown, Omit<P, keyof TrackerComponentProps>>(
    (props: PropsWithChildren<P>, ref) => {
      const trackerComponentProps = useTracker()
      // eslint-disable-next-line react/prop-types
      return createElement(component, { ...props, ...trackerComponentProps, ref }, props.children)
    },
  )
  Component.displayName = 'withTracker'
  return Component
}
