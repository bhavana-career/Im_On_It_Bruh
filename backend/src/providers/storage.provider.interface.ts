export interface UploadedFileDetails {
  fileId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export interface IStorageProvider {
  uploadFile(
    file: { originalname: string; buffer: Buffer; mimetype: string },
    folderPath: string
  ): Promise<UploadedFileDetails>;
  
  deleteFile(fileId: string): Promise<void>;
}
