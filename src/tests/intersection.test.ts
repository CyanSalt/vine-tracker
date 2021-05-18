import { unwatchIntersection, watchIntersection } from '../utils/intersection'

describe('watchIntersection', () => {

  let mocked
  function mockIntersectionObserver() {
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

  it('should be able to be triggered when the element is intersecting', () => {
    const { observer, containsSpy, observerSpy } = mockIntersectionObserver()

    const el = document.createElement('div')
    const mockFn = jest.fn()
    watchIntersection(el, mockFn)
    expect(observerSpy).toHaveBeenCalled()

    expect(observer['_observationTargets']).toContainEqual({ element: el, entry: null })

    containsSpy.mockImplementation(() => true)
    observer['_callback']([{ target: el, isIntersecting: true }], observer)
    expect(mockFn).toHaveBeenCalled()
    mockFn.mockClear()
    // Should be triggered for multiple times
    observer['_callback']([{ target: el, isIntersecting: true }], observer)
    expect(mockFn).toHaveBeenCalled()
    mockFn.mockClear()

    unwatchIntersection(el, mockFn)

    observer['_callback']([{ target: el, isIntersecting: true }], observer)
    expect(mockFn).not.toHaveBeenCalled()

    containsSpy.mockRestore()
    observerSpy.mockRestore()
  })

  it('should only trigger once when `once` is set to true', () => {
    const { observer, containsSpy, observerSpy } = mockIntersectionObserver()

    const el = document.createElement('div')
    const mockFn = jest.fn()
    watchIntersection(el, mockFn, { once: true })

    containsSpy.mockImplementation(() => true)
    observer['_callback']([{ target: el, isIntersecting: true }], observer)
    expect(mockFn).toHaveBeenCalled()
    mockFn.mockClear()
    observer['_callback']([{ target: el, isIntersecting: true }], observer)
    expect(mockFn).not.toHaveBeenCalled()

    containsSpy.mockRestore()
    observerSpy.mockRestore()
  })

})
