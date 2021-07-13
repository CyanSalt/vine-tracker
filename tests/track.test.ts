import { track } from '../src'
import GrowingIOChannel from '../src/lib/channels/gio'

describe('track', () => {

  it('should return an array of context', () => {
    const spy = jest.spyOn(console, 'debug')
    spy.mockImplementation()
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance

    const result = track('foo', { bar: 'baz' }, ['console', 'gio'])
    expect(spy).toHaveBeenCalled()
    expect(mockGIOInstance).toHaveBeenCalled()

    expect(result).toBeInstanceOf(Array)
    expect(result).toHaveLength(2)

    spy.mockRestore()
    track.config.gioInstance = defaultGIOInstance
  })

  it('should distribute events by keys', async () => {
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance

    const configSpy = jest.spyOn(GrowingIOChannel, 'config')
    const trackSpy = jest.spyOn(GrowingIOChannel, 'track')

    track('config:foo', { bar: 'baz' }, ['gio'])
    expect(configSpy).toHaveBeenCalled()
    expect(trackSpy).not.toHaveBeenCalled()

    track.config.gioInstance = defaultGIOInstance

    configSpy.mockRestore()
    trackSpy.mockRestore()
  })

  it('should be able to customize the separator of keys', async () => {
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance
    const defaultKeySep = track.config.keySep
    track.config.keySep = '-'

    const configSpy = jest.spyOn(GrowingIOChannel, 'config')
    const trackSpy = jest.spyOn(GrowingIOChannel, 'track')

    track('config-foo', { bar: 'baz' }, ['gio'])
    expect(configSpy).toHaveBeenCalled()
    expect(trackSpy).not.toHaveBeenCalled()

    track.config.gioInstance = defaultGIOInstance
    track.config.keySep = defaultKeySep

    configSpy.mockRestore()
    trackSpy.mockRestore()
  })

  it('should be able to disable globally', () => {
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance
    const defaultDisabled = track.config.disabled
    track.config.disabled = true

    const result = track('foo', { bar: 'baz' }, ['gio'])
    expect(result).toBeInstanceOf(Array)
    expect(mockGIOInstance).not.toHaveBeenCalled()

    track.config.gioInstance = defaultGIOInstance
    track.config.disabled = defaultDisabled
  })

  it('should be able to disable specific channels', () => {
    const spy = jest.spyOn(console, 'debug')
    spy.mockImplementation()
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance
    const defaultDisabled = track.config.disabled
    track.config.disabled = ['console']

    const result = track('foo', { bar: 'baz' }, ['console', 'gio'])
    expect(result).toBeInstanceOf(Array)
    expect(result).toHaveLength(2)
    expect(spy).not.toHaveBeenCalled()
    expect(mockGIOInstance).toHaveBeenCalled()

    spy.mockRestore()
    track.config.gioInstance = defaultGIOInstance
    track.config.disabled = defaultDisabled
  })

  it('should be able to customize error handler', async () => {
    const defaultGIOInstance = track.config.gioInstance
    const mockError = new Error('An error occurs.')
    const mockGIOInstance = jest.fn(() => {
      throw mockError
    })
    track.config.gioInstance = mockGIOInstance
    const defaultErrorHandler = track.config.errorHandler
    const mockErrorHandler = jest.fn<void, [Error]>()
    track.config.errorHandler = mockErrorHandler

    const result = track('foo', { bar: 'baz' }, ['gio'])
    await expect(result[0].result).rejects.toThrow(mockError)
    expect(mockGIOInstance).toHaveBeenCalled()
    expect(mockErrorHandler).toHaveBeenCalledWith(mockError)
    expect(mockError).toMatchObject({
      context: {
        type: 'track',
        key: 'foo',
        data: { bar: 'baz' },
        channel: 'gio',
      },
    })

    track.config.gioInstance = defaultGIOInstance
    track.config.errorHandler = defaultErrorHandler
  })

  it('should be able to specify default channels', () => {
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance
    const defaultDefaultChannels = track.config.defaultChannels
    track.config.defaultChannels = ['gio']

    track('foo', { bar: 'baz' })
    expect(mockGIOInstance).toHaveBeenCalled()

    track.config.gioInstance = defaultGIOInstance
    track.config.defaultChannels = defaultDefaultChannels
  })

  it('should be able to warn with the debug mode on', () => {
    const debugSpy = jest.spyOn(console, 'debug')
    debugSpy.mockImplementation()
    const warnSpy = jest.spyOn(console, 'warn')
    warnSpy.mockImplementation()
    const defaultDebug = track.config.debug
    track.config.debug = true
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance

    const result1 = track('foo', { bar: 'baz' }, ['console'])
    expect(result1).toHaveLength(1)
    debugSpy.mockClear()

    const result2 = track('foo', { bar: 'baz' }, ['gio'])
    expect(result2).toHaveLength(1)
    expect(mockGIOInstance).toHaveBeenCalled()
    expect(debugSpy).toHaveBeenCalled()
    debugSpy.mockClear()

    track('foo', { bar: 'baz' }, ['unknown'])
    expect(debugSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()

    track.config.debug = defaultDebug
    track.config.gioInstance = defaultGIOInstance
    debugSpy.mockRestore()
    warnSpy.mockRestore()
  })

})
