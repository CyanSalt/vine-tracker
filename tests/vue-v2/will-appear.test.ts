import { createLocalVue, mount } from 'vue-test-utils-v1'
import { WillAppear } from '../../src/vue-v2/will-appear'
import { mockIntersectionObserver, triggerIntersectionObserver } from '../intersection.mock'
import type { LocalVueClass } from './types'

describe('WillAppear', () => {

  const localVue = createLocalVue() as LocalVueClass
  localVue.use(WillAppear)

  it('should be able to be triggered when the element is intersecting', () => {
    const { observer, containsSpy, observerSpy } = mockIntersectionObserver()
    const handleAppear = jest.fn()

    const Component = {
      template: `
        <p v-will-appear @appear="handleAppear"></p>
      `,
      methods: {
        handleAppear,
      },
    }
    const wrapper = mount(Component, {
      localVue,
    })

    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(handleAppear).toHaveBeenCalled()
    handleAppear.mockClear()
    // Should be triggered for multiple times
    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(handleAppear).toHaveBeenCalled()

    wrapper.destroy()
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
      methods: {
        handleAppear,
      },
    }
    const wrapper = mount(Component, {
      localVue,
    })

    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(handleAppear).toHaveBeenCalled()
    handleAppear.mockClear()
    // Should be triggered for multiple times
    triggerIntersectionObserver(observer, { isIntersecting: true })
    expect(handleAppear).not.toHaveBeenCalled()

    wrapper.destroy()
    containsSpy.mockRestore()
    observerSpy.mockRestore()
  })

})
