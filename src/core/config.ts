export interface TrackConfig {
  /** Global disable tracking behavior */
  disabled: boolean | string[],
  /** Whether to turn on debug mode */
  debug: boolean,
  /** Error handling function */
  errorHandler: (err: Error) => void,
  /** Default tracking channels */
  defaultChannels: string[],
  /** Event name separator */
  keySep: string,
}

const config: TrackConfig = {
  disabled: false,
  debug: false,
  errorHandler: console.error,
  defaultChannels: ['console'],
  keySep: ':',
}

export default config
