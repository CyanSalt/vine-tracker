let mocked
export function mockIntersectionObserver() {
  if (mocked) return mocked
  const observer = new IntersectionObserver(() => { /* void */ })
  const containsSpy = jest.spyOn(observer, '_rootContainsTarget' as any)

  const observerSpy = jest.spyOn(window, 'IntersectionObserver')
  observerSpy.mockImplementation(callback => {
    observer['_callback'] = callback
    return observer
  })

  mocked = {
    observer,
    observerSpy,
    containsSpy,
  }
  return mocked
}

export function getObservationTargets(observer: IntersectionObserver) {
  return observer['_observationTargets']
}

export function triggerIntersectionObserver(
  observer: IntersectionObserver,
  args: Partial<IntersectionObserverEntry>,
) {
  observer['_callback'](
    getObservationTargets(observer).map(item => ({ ...args, target: item.element })),
    observer,
  )
}
