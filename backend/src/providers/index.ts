import { IStorageProvider } from './storage.provider.interface';
import { LocalStorageProvider } from './local.storage.provider';
import { GoogleDriveProvider } from './googleDrive.storage.provider';

export function getStorageProvider(): IStorageProvider {
  const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  
  if (providerType === 'google-drive' || providerType === 'googledrive') {
    return new GoogleDriveProvider();
  }
  
  return new LocalStorageProvider();
}
