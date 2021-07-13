import { unwatchIntersection, watchIntersection } from '../utils/intersection'
import type { DirectiveOptions, PluginObject } from 'vue-v2'

function triggerAppearEvent(el: HTMLElement) {
  const event = new CustomEvent('appear')
  el.dispatchEvent(event)
}

export const WillAppearDirective: DirectiveOptions = {
  bind(el) {
    watchIntersection(el, triggerAppearEvent)
  },
  unbind(el) {
    unwatchIntersection(el, triggerAppearEvent)
  },
}

export const WillAppear: PluginObject<void> = {
  install(Vue) {
    Vue.directive('will-appear', WillAppearDirective)
  },
}
