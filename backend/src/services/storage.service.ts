import { getStorageProvider } from '../providers';

export class StorageService {
  private provider = getStorageProvider();

  async upload(file: { originalname: string; buffer: Buffer; mimetype: string }, folderPath: string) {
    return this.provider.uploadFile(file, folderPath);
  }

  async delete(fileId: string) {
    return this.provider.deleteFile(fileId);
  }
}

export default new StorageService();
