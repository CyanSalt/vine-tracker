export type ChannelAction = (key: string, data: Record<string, any>) => unknown

export type Channel = Record<string, ChannelAction>

const ChannelRegistry = new Map<string, Channel>()

export function registerChannel(key: string, value: Channel) {
  ChannelRegistry.set(key, value)
}

export function getChannel(key: string) {
  return ChannelRegistry.get(key)
}

export function getAllChannelNames() {
  return [...ChannelRegistry.keys()]
}
