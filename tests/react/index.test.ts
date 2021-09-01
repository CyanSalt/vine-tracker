import { createElement } from 'react'
import ReactDOM from 'react-dom'
import { act } from 'react-dom/test-utils'
import { track } from '../../src'
import { Tracker, useTracker, withTracker } from '../../src/react'
import '../../src/lib/channels/gio'

describe('ReactTracker', () => {

  let container

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    container = null
  })

  const defaultGIOInstance = track.config.gioInstance
  const mockGIOInstance = jest.fn()
  track.config.gioInstance = mockGIOInstance

  afterAll(() => {
    track.config.gioInstance = defaultGIOInstance
  })

  it('should be able to inject `trackBy` with `withTracker`', () => {
    const Component = withTracker(props => {
      return createElement('button', {
        onClick: () => {
          expect(typeof props.trackBy).toBe('function')
          props.trackBy.final('foo', { bar: 'baz' }, ['gio'])
        },
      })
    })
    act(() => {
      ReactDOM.render(createElement(Component), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'foo', { bar: 'baz' })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should be able to work with `useTracker` properly', () => {
    const Component = () => {
      const { trackBy } = useTracker()
      return createElement('button', {
        onClick: () => {
          expect(typeof trackBy).toBe('function')
          trackBy.final('foo', { bar: 'baz' }, ['gio'])
        },
      })
    }
    act(() => {
      ReactDOM.render(createElement(Component), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'foo', { bar: 'baz' })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should be able to collect data from parent', () => {
    const Child = () => {
      const { trackBy } = useTracker()
      return createElement('button', {
        onClick: () => {
          trackBy('foo', { bar: 'baz' }, ['gio'])
        },
      })
    }
    const Parent = () => {
      return createElement(Tracker, {
        context: {
          final: true,
          default: {
            qux: 'quux',
          },
        },
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'foo', { bar: 'baz', qux: 'quux' })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should not send data when `trackedBy.final` is unset unless the global config is set', () => {
    const Component = () => {
      const { trackBy } = useTracker()
      return createElement('button', {
        onClick: () => {
          trackBy('foo', { bar: 'baz' }, ['gio'])
        },
      })
    }
    act(() => {
      ReactDOM.render(createElement(Component), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).not.toHaveBeenCalled()

    const defaultFallbackTrackingBy = track.config.fallbackTrackingBy
    track.config.fallbackTrackingBy = true
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'foo', { bar: 'baz' })

    track.config.fallbackTrackingBy = defaultFallbackTrackingBy
    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should also support `trackedBy` in function type', () => {
    const mockFn = jest.fn()
    const Child = () => {
      const { trackBy } = useTracker()
      return createElement('button', {
        onClick: () => {
          trackBy('click', { foo: 'bar' }, ['gio'])
        },
      })
    }
    const Parent = () => {
      return createElement(Tracker, {
        context: mockFn,
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockFn).toHaveBeenCalledWith('click', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).not.toHaveBeenCalled()

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should be able to declare channels for specific components', () => {
    const Child = () => {
      const { trackBy } = useTracker()
      return createElement('button', {
        onClick: () => {
          trackBy('foo', { bar: 'baz' })
        },
      })
    }
    const Parent = () => {
      return createElement(Tracker, {
        context: {
          final: true,
          channels: ['gio'],
        },
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'foo', { bar: 'baz' })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should cancel bubbling when specified the `prevented` option', () => {
    const Child = () => {
      const { trackBy } = useTracker()
      return createElement('button', {
        onClick: () => {
          trackBy('foo', { bar: 'baz' })
        },
      })
    }
    const Parent = () => {
      return createElement(Tracker, {
        context: {
          final: true,
          prevented: true,
        },
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).not.toHaveBeenCalled()

    ReactDOM.unmountComponentAtNode(container)
  })

  it('should also support `trackedBy` options in function types', () => {
    const Child = () => {
      const { trackBy } = useTracker()
      return createElement('div', null, createElement('button', {
        onClick: () => {
          trackBy('click', { baz: 'qux', please_prevent_me: 'foo' }, ['gio'])
        },
      }), createElement('a', {
        onClick: () => {
          trackBy('click', { baz: 'qux', please_prevent_me: 'bar' }, ['gio'])
        },
      }))
    }
    const Parent = props => {
      return createElement(Tracker, {
        context: {
          final() {
            return true
          },
          prevented(event, data) {
            return data.please_prevent_me === props.preventedKey
          },
        },
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent, { preventedKey: 'foo' }), container)
    })
    const button = container.querySelector('button')
    const anchor = container.querySelector('a')
    button.click()
    expect(mockGIOInstance).not.toHaveBeenCalled()
    anchor.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', {
      baz: 'qux',
      please_prevent_me: 'bar',
    })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should be able to listen events by the `Tracker` wrapper', () => {
    const Child = () => {
      return createElement(Tracker, {
        by: 'click',
        data: { foo: 'bar' },
      }, createElement('button'))
    }
    const Parent = () => {
      return createElement(Tracker, {
        context: {
          final: true,
          channels: ['gio'],
        },
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'bar' })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should support the `.route` modifier on the event name', () => {
    const Child = () => {
      return createElement(Tracker, {
        by: 'click.route',
        data: { foo: 'bar' },
      }, createElement('button'))
    }
    const Parent = () => {
      return createElement(Tracker, {
        context: {
          final: true,
          channels: ['gio'],
        },
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'route', { foo: 'bar' })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should also merge common data into the bubbling event data', () => {
    const Child = () => {
      return createElement(Tracker, {
        by: 'click',
        data: { foo: 'bar' },
      }, createElement('button'))
    }
    const Parent = () => {
      return createElement(Tracker, {
        context: {
          final: true,
          channels: ['gio'],
          with: {
            baz: 'qux',
          },
          click: {
            quux: 'corage',
          },
        },
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', {
      foo: 'bar',
      baz: 'qux',
      quux: 'corage',
    })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

  it('should be executed in the correct order', () => {
    const Descendant = () => {
      const { trackBy } = useTracker()
      return createElement('button', {
        onClick: () => {
          trackBy('click', { foo: 'a' }, ['gio'])
        },
      })
    }
    const Child = () => {
      return createElement(Tracker, {
        context: true,
        data: {
          foo: 'b',
          bar: 'c',
        },
      }, createElement(Descendant))
    }
    const Parent = () => {
      return createElement(Tracker, {
        context: {
          final: true,
          with: {
            bar: 'd',
            baz: 'e',
          },
        },
      }, createElement(Child))
    }
    act(() => {
      ReactDOM.render(createElement(Parent), container)
    })
    const button = container.querySelector('button')
    button.click()
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'a', bar: 'c', baz: 'e' })

    mockGIOInstance.mockClear()
    ReactDOM.unmountComponentAtNode(container)
  })

})
