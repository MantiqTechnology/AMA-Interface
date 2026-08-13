import {
  deleteLocalUpload,
  getLocalUpload,
  getLocalUploadFile,
  listLocalUploads,
  saveLocalUpload,
  type SaveLocalUploadInput
} from './local-upload-storage';
import {
  deleteS3Upload,
  getS3Upload,
  getS3UploadFile,
  isS3UploadConfigured,
  listS3Uploads,
  saveS3Upload
} from './s3-upload-storage';

export type SaveUploadInput = SaveLocalUploadInput;

export function getUploadStorageDriver() {
  return isS3UploadConfigured() ? 's3' : 'local';
}

export async function listUploads() {
  return getUploadStorageDriver() === 's3' ? await listS3Uploads() : await listLocalUploads();
}

export async function getUpload(id: string) {
  return getUploadStorageDriver() === 's3' ? await getS3Upload(id) : await getLocalUpload(id);
}

export async function saveUpload(input: SaveUploadInput) {
  return getUploadStorageDriver() === 's3'
    ? await saveS3Upload(input)
    : await saveLocalUpload(input);
}

export async function getUploadFile(id: string) {
  return getUploadStorageDriver() === 's3'
    ? await getS3UploadFile(id)
    : await getLocalUploadFile(id);
}

export async function deleteUpload(id: string) {
  return getUploadStorageDriver() === 's3' ? await deleteS3Upload(id) : await deleteLocalUpload(id);
}
