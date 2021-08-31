/// <reference types="vue-v2/types/options" />
/// <reference types="vue-v2/types/vue" />
import { track } from '../core/track'
import { executeCollectBy, executeTrackBy, trackByFinally } from '../lib/integration'
import { watchIntersection, unwatchIntersection } from '../utils/intersection'
import type { TrackConfig } from '../core/config'
import type { TrackByEvent, TrackByContext, TrackByIteration } from '../lib/integration'
import type { DirectiveOptions, PluginObject } from 'vue-v2'
import type VueComponent from 'vue-v2'

declare module '../core/config' {
  export interface TrackConfig {
    /** Time interval of appearing detection */
    appearingInterval?: number,
    /** Options for IntersectionObserver of appearing detection */
    appearingOptions?: IntersectionObserverInit,
  }
}

declare module 'vue-v2/types/vue' {
  export interface Vue {
    $track: typeof track,
    $trackBy: typeof trackBy,
  }
}

export type TrackedByOptions = TrackByContext<VueComponent>

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

interface TrackByBinding {
  el: HTMLElement,
  arg: TrackByEvent,
  key: string,
  value: Record<string, any>,
  modifiers: TrackByModifiers,
  component: VueComponent,
  listener: () => void,
}

interface TrackByBindingPattern {
  el?: HTMLElement,
  key?: string,
  component?: VueComponent,
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

type Nullable<T> = T | null | undefined

function* createContextIterator(component: Nullable<VueComponent>): Iterable<TrackByIteration<VueComponent>> {
  while (component) {
    const context = component.$options.trackedBy
    yield {
      context,
      receiver: component,
    }
    // Directives (outside)
    const pattern: TrackByBindingPattern = { component }
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

export function trackBy(this: Nullable<VueComponent>, key: string, data: Record<string, any>, channels?: string[]) {
  return executeTrackBy(createContextIterator(this), key, data, channels)
}

trackBy.final = trackByFinally

export function collectBy(this: Nullable<VueComponent>, key: string, data: Record<string, any> = {}) {
  return executeCollectBy(createContextIterator(this), key, data)
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
        // Directives (inside)
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
