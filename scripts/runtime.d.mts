export function primaryDirectory(env?: NodeJS.ProcessEnv): string
export function sameDirectory(a: string, b: string): boolean
export function runtimeConfiguration(env?: NodeJS.ProcessEnv, configFile?: string): { profile: string; directory: string; dataProfile: string; servicePort: number; clientPort: number }
