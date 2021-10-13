import { registerChannel } from '../../core/channel'
import type { Channel } from '../../core/channel'
import config from '../../core/config'

declare global {
  interface Window {
    gio: (action: string, ...args) => void,
  }
}

declare module '../../core/config' {
  export interface TrackConfig {
    /** GrowingIO Instance */
    gioInstance?: (action: string, ...args: any[]) => void,
  }
}

const GrowingIOChannel: Channel = {
  config(key, data) {
    const gio = config.gioInstance ?? window.gio
    switch (key) {
      case 'user':
        gio('setUserId', data.id)
        break
    }
  },
  track(key, data) {
    const gio = config.gioInstance ?? window.gio
    gio('track', key, data)
  },
  by(key, data) {
    return this.track(key, data)
  },
}

registerChannel('gio', GrowingIOChannel)

export default GrowingIOChannel
