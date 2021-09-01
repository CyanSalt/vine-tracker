import { track } from '../core/track'
import '../lib/channels/pipe'
import { unwatchIntersection, watchIntersection } from '../utils/intersection'

declare module '../core/config' {
  export interface TrackConfig {
    /** Whether to send data directly when the component does not define any context */
    fallbackTrackingBy?: boolean,
    /** Time interval of appearing detection */
    appearingInterval?: number,
    /** Options for IntersectionObserver of appearing detection */
    appearingOptions?: IntersectionObserverInit,
  }
}

interface TrackByContextOptions {
  final?: boolean,
  prevented?: boolean,
  channels?: string[],
  with?: Record<string, any>,
  [key: string]: any,
}

type ContextBoundValue<T, U = unknown> = T | (
  (this: U, key: string, data: Record<string, any>, channels?: string[]) => NonNullable<T>
)

type ContextBoundMap<T, U = unknown> = {
  [P in keyof T]: ContextBoundValue<T[P], U>;
}

type TrackByContextObject<T = unknown> = ContextBoundMap<TrackByContextOptions, T>

type TrackByContextFunction<T = unknown> = (this: T, key: string, data: Record<string, any>) => unknown

export type TrackByContext<T = unknown> = TrackByContextObject<T> | TrackByContextFunction<T>

export type TrackByEvent = 'appear' | keyof HTMLElementEventMap

export function trackByFinally(key: string, data: Record<string, any>, channels?: string[]) {
  return track(`by:${key}`, data, channels)
}

export interface TrackByIteration<T = unknown> {
  context?: TrackByContext<T>,
  receiver?: any,
}

export function executeTrackBy<T = unknown>(iterable: Iterable<TrackByIteration<T>>, key: string, data: Record<string, any> = {}, channels?: string[]) {
  for (const { context, receiver } of iterable) {
    // Options
    const bindReceiver = <U>(value: ContextBoundValue<U, T>): U => {
      return typeof value === 'function'
        ? value.call(receiver, key, data, channels) : value
    }
    if (typeof context === 'function') {
      return bindReceiver(context) as unknown as ReturnType<typeof track>
    }
    if (context && typeof context === 'object') {
      data = {
        ...bindReceiver(context.with),
        ...bindReceiver(context[key] ?? context.default),
        ...data,
      }
      const prevented = bindReceiver(context.prevented)
      if (prevented) return undefined
      if (!channels) channels = bindReceiver(context.channels)
      const final = bindReceiver(context.final)
      if (final) return trackByFinally(key, data, channels)
    }
  }
  if (track.config.fallbackTrackingBy) {
    return trackByFinally(key, data, channels)
  }
}

export function executeCollectBy<T = unknown>(iterable: Iterable<TrackByIteration<T>>, key: string, data?: Record<string, any>) {
  const result = executeTrackBy(iterable, key, data, ['pipe'])
  return result?.[0].result as { key: string, data: Record<string, any> } | null | undefined
}

export function addListener(el: HTMLElement, event: TrackByEvent, listener: () => void) {
  if (event === 'appear') {
    watchIntersection(el, listener, {
      once: true,
      interval: track.config.appearingInterval ?? 300,
      options: track.config.appearingOptions,
    })
  } else {
    el.addEventListener(event, listener)
  }
}

export function removeListener(el: HTMLElement, event: TrackByEvent, listener: () => void) {
  if (event === 'appear') {
    unwatchIntersection(el, listener)
  } else {
    el.removeEventListener(event, listener)
  }
}
