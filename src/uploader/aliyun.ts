import type { AliyunOSSConfig } from '../storage/settings'
import type { ImageUploader, UploadParams } from './types'

export class AliyunOSSUploader implements ImageUploader {
  constructor(private readonly _config: AliyunOSSConfig) {}

  async upload(_params: UploadParams): Promise<string> {
    throw new Error('Aliyun OSS upload is not implemented yet')
  }
}
