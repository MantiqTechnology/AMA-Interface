<script setup lang="ts">
import type { LocalUploadDto } from '#shared/contracts/uploads';

const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const deletingId = ref<string | null>(null);
const errorMessage = ref('');

const {
  data: uploads,
  pending,
  error,
  refresh
} = await useAsyncData('local-uploads', () => fetchApi<LocalUploadDto[]>('/api/uploads'));

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID');
}

function readError(errorValue: unknown) {
  if (errorValue && typeof errorValue === 'object' && 'data' in errorValue) {
    const data = (errorValue as { data?: { message?: string; statusMessage?: string } }).data;
    return data?.message ?? data?.statusMessage ?? 'Upload request failed';
  }

  return errorValue instanceof Error ? errorValue.message : 'Upload request failed';
}

async function uploadFile() {
  if (!selectedFile.value) return;

  errorMessage.value = '';
  uploading.value = true;

  try {
    const form = new FormData();
    form.append('file', selectedFile.value);

    await fetchApi<LocalUploadDto>('/api/uploads', {
      method: 'POST',
      body: form
    });

    selectedFile.value = null;
    await refresh();
  } catch (errorValue) {
    errorMessage.value = readError(errorValue);
  } finally {
    uploading.value = false;
  }
}

async function deleteUpload(upload: LocalUploadDto) {
  const confirmed = window.confirm(`Delete ${upload.originalName}?`);
  if (!confirmed) return;

  errorMessage.value = '';
  deletingId.value = upload.id;

  try {
    await fetchApi<LocalUploadDto>(`/api/uploads/${upload.id}`, {
      method: 'DELETE'
    });
    await refresh();
  } catch (errorValue) {
    errorMessage.value = readError(errorValue);
  } finally {
    deletingId.value = null;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Uploads</h1>
        <p class="text-text-secondary">Local files and photos</p>
      </div>
      <VSpacer />
      <VBtn prepend-icon="mdi-refresh" variant="text" @click="refresh()">Refresh</VBtn>
    </div>

    <VAlert v-if="errorMessage" class="mb-4" color="error" variant="tonal">
      {{ errorMessage }}
    </VAlert>

    <VAlert v-if="error" class="mb-4" color="error" title="Unable to load uploads" variant="tonal">
      {{ error.message }}
    </VAlert>

    <VCard border class="mb-4">
      <VCardText>
        <div class="d-flex flex-column flex-md-row align-md-end ga-3">
          <VFileInput
            v-model="selectedFile"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            clearable
            density="comfortable"
            hide-details
            label="File or photo"
            prepend-icon=""
            prepend-inner-icon="mdi-paperclip"
            show-size
            variant="outlined"
          />
          <VBtn
            color="primary"
            :disabled="!selectedFile"
            :loading="uploading"
            min-width="140"
            prepend-icon="mdi-upload"
            @click="uploadFile"
          >
            Upload
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VCard border>
      <VTable density="comfortable">
        <thead>
          <tr>
            <th>File</th>
            <th>Type</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="5">
              <VSkeletonLoader type="table-row@4" />
            </td>
          </tr>
          <tr v-else-if="!uploads?.length">
            <td class="py-8 text-center text-text-secondary" colspan="5">No uploads yet</td>
          </tr>
          <template v-else>
            <tr v-for="upload in uploads ?? []" :key="upload.id">
              <td>
                <div class="d-flex align-center ga-3 py-2">
                  <div
                    class="h-16 w-16 overflow-hidden rounded bg-background d-grid place-items-center"
                  >
                    <VImg
                      v-if="upload.isImage"
                      cover
                      height="64"
                      :src="upload.viewUrl"
                      :width="64"
                    />
                    <VIcon v-else color="primary" icon="mdi-file-outline" size="32" />
                  </div>
                  <div class="min-w-0">
                    <div class="font-weight-medium text-text-primary">
                      {{ upload.originalName }}
                    </div>
                    <div class="text-caption text-text-secondary">
                      {{ upload.filename }}
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ upload.contentType }}</td>
              <td>{{ formatFileSize(upload.size) }}</td>
              <td>{{ formatDate(upload.uploadedAt) }}</td>
              <td class="text-right">
                <VBtn
                  :href="upload.viewUrl"
                  icon="mdi-eye-outline"
                  rel="noopener"
                  size="small"
                  target="_blank"
                  variant="text"
                />
                <VBtn
                  :href="upload.downloadUrl"
                  icon="mdi-download-outline"
                  size="small"
                  variant="text"
                />
                <VBtn
                  color="error"
                  :loading="deletingId === upload.id"
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  @click="deleteUpload(upload)"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </VTable>
    </VCard>
  </VContainer>
</template>
