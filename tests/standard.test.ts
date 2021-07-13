import { track } from '../src'
import '../src/lib/channels/gio'

describe('track by standard', () => {

  it('should send tracking data correctly', () => {
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance

    track('by:appear', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'appear', { foo: 'bar' })
    mockGIOInstance.mockClear()

    track('by:click', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'click', { foo: 'bar' })
    mockGIOInstance.mockClear()

    track('by:route', { foo: 'bar' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'route', { foo: 'bar' })
    mockGIOInstance.mockClear()

    track.config.gioInstance = defaultGIOInstance
  })

})
