export interface AliyunOSSConfig {
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  region: string
  prefix: string
}

export interface Settings {
  subDir: string
  imageMode: 'local' | 'oss'
  ossProvider: 'aliyun'
  aliyunOSS: AliyunOSSConfig
}

const STORAGE_KEY = 'feishu-clipper-settings'

export const DEFAULT_SETTINGS: Settings = {
  subDir: 'Clippings',
  imageMode: 'local',
  ossProvider: 'aliyun',
  aliyunOSS: {
    accessKeyId: '',
    accessKeySecret: '',
    bucket: '',
    region: 'oss-cn-hangzhou',
    prefix: '',
  },
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const stored = (result[STORAGE_KEY] ?? {}) as Partial<Settings>
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    aliyunOSS: { ...DEFAULT_SETTINGS.aliyunOSS, ...stored.aliyunOSS },
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
}
