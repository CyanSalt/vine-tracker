/// <reference lib="es2020" />
import { getCurrentInstance, inject } from 'vue'
import { track } from '../core/track'
import { executeCollectBy, executeTrackBy, trackByFinally } from '../lib/integration'
import { watchIntersection, unwatchIntersection } from '../utils/intersection'
import type { TrackConfig } from '../core/config'
import type { TrackByEvent, TrackByContext, TrackByIteration } from '../lib/integration'
import type { ObjectDirective, Plugin, ComponentPublicInstance, ComponentInternalInstance, InjectionKey } from 'vue'

declare module '../core/config' {
  export interface TrackConfig {
    /** Time interval of appearing detection */
    appearingInterval?: number,
    /** Options for IntersectionObserver of appearing detection */
    appearingOptions?: IntersectionObserverInit,
  }
}

export type TrackedByOptions = TrackByContext<ComponentPublicInstance>

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
  }).reverse()
  for (const item of assigned) {
    data = { ...item.value, ...data }
  }
  return data
}

function isPrevented(pattern: TrackByBindingPattern) {
  return bindings.some(binding => {
    return binding.modifiers.prevent && isMatchedBinding(binding, pattern)
  })
}

const definedContextMap = new WeakMap<ComponentInternalInstance, TrackedByOptions>()

function getDefinedContext(component: ComponentPublicInstance) {
  if (definedContextMap.has(component.$)) {
    return definedContextMap.get(component.$)
  }
  return component.$options.trackedBy
}

export function defineTrackedBy(options: TrackedByOptions) {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('"defineTrackedBy" is called when there is no active component instance to be associated with.')
  }
  if (definedContextMap.has(instance)) {
    console.warn('[vine-tracker]: Duplicated "defineTrackedBy" call.')
  }
  definedContextMap.set(instance, options)
}

type Nullable<T> = T | null | undefined

function* createContextIterator(component: Nullable<ComponentPublicInstance>): Iterable<TrackByIteration<ComponentPublicInstance>> {
  while (component) {
    const context = getDefinedContext(component)
    yield {
      context,
      receiver: component,
    }
    // Directives (outside)
    const pattern: TrackByBindingPattern = { component: component.$ }
    yield {
      context: {
        prevented: key => isPrevented({ ...pattern, key }),
        default: (key, data) => assignWith(data, { ...pattern, key }),
      },
      receiver: component,
    }
    component = component.$parent
  }
}

export function trackBy(this: Nullable<ComponentPublicInstance>, key: string, data: Record<string, any>, channels?: string[]) {
  return executeTrackBy(createContextIterator(this), key, data, channels)
}

trackBy.final = trackByFinally

export function collectBy(this: Nullable<ComponentPublicInstance>, key: string, data: Record<string, any> = {}) {
  return executeCollectBy(createContextIterator(this), key, data)
}

const TrackByDirective: ObjectDirective<HTMLElement, Record<string, any>> = {
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
        // Directives (inside)
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
