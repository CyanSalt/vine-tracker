import { getChannel } from './channel'
import config from './config'
import '../lib/channels/console'

export interface TrackContext {
  type: string,
  key: string,
  data: Record<string, any>,
  channel: string,
  result: unknown,
}

function resolveTypedKey(fullKey: string): [string, string] {
  const sepIndex = fullKey.indexOf(config.keySep)
  return [
    sepIndex > 0 ? fullKey.slice(0, sepIndex) : 'track',
    fullKey.slice(sepIndex + 1),
  ]
}

function settle(result: any, context: TrackContext) {
  if (result && typeof result.then === 'function') {
    result.then(undefined, err => {
      err.context = context
      const errorHandler = config.errorHandler
      errorHandler(err)
    })
  }
  return result
}

export function track(fullKey: string, data: Record<string, any>, channels?: string[]) {
  const [type, key] = resolveTypedKey(fullKey)
  if (!channels) {
    channels = config.defaultChannels
  }
  let debugChannels: string[] = []
  if (config.debug) {
    if (!channels.length) {
      console.warn(`[vine-tracker]: No channel specified.`)
    }
    if (!channels.includes('console')) {
      debugChannels = ['console']
    }
  }
  const contexts = [...debugChannels, ...channels].map(name => {
    const channel = getChannel(name)
    const context: TrackContext = { type, key, data, channel: name, result: null }
    if (channel && typeof channel[type] === 'function') {
      const disabled = Array.isArray(config.disabled)
        ? config.disabled.includes(name) : config.disabled
      if (!disabled) {
        try {
          const result: any = channel[type](key, data)
          context.result = settle(result, context)
        } catch (err) {
          context.result = settle(Promise.reject(err), context)
        }
      }
    } else if (config.debug) {
      console.warn(`[vine-tracker]: Unknown action '${type}' for channel '${name}'.`)
    }
    return context
  })
  return contexts.slice(debugChannels.length)
}

track.config = config
