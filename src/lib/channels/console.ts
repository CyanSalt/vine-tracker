import { registerChannel } from '../../core/channel'
import type { Channel } from '../../core/channel'

const ConsoleChannel: Channel = {
  config(key, data) {
    console.debug(`[vine-tracker] config:${key}`, data)
  },
  track(key, data) {
    console.debug(`[vine-tracker] track:${key}`, data)
  },
  by(key, data) {
    return this.track(key, data)
  },
}

registerChannel('console', ConsoleChannel)

export default ConsoleChannel
