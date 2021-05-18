/// <reference lib="es2020" />
import { getCurrentInstance, inject } from 'vue'
import { track } from '../core/track'
import '../lib/channels/pipe'
import { watchIntersection, unwatchIntersection } from '../utils/intersection'
import type { TrackConfig } from '../core/config'
import type { ObjectDirective, Plugin, ComponentPublicInstance, ComponentInternalInstance, InjectionKey } from 'vue'

declare module '../core/config' {
  export interface TrackConfig {
    /** 是否在组件未声明 track 时直接发送数据 */
    fallbackTrackingBy?: boolean,
    /** 检测展示的时间间隔 */
    appearingInterval?: number,
    /** 检测展示的 IntersectionObserver 选项 */
    appearingOptions?: IntersectionObserverInit,
  }
}

export type ComponentBoundValue<T> = T | (
  (this: ComponentPublicInstance, key: string, data: Record<string, any>, channels?: string[]) => NonNullable<T>
)

export type ComponentBoundMap<T> = {
  [P in keyof T]: ComponentBoundValue<T[P]>;
}

type TrackedByObject = ComponentBoundMap<{
  final?: boolean,
  prevented?: boolean,
  channels?: string[],
  with?: Record<string, any>,
  [key: string]: any,
}>

type TrackedByFunction = (key: string, data: Record<string, any>) => unknown

export type TrackedByOptions = TrackedByObject | TrackedByFunction

declare module 'vue' {
  export interface ComponentCustomOptions {
    trackedBy?: TrackedByOptions,
  }
  export interface ComponentCustomProperties {
    $track: typeof track,
    $trackBy: typeof trackBy,
  }
}

interface TrackByModifiers extends Record<string, boolean> {
  route: boolean,
  with: boolean,
  prevent: boolean,
}

type TrackByEvent = 'appear' | keyof HTMLElementEventMap

interface TrackByBinding {
  el: HTMLElement,
  arg: TrackByEvent,
  key: string,
  value: Record<string, any>,
  modifiers: TrackByModifiers,
  component: ComponentInternalInstance | null,
  listener: () => void,
}

interface TrackByBindingPattern {
  el?: HTMLElement,
  key?: string,
  component?: ComponentInternalInstance,
}

const bindings: TrackByBinding[] = []

function isMatchedBinding(binding: TrackByBinding, { key, el, component }: TrackByBindingPattern) {
  return (!binding.key || binding.key === key)
    && (!el || binding.el === el)
    && (!component || binding.component === component)
}

function assignWith(data: Record<string, any>, pattern: TrackByBindingPattern) {
  const assigned = bindings.filter(binding => {
    return binding.modifiers.with && isMatchedBinding(binding, pattern)
  })
  for (const item of assigned) {
    data = { ...data, ...item.value }
  }
  return data
}

function isPrevented(pattern: TrackByBindingPattern) {
  return bindings.some(binding => {
    return binding.modifiers.prevent && isMatchedBinding(binding, pattern)
  })
}

function trackByFinally(key: string, data: Record<string, any>, channels?: string[]) {
  return track(`by:${key}`, data, channels)
}

export function trackBy(this: ComponentPublicInstance | void, key: string, data: Record<string, any>, channels?: string[]) {
  let component = this || null
  let action: TrackedByOptions | undefined
  while (component) {
    action = component.$options.trackedBy
    const bindComponent = <T>(value: ComponentBoundValue<T>): T => {
      return typeof value === 'function'
        ? value.call(component, key, data, channels) : value
    }
    if (typeof action === 'function') {
      return bindComponent(action) as unknown as ReturnType<typeof track>
    }
    if (action && typeof action === 'object') {
      data = {
        ...bindComponent(action.with),
        ...bindComponent(action[key] ?? action.default),
        ...data,
      }
      const prevented = bindComponent(action.prevented)
      if (prevented) return undefined
      if (!channels) channels = bindComponent(action.channels)
      const final = bindComponent(action.final)
      if (final) return trackByFinally(key, data, channels)
    }
    const pattern: TrackByBindingPattern = { key, component: component.$ }
    if (isPrevented(pattern)) return undefined
    data = assignWith(data, pattern)
    component = component.$parent
  }
  if (track.config.fallbackTrackingBy) {
    return trackByFinally(key, data, channels)
  }
}

trackBy.final = trackByFinally

export function collectBy(this: ComponentPublicInstance | void, key: string, data: Record<string, any> = {}) {
  const result: ReturnType<typeof trackBy> = trackBy.call(this, key, data, ['pipe'])
  return result?.[0].result as { key: string, data: Record<string, any> } | null | undefined
}

const TrackByDirective: ObjectDirective = {
  mounted(el, { arg = '', value, modifiers, instance }, { component }) {
    const key = modifiers.route ? 'route' : arg
    const binding: TrackByBinding = {
      el,
      arg: arg as TrackByEvent,
      key,
      value,
      modifiers: modifiers as TrackByModifiers,
      component,
      listener: () => {
        const data = assignWith(binding.value, { key, el })
        trackBy.call(instance, key, data)
      },
    }
    if (modifiers.with || modifiers.prevent) {
      // pass
    } else if (arg === 'appear') {
      watchIntersection(el, binding.listener, {
        once: true,
        interval: track.config.appearingInterval ?? 300,
        options: track.config.appearingOptions,
      })
    } else {
      el.addEventListener(arg as keyof HTMLElementEventMap, binding.listener)
    }
    bindings.push(binding)
  },
  updated(el, { arg = '', value, oldValue }) {
    const binding = bindings.find(
      item => item.el === el && item.arg === arg && item.value === oldValue
    )
    if (binding) binding.value = value
  },
  beforeUnmount(el, { arg = '', value, modifiers }) {
    const index = bindings.findIndex(
      item => item.el === el && item.arg === arg && item.value === value
    )
    // Seems that `beforeUnmount` will be triggered multiple times
    // when used on dynamic components
    if (index === -1) return
    const binding = bindings[index]
    bindings.splice(index, 1)
    if (modifiers.with || modifiers.prevent) {
      // pass
    } else if (arg === 'appear') {
      unwatchIntersection(el, binding.listener)
    } else {
      el.removeEventListener(arg as keyof HTMLElementEventMap, binding.listener)
    }
  },
}

export interface TrackerInjection {
  trackBy: typeof trackBy,
  collectBy: typeof collectBy,
}

const trackerInjectionKey = Symbol('tracker') as InjectionKey<TrackerInjection>

export function useTracker() {
  const instance = getCurrentInstance()
  const component = instance ? instance.proxy : null
  const injection = inject(trackerInjectionKey)
  if (!injection) {
    throw new Error('VueTracker has not been installed in current app context.')
  }
  return new Proxy(injection, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)
      return typeof value === 'function'
        ? Object.assign(value.bind(component), value)
        : value
    },
  })
}

export const VueTracker: Plugin = {
  install(app, options: Partial<TrackConfig>) {
    Object.assign(track.config, options)
    const injection = { trackBy, collectBy }
    app.provide(trackerInjectionKey, injection)
    app.directive('track-by', TrackByDirective)
    app.config.globalProperties.$_tracker = injection
    app.config.globalProperties.$track = track
    app.config.globalProperties.$trackBy = trackBy
    app.config.globalProperties.$collectBy = collectBy
  },
}
