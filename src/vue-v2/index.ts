/// <reference types="vue-v2/types/options" />
/// <reference types="vue-v2/types/vue" />
import type { DirectiveOptions, PluginObject } from 'vue-v2'
import type VueComponent from 'vue-v2'
import type { TrackConfig } from '../core/config'
import { track } from '../core/track'
import '../lib/channels/pipe'
import { watchIntersection, unwatchIntersection } from '../utils/intersection'

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
  (this: VueComponent, key: string, data: Record<string, any>, channels?: string[]) => NonNullable<T>
)

export type ComponentBoundMap<T> = {
  [P in keyof T]: ComponentBoundValue<T[P]>;
}

interface TrackedByMeta {
  page?: string,
  module?: string,
}

type TrackedByObject = ComponentBoundMap<{
  final?: boolean,
  prevented?: boolean,
  channels?: string[],
  with?: Record<string, any>,
  meta?: TrackedByMeta,
  [key: string]: any,
}>

type TrackedByFunction = (key: string, data: Record<string, any>) => unknown

export type TrackedByOptions = TrackedByObject | TrackedByFunction

declare module 'vue-v2/types/vue' {
  export interface Vue {
    $track: typeof track,
    $trackBy: typeof trackBy,
  }
}

declare module 'vue-v2/types/options' {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface ComponentOptions<V extends Vue> {
    trackedBy?: TrackedByOptions,
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
  component: Vue,
  listener: () => void,
}

interface TrackByBindingPattern {
  el?: HTMLElement,
  key?: string,
  component?: Vue,
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

function extractDataFromMeta(meta: TrackedByMeta | undefined, key: string) {
  const data = {}
  if (!meta) return data
  if (meta.page) {
    let field = 'at_page'
    if (key === 'route') {
      field = 'from_page'
    } else if (key === 'route.post') {
      field = 'to_page'
    }
    data[field] = meta.page
  }
  if (meta.module) {
    let field = 'from_module'
    if (key === 'appear') {
      field = 'at_module'
    } else if (key === 'route.post') {
      field = 'to_module'
    }
    data[field] = meta.module
  }
  return data
}

function trackByFinally(key: string, data: Record<string, any>, channels?: string[]) {
  return track(`by:${key}`, data, channels)
}

export function trackBy(this: Vue | void, key: string, data: Record<string, any>, channels?: string[]) {
  let component: Vue | null = this || null
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
        ...extractDataFromMeta(bindComponent(action.meta), key),
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
    const pattern: TrackByBindingPattern = { key, component }
    if (isPrevented(pattern)) return undefined
    data = assignWith(data, pattern)
    component = component.$parent as Vue | null
  }
  if (track.config.fallbackTrackingBy) {
    return trackByFinally(key, data, channels)
  }
}

trackBy.final = trackByFinally

export function collectBy(this: Vue | void, key: string, data: Record<string, any> = {}) {
  const result: ReturnType<typeof trackBy> = trackBy.call(this, key, data, ['pipe'])
  return result?.[0].result as { key: string, data: Record<string, any> } | null | undefined
}

const TrackByDirective: DirectiveOptions = {
  bind(el, { arg = '', value, modifiers }, { context, componentInstance }) {
    const key = modifiers.route ? 'route' : arg
    const binding: TrackByBinding = {
      el,
      arg: arg as TrackByEvent,
      key,
      value,
      modifiers: modifiers as TrackByModifiers,
      component: componentInstance as VueComponent,
      listener: () => {
        const data = assignWith(binding.value, { key, el })
        trackBy.call(context, key, data)
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
  update(el, { arg = '', value, oldValue }) {
    const binding = bindings.find(
      item => item.el === el && item.arg === arg && item.value === oldValue
    )
    if (binding) binding.value = value
  },
  unbind(el, { arg = '', value, modifiers }) {
    const index = bindings.findIndex(
      item => item.el === el && item.arg === arg && item.value === value
    )
    // `beforeUnmount` will be triggered multiple times sometimes in vue@3
    // Not sure if it will occur in vue@2
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

export const VueTracker: PluginObject<Partial<TrackConfig>> = {
  install(Vue, options) {
    Object.assign(track.config, options)
    Vue.prototype.$track = track
    Vue.directive('track-by', TrackByDirective)
    Vue.prototype.$trackBy = trackBy
    Vue.prototype.$collectBy = collectBy
  },
}
