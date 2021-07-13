import { mount } from '@vue/test-utils'
import { WillAppear } from '../../src/vue/will-appear'
import { mockIntersectionObserver, triggerIntersectionObserver } from '../intersection.mock'

describe('WillAppear', () => {

  it('should be able to be triggered when the element is intersecting', () => {
    const { observer, containsSpy, observerSpy } = mockIntersectionObserver()
    const handleAppear = jest.fn()

    const Component = {
      template: `
        <p v-will-appear @appear="handleAppear"></p>
      `,
      setup() {
        return {
          handleAppear,
        }
      },
    }
    const wrapper = mount(Component, {
      global: {
        plugins: [
          [WillAppear],
        ],
      },
    })

    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(handleAppear).toHaveBeenCalled()
    handleAppear.mockClear()
    // Should be triggered for multiple times
    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(handleAppear).toHaveBeenCalled()

    wrapper.unmount()
    containsSpy.mockRestore()
    observerSpy.mockRestore()
  })

  it('should only trigger once when `once` is set to true', () => {
    const { observer, containsSpy, observerSpy } = mockIntersectionObserver()
    const handleAppear = jest.fn()

    const Component = {
      template: `
        <p v-will-appear @appear.once="handleAppear"></p>
      `,
      setup() {
        return {
          handleAppear,
        }
      },
    }
    const wrapper = mount(Component, {
      global: {
        plugins: [
          [WillAppear],
        ],
      },
    })

    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(handleAppear).toHaveBeenCalled()
    handleAppear.mockClear()
    // Should be triggered for multiple times
    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(handleAppear).not.toHaveBeenCalled()

    wrapper.unmount()
    containsSpy.mockRestore()
    observerSpy.mockRestore()
  })

})
