import type { ObjectDirective, Plugin } from 'vue'
import { unwatchIntersection, watchIntersection } from '../utils/intersection'

function triggerAppearEvent(el: HTMLElement) {
  const event = new CustomEvent('appear')
  el.dispatchEvent(event)
}

export const WillAppearDirective: ObjectDirective<HTMLElement, never> = {
  mounted(el) {
    watchIntersection(el, triggerAppearEvent)
  },
  beforeUnmount(el) {
    unwatchIntersection(el, triggerAppearEvent)
  },
}

export const WillAppear: Plugin = {
  install(app) {
    app.directive('will-appear', WillAppearDirective)
  },
}
