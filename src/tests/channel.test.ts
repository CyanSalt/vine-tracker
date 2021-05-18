import { track } from '..'
import { getAllChannelNames, registerChannel } from '../core/channel'
import GrowingIOChannel from '../lib/channels/gio'

describe('track', () => {

  it('should be able to customize built-in channels', () => {
    const mockGIOChannel = {
      track: jest.fn(),
    }
    registerChannel('gio', mockGIOChannel)
    const spy = jest.spyOn(GrowingIOChannel, 'track')

    expect(getAllChannelNames()).toContain('gio')

    track('foo', { bar: 'baz' }, ['gio'])
    expect(mockGIOChannel.track).toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()

    registerChannel('gio', GrowingIOChannel)
    spy.mockRestore()
  })

})
