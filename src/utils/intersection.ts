import 'intersection-observer'
import throttle from 'lodash.throttle'

declare global {
  interface IntersectionObserver {
    POLL_INTERVAL?: number,
    USE_MUTATION_OBSERVER?: boolean,
  }
}

type IntersectionListener = (el: Element) => void

interface WatcherOptions {
  once?: boolean,
  interval?: number,
  options?: IntersectionObserverInit,
}

interface Watcher extends WatcherOptions {
  el: HTMLElement,
  listener: IntersectionListener,
  _listener: IntersectionListener,
}

let observer: IntersectionObserver | undefined
let watchers: Watcher[] = []

function getWatcherCount(el) {
  return watchers.filter(watcher => watcher.el === el).length
}

function removeWatcher(watcher) {
  watchers = watchers.filter(item => item !== watcher)
  if (observer && !getWatcherCount(watcher.el)) {
    observer.unobserve(watcher.el)
  }
}

export function watchIntersection(
  el: HTMLElement,
  listener: IntersectionListener,
  { once, interval, options }: WatcherOptions = {},
) {
  if (!observer) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        watchers.filter(watcher => watcher.el === target)
          .forEach(watcher => {
            if (isIntersecting) {
              const fn = watcher._listener
              fn(target)
              if (watcher.once) {
                removeWatcher(watcher)
              }
            }
          })
      })
    }, options)
    // for polyfill
    observer.POLL_INTERVAL = interval
    observer.USE_MUTATION_OBSERVER = false
  }
  if (!getWatcherCount(el)) {
    observer.observe(el)
  }
  const watcher = { el, listener, _listener: listener, once }
  watcher._listener = throttle(watcher._listener, interval)
  watchers.push(watcher)
}

export function unwatchIntersection(el: HTMLElement, listener: IntersectionListener) {
  watchers.filter(item => item.el === el && item.listener === listener)
    .forEach(watcher => {
      removeWatcher(watcher)
    })
}
