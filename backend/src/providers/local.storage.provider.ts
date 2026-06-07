import { IStorageProvider, UploadedFileDetails } from './storage.provider.interface';
import fs from 'fs';
import path from 'path';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = process.env.LOCAL_STORAGE_DIR || './uploads';
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(
    file: { originalname: string; buffer: Buffer; mimetype: string },
    folderPath: string
  ): Promise<UploadedFileDetails> {
    const targetDir = path.join(this.baseDir, folderPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const targetFilePath = path.join(targetDir, uniqueName);

    await fs.promises.writeFile(targetFilePath, file.buffer);

    // Normalize URL path for web delivery
    const relativeUrlPath = path.posix.join('uploads', folderPath.replace(/\\/g, '/'), uniqueName);
    const fileUrl = `http://localhost:${process.env.PORT || 5000}/${relativeUrlPath}`;

    return {
      fileId: targetFilePath, // We can use the file system path as the unique ID for local storage
      fileUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      if (fs.existsSync(fileId)) {
        await fs.promises.unlink(fileId);
      }
    } catch (err) {
      console.error(`Failed to delete local file ${fileId}:`, err);
    }
  }
}
