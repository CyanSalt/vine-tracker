import type { Channel } from '../../core/channel'
import { registerChannel } from '../../core/channel'

const PipeChannel: Channel = {
  config(key, data) {
    return { type: 'config', key, data }
  },
  track(key, data) {
    return { type: 'track', key, data }
  },
  by(key, data) {
    return this.track(key, data)
  },
}

registerChannel('pipe', PipeChannel)

export default PipeChannel
