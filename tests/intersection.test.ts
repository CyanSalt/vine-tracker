import { unwatchIntersection, watchIntersection } from '../src/utils/intersection'
import { getObservationTargets, mockIntersectionObserver, triggerIntersectionObserver } from './intersection.mock'

describe('watchIntersection', () => {

  it('should be able to be triggered when the element is intersecting', () => {
    const { observer, containsSpy, observerSpy } = mockIntersectionObserver()

    const el = document.createElement('div')
    const mockFn = jest.fn()
    watchIntersection(el, mockFn)
    expect(observerSpy).toHaveBeenCalled()

    expect(getObservationTargets(observer)).toContainEqual({ element: el, entry: null })

    containsSpy.mockImplementation(() => true)
    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(mockFn).toHaveBeenCalled()
    mockFn.mockClear()
    // Should be triggered for multiple times
    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(mockFn).toHaveBeenCalled()
    mockFn.mockClear()

    unwatchIntersection(el, mockFn)

    triggerIntersectionObserver(observer, { isIntersecting: true })
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
    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(mockFn).toHaveBeenCalled()
    mockFn.mockClear()
    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(mockFn).not.toHaveBeenCalled()

    containsSpy.mockRestore()
    observerSpy.mockRestore()
  })

})
