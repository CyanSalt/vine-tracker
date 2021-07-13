import { track } from '../../src'

describe('ConsoleChannel', () => {

  it('should send tracking data correctly', () => {
    const spy = jest.spyOn(console, 'debug')
    spy.mockImplementation()

    track('foo', { bar: 'baz' }, ['console'])
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

})
