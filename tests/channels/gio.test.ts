import { track } from '../../src'
import '../../src/lib/channels/gio'

describe('GrowingIOChannel', () => {

  it('should send tracking data correctly', () => {
    const defaultGIOInstance = track.config.gioInstance
    const mockGIOInstance = jest.fn()
    track.config.gioInstance = mockGIOInstance

    track('config:user', { id: 2 }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('setUserId', 2)

    track('foo', { bar: 'baz' }, ['gio'])
    expect(mockGIOInstance).toHaveBeenCalledWith('track', 'foo', { bar: 'baz' })

    track.config.gioInstance = defaultGIOInstance
  })

})
