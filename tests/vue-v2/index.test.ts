import { createLocalVue, mount } from 'vue-test-utils-v1'
import { track } from '../../src'
import { VueTracker } from '../../src/vue-v2'
import '../../src/lib/channels/gio'

describe('VueTracker', () => {

  const localVue = createLocalVue()
  const defaultGIOInstance = track.config.gioInstance
  const mockGIOInstance = jest.fn()
  localVue.use(VueTracker, {
    gioInstance: mockGIOInstance,
  })

  afterAll(() => {
    track.config.gioInstance = defaultGIOInstance
  })

  it('should be able to configure track by plugin options', () => {
    expect(track.config.gioInstance).toBe(mockGIOInstance)
  })

  it('should mount `$track` to all components', () => {
    const Component = {
      template: `
        <p></p>
      `,
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.vm.$track('foo', { bar: 'baz' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'foo', { bar: 'baz' })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should send data with the standard', () => {
    const Component = {
      template: `
        <p></p>
      `,
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.vm.$trackBy.final('click', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'bar' })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should not send data when `trackedBy.final` is unset unless the global config is set', () => {
    const Component = {
      template: `
        <p></p>
      `,
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.vm.$trackBy('click', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).not.toHaveBeenCalled()

    const defaultFallbackTrackingBy = track.config.fallbackTrackingBy
    track.config.fallbackTrackingBy = true
    wrapper.vm.$trackBy('click', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'bar' })

    track.config.fallbackTrackingBy = defaultFallbackTrackingBy
    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should send data when any `trackedBy.final` is set to true', () => {
    const Component = {
      template: `
        <p></p>
      `,
      trackedBy: {
        final: true,
      },
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.vm.$trackBy('click', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'bar' })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should also support `trackedBy` in function type', () => {
    const mockFn = jest.fn()
    const Component = {
      template: `
        <p></p>
      `,
      trackedBy: mockFn,
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.vm.$trackBy('click', { foo: 'bar' }, ['gio'])
    expect(mockFn).toHaveBeenCalledWith('click', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).not.toHaveBeenCalled()

    wrapper.destroy()
  })

  it('should be able to declare channels for specific components', () => {
    const Component = {
      template: `
        <p></p>
      `,
      trackedBy: {
        final: true,
        channels: ['gio'],
      },
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.vm.$trackBy('click', { foo: 'bar' })
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'bar' })

    wrapper.destroy()
  })

  it('should be able to collect data from the full path', () => {
    const Child = {
      template: `
        <p></p>
      `,
      trackedBy: {
        click: {
          foo: 'bar',
        },
      },
    }
    const Parent = {
      components: {
        Child,
      },
      template: `
        <p>
          <Child ref="child"></Child>
        </p>
      `,
      trackedBy: {
        final: true,
        click: {
          baz: 'qux',
          quux: 'corage',
        },
      },
    }
    const wrapper = mount(Parent, {
      localVue,
    })
    wrapper.findComponent({ ref: 'child' }).vm.$trackBy('click', { quux: 'grault' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', {
      foo: 'bar',
      baz: 'qux',
      quux: 'grault',
    })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should cancel bubbling when specified the `prevented` option', () => {
    const Child = {
      template: `
        <p></p>
      `,
      trackedBy: {
        prevented: true,
      },
    }
    const Parent = {
      components: {
        Child,
      },
      template: `
        <p>
          <Child ref="child"></Child>
        </p>
      `,
      trackedBy: {
        final: true,
        click: {
          foo: 'bar',
        },
      },
    }
    const wrapper = mount(Parent, {
      localVue,
    })
    wrapper.findComponent({ ref: 'child' }).vm.$trackBy('click', { baz: 'qux' }, ['gio'])
    expect(mockGIOInstance).not.toHaveBeenCalled()

    wrapper.destroy()
  })

  it('should also support `trackedBy` options in function types', () => {
    const Component = {
      data() {
        return {
          preventedKey: 'foo',
        }
      },
      template: `
        <p></p>
      `,
      trackedBy: {
        final() {
          return true
        },
        prevented(event, data) {
          return data.please_prevent_me === this.preventedKey
        },
      },
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.vm.$trackBy('click', { baz: 'qux', please_prevent_me: 'foo' }, ['gio'])
    expect(mockGIOInstance).not.toHaveBeenCalled()
    wrapper.vm.$trackBy('click', { baz: 'qux', please_prevent_me: 'bar' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', {
      baz: 'qux',
      please_prevent_me: 'bar',
    })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should be able to listen events by the directive', () => {
    const Component = {
      template: `
        <p v-track-by:click="{ foo: 'bar' }"></p>
      `,
      trackedBy: {
        final: true,
        channels: ['gio'],
      },
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.trigger('click')
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'bar' })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should support the `.route` modifier on the directive', () => {
    const Component = {
      template: `
        <p v-track-by:click.route="{ foo: 'bar' }"></p>
      `,
      trackedBy: {
        final: true,
        channels: ['gio'],
      },
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.trigger('click')
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'route', { foo: 'bar' })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should be able to declare common data by the `.with` modifier', () => {
    const Component = {
      template: `
        <p
          v-track-by:click="{ foo: 'bar' }"
          v-track-by:click.with="{ baz: 'qux' }"
          v-track-by:appear.with="{ quux: 'corage' }"
          v-track-by.with="{ grault: 'garply' }"
        ></p>
      `,
      trackedBy: {
        final: true,
        channels: ['gio'],
      },
    }
    const wrapper = mount(Component, {
      localVue,
    })
    wrapper.trigger('click')
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', {
      foo: 'bar',
      baz: 'qux',
      grault: 'garply',
    })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should also merge common data into the bubbling event data', () => {
    const Child = {
      template: `
        <p>
          <span v-track-by:click="{ foo: 'bar' }"></span>
        </p>
      `,
    }
    const Parent = {
      components: {
        Child,
      },
      template: `
        <p>
          <Child
            ref="child"
            v-track-by:click.with="{ baz: 'qux' }"
            v-track-by:appear.with="{ quux: 'corage' }"
            v-track-by.with="{ grault: 'garply' }"
          ></Child>
        </p>
      `,
      trackedBy: {
        final: true,
        channels: ['gio'],
      },
    }
    const wrapper = mount(Parent, {
      localVue,
    })
    wrapper.findComponent({ ref: 'child' }).find('span').trigger('click')
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', {
      foo: 'bar',
      baz: 'qux',
      grault: 'garply',
    })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should be able to cancel specified events', () => {
    const Child = {
      template: `
        <p>
          <span v-track-by:click="{ foo: 'bar' }"></span>
        </p>
      `,
    }
    const Parent = {
      components: {
        Child,
      },
      template: `
        <p>
          <Child ref="child" v-track-by:click.prevent></Child>
        </p>
      `,
      trackedBy: {
        final: true,
        channels: ['gio'],
      },
    }
    const wrapper = mount(Parent, {
      localVue,
    })
    wrapper.findComponent({ ref: 'child' }).find('span').trigger('click')
    expect(mockGIOInstance).not.toHaveBeenCalled()

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should be able to merge common data for all bubbling events', () => {
    const Child = {
      template: `
        <span></span>
      `,
    }
    const Parent = {
      components: {
        Child,
      },
      template: `
        <p>
          <Child ref="first"></Child>
          <Child ref="second"></Child>
        </p>
      `,
      trackedBy: {
        final: true,
        channels: ['gio'],
        with: {
          baz: 'quux',
        },
      },
    }
    const wrapper = mount(Parent, {
      localVue,
    })
    wrapper.findComponent({ ref: 'first' }).vm.$trackBy('click', { foo: 'bar' })
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'bar', baz: 'quux' })
    mockGIOInstance.mockClear()

    wrapper.findComponent({ ref: 'second' }).vm.$trackBy('click', { baz: 'qux' })
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { baz: 'qux' })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

  it('should be executed in the correct order', () => {
    const Descendant = {
      template: `
        <span></span>
      `,
      trackedBy: {
        with: {
          foo: 'b',
          bar: 'c',
        },
      },
    }
    const Child = {
      components: {
        Descendant,
      },
      template: `
        <Descendant ref="descendant" v-track-by:click.with="{ bar: 'd', baz: 'e' }"></Descendant>
      `,
      trackedBy: {
        with: {
          baz: 'f',
          qux: 'g',
        },
      },
    }
    const Parent = {
      components: {
        Child,
      },
      template: `
        <p>
          <Child
            ref="child"
            v-track-by.with="{ qux: 'h', quux: 'i' }"
            v-track-by.with.another="{ quux: 'j', corage: 'k' }"
          ></Child>
        </p>
      `,
      trackedBy: {
        final: true,
        with: {
          corage: 'l',
        },
      },
    }
    const wrapper = mount(Parent, {
      localVue,
    })
    const child = wrapper.findComponent({ ref: 'child' })
    const descendant = child.findComponent({ ref: 'descendant' })
    descendant.vm.$trackBy('click', { foo: 'a' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'a', bar: 'c', baz: 'e', qux: 'g', quux: 'j', corage: 'k' })

    mockGIOInstance.mockClear()
    wrapper.destroy()
  })

})
