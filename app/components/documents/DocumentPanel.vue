<script setup lang="ts">
import type {
  DocumentOwnerType,
  DocumentVisibility,
  MasterDocumentDto
} from '#shared/contracts/documents';
import type { LocalUploadDto } from '#shared/contracts/uploads';
import { documentTypesForOwner, getDocumentTypeConfig } from '#shared/constants/document-types';
import DocumentStatusBadge from './DocumentStatusBadge.vue';

type DocumentFormState = {
  uploadId: string | null;
  documentType: string;
  title: string;
  documentNumber: string;
  issuer: string;
  expiresAt: string;
  revision: string;
  visibility: DocumentVisibility;
  notes: string;
};

const props = defineProps<{
  ownerType: DocumentOwnerType;
  ownerId: string;
  readonly?: boolean;
}>();

const { can } = useAuthorization();
const canManageDocuments = computed(() => !props.readonly && can('platform.module.manage').allowed);
const dialog = ref(false);
const submitting = ref(false);
const selectedFile = ref<File | File[] | null>(null);
const supersedingDocument = ref<MasterDocumentDto | null>(null);
const errorMessage = ref('');

const typeOptions = computed(() =>
  documentTypesForOwner(props.ownerType).map((item) => ({
    title: item.label,
    value: item.value,
    restricted: item.restricted
  }))
);

const defaultType = computed(() => typeOptions.value[0]?.value ?? 'GENERAL_DOCUMENT');

const form = reactive<DocumentFormState>({
  uploadId: null,
  documentType: defaultType.value,
  title: '',
  documentNumber: '',
  issuer: '',
  expiresAt: '',
  revision: '',
  visibility: 'INTERNAL',
  notes: ''
});

const {
  data: documents,
  pending,
  error,
  refresh
} = await useAsyncData(`documents-${props.ownerType}-${props.ownerId}`, () =>
  fetchApi<MasterDocumentDto[]>('/api/documents', {
    query: {
      ownerType: props.ownerType,
      ownerId: props.ownerId
    }
  })
);

const { data: uploads, refresh: refreshUploads } = await useAsyncData(
  'document-panel-uploads',
  () => fetchApi<LocalUploadDto[]>('/api/uploads')
);

const rows = computed(() => documents.value ?? []);
const validCount = computed(
  () =>
    rows.value.filter(
      (item) => item.lifecycleStatus === 'ACTIVE' && item.verificationStatus === 'VERIFIED'
    ).length
);
const expiringCount = computed(
  () => rows.value.filter((item) => item.lifecycleStatus === 'EXPIRING').length
);
const expiredCount = computed(
  () => rows.value.filter((item) => item.lifecycleStatus === 'EXPIRED').length
);
const pendingCount = computed(
  () => rows.value.filter((item) => item.verificationStatus === 'PENDING_VERIFICATION').length
);

const uploadOptions = computed(() =>
  (uploads.value ?? []).map((upload) => ({
    title: `${upload.originalName} (${formatFileSize(upload.size)})`,
    value: upload.id
  }))
);

watch(
  () => form.documentType,
  (documentType) => {
    const config = getDocumentTypeConfig(documentType);
    if (!form.title && config) form.title = config.label;
    if (config?.restricted) form.visibility = 'RESTRICTED';
  }
);

function firstSelectedFile() {
  if (Array.isArray(selectedFile.value)) return selectedFile.value[0] ?? null;
  return selectedFile.value;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | undefined) {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID');
}

function expiryText(document: MasterDocumentDto) {
  if (!document.expiresAt) return 'No expiry';
  if (document.daysUntilExpiry === undefined) return formatDate(document.expiresAt);
  if (document.daysUntilExpiry < 0)
    return `${formatDate(document.expiresAt)} (${Math.abs(document.daysUntilExpiry)} days ago)`;
  if (document.daysUntilExpiry === 0) return `${formatDate(document.expiresAt)} (today)`;
  return `${formatDate(document.expiresAt)} (${document.daysUntilExpiry} days)`;
}

function documentTypeLabel(value: string) {
  return getDocumentTypeConfig(value)?.label ?? value.replaceAll('_', ' ');
}

function resetForm(document?: MasterDocumentDto) {
  const documentType = document?.documentType ?? defaultType.value;
  const type = getDocumentTypeConfig(documentType);

  form.uploadId = null;
  form.documentType = documentType;
  form.title = document ? `${document.title} revision` : (type?.label ?? '');
  form.documentNumber = document?.documentNumber ?? '';
  form.issuer = document?.issuer ?? '';
  form.expiresAt = document?.expiresAt ?? '';
  form.revision = document ? `v${document.version + 1}` : '';
  form.visibility = document?.visibility ?? (type?.restricted ? 'RESTRICTED' : 'INTERNAL');
  form.notes = '';
  selectedFile.value = null;
  errorMessage.value = '';
}

function openCreate() {
  supersedingDocument.value = null;
  resetForm();
  dialog.value = true;
}

function openSupersede(document: MasterDocumentDto) {
  supersedingDocument.value = document;
  resetForm(document);
  dialog.value = true;
}

function readError(errorValue: unknown) {
  if (errorValue && typeof errorValue === 'object' && 'data' in errorValue) {
    const data = (errorValue as { data?: { message?: string; statusMessage?: string } }).data;
    return data?.message ?? data?.statusMessage ?? 'Document request failed';
  }

  return errorValue instanceof Error ? errorValue.message : 'Document request failed';
}

async function uploadSelectedFile() {
  const file = firstSelectedFile();
  if (!file) return form.uploadId;

  const uploadForm = new FormData();
  uploadForm.append('file', file);

  const upload = await fetchApi<LocalUploadDto>('/api/uploads', {
    method: 'POST',
    body: uploadForm
  });

  return upload.id;
}

async function submitDocument() {
  submitting.value = true;
  errorMessage.value = '';

  try {
    const uploadId = await uploadSelectedFile();

    if (!uploadId) {
      errorMessage.value = 'Select a file or choose an existing upload.';
      return;
    }

    const body = {
      uploadId,
      documentType: form.documentType,
      title: form.title || documentTypeLabel(form.documentType),
      documentNumber: form.documentNumber || undefined,
      issuer: form.issuer || undefined,
      expiresAt: form.expiresAt || undefined,
      revision: form.revision || undefined,
      visibility: form.visibility,
      notes: form.notes || undefined
    };

    if (supersedingDocument.value) {
      await fetchApi<MasterDocumentDto>(
        `/api/documents/${supersedingDocument.value.id}/supersede`,
        {
          method: 'POST',
          body
        }
      );
    } else {
      await fetchApi<MasterDocumentDto>('/api/documents', {
        method: 'POST',
        body: {
          ownerType: props.ownerType,
          ownerId: props.ownerId,
          ...body
        }
      });
    }

    dialog.value = false;
    await Promise.all([refresh(), refreshUploads()]);
  } catch (errorValue) {
    errorMessage.value = readError(errorValue);
  } finally {
    submitting.value = false;
  }
}

async function verify(document: MasterDocumentDto) {
  await fetchApi<MasterDocumentDto>(`/api/documents/${document.id}/verify`, { method: 'POST' });
  await refresh();
}

async function reject(document: MasterDocumentDto) {
  const reason = window.prompt('Rejection reason');
  if (!reason) return;

  await fetchApi<MasterDocumentDto>(`/api/documents/${document.id}/reject`, {
    method: 'POST',
    body: { rejectionReason: reason }
  });
  await refresh();
}
</script>

<template>
  <div>
    <div class="mb-4 d-flex flex-wrap align-center ga-3">
      <VCard border class="min-w-40">
        <VCardText class="py-3">
          <div class="text-caption text-text-secondary">Valid</div>
          <div class="text-h5 font-weight-bold text-success">{{ validCount }}</div>
        </VCardText>
      </VCard>
      <VCard border class="min-w-40">
        <VCardText class="py-3">
          <div class="text-caption text-text-secondary">Expiring</div>
          <div class="text-h5 font-weight-bold text-warning">{{ expiringCount }}</div>
        </VCardText>
      </VCard>
      <VCard border class="min-w-40">
        <VCardText class="py-3">
          <div class="text-caption text-text-secondary">Expired</div>
          <div class="text-h5 font-weight-bold text-error">{{ expiredCount }}</div>
        </VCardText>
      </VCard>
      <VCard border class="min-w-40">
        <VCardText class="py-3">
          <div class="text-caption text-text-secondary">Pending</div>
          <div class="text-h5 font-weight-bold text-info">{{ pendingCount }}</div>
        </VCardText>
      </VCard>
      <VSpacer />
      <VBtn
        v-if="canManageDocuments"
        color="primary"
        prepend-icon="mdi-file-upload-outline"
        @click="openCreate"
      >
        Add Document
      </VBtn>
    </div>

    <VAlert v-if="errorMessage" class="mb-4" color="error" variant="tonal">
      {{ errorMessage }}
    </VAlert>

    <VAlert
      v-if="error"
      class="mb-4"
      color="error"
      title="Unable to load documents"
      variant="tonal"
    >
      {{ error.message }}
    </VAlert>

    <VCard border>
      <VTable density="comfortable">
        <thead>
          <tr>
            <th>Document</th>
            <th>Expiry</th>
            <th>Verification</th>
            <th>Lifecycle</th>
            <th>Visibility</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="6">
              <VSkeletonLoader type="table-row@4" />
            </td>
          </tr>
          <tr v-else-if="!rows.length">
            <td class="py-8 text-center text-text-secondary" colspan="6">
              No documents linked yet
            </td>
          </tr>
          <template v-else>
            <tr v-for="document in rows" :key="document.id">
              <td>
                <div class="py-2">
                  <div class="font-weight-medium text-text-primary">{{ document.title }}</div>
                  <div class="text-caption text-text-secondary">
                    {{ documentTypeLabel(document.documentType) }}
                    <span v-if="document.documentNumber"> - {{ document.documentNumber }}</span>
                  </div>
                  <div v-if="document.rejectionReason" class="text-caption text-error">
                    {{ document.rejectionReason }}
                  </div>
                </div>
              </td>
              <td>{{ expiryText(document) }}</td>
              <td>
                <DocumentStatusBadge :value="document.verificationStatus" kind="verification" />
              </td>
              <td>
                <DocumentStatusBadge :value="document.lifecycleStatus" kind="lifecycle" />
              </td>
              <td>
                <DocumentStatusBadge :value="document.visibility" kind="visibility" />
              </td>
              <td class="text-right">
                <VBtn
                  :disabled="!document.upload"
                  :href="document.upload?.viewUrl"
                  icon="mdi-eye-outline"
                  rel="noopener"
                  size="small"
                  target="_blank"
                  variant="text"
                />
                <VBtn
                  :disabled="!document.upload"
                  :href="document.upload?.downloadUrl"
                  icon="mdi-download-outline"
                  size="small"
                  variant="text"
                />
                <VBtn
                  v-if="canManageDocuments && document.verificationStatus !== 'VERIFIED'"
                  color="success"
                  icon="mdi-check-decagram-outline"
                  size="small"
                  variant="text"
                  @click="verify(document)"
                />
                <VBtn
                  v-if="canManageDocuments && document.verificationStatus !== 'REJECTED'"
                  color="error"
                  icon="mdi-close-octagon-outline"
                  size="small"
                  variant="text"
                  @click="reject(document)"
                />
                <VBtn
                  v-if="canManageDocuments && document.lifecycleStatus !== 'SUPERSEDED'"
                  icon="mdi-file-replace-outline"
                  size="small"
                  variant="text"
                  @click="openSupersede(document)"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </VTable>
    </VCard>

    <VDialog v-model="dialog" max-width="820" persistent>
      <VCard>
        <VCardTitle class="d-flex align-center ga-2">
          <VIcon icon="mdi-file-document-edit-outline" />
          {{ supersedingDocument ? 'Upload New Version' : 'Add Document' }}
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert v-if="errorMessage" class="mb-4" color="error" variant="tonal">
            {{ errorMessage }}
          </VAlert>

          <VRow>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.documentType"
                density="compact"
                item-title="title"
                item-value="value"
                :items="typeOptions"
                label="Document type"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.title" density="compact" label="Title" variant="outlined" />
            </VCol>
            <VCol cols="12" md="6">
              <VFileInput
                v-model="selectedFile"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                clearable
                density="compact"
                label="Upload new file"
                prepend-icon=""
                prepend-inner-icon="mdi-paperclip"
                show-size
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.uploadId"
                clearable
                density="compact"
                item-title="title"
                item-value="value"
                :items="uploadOptions"
                label="Or choose existing upload"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.documentNumber"
                density="compact"
                label="Document number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.issuer"
                density="compact"
                label="Issuer"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="form.expiresAt"
                density="compact"
                label="Expires at"
                type="date"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="form.revision"
                density="compact"
                label="Revision"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect
                v-model="form.visibility"
                density="compact"
                :items="['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']"
                label="Visibility"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.notes"
                auto-grow
                density="compact"
                label="Notes"
                rows="2"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="dialog = false">Cancel</VBtn>
          <VBtn color="primary" :loading="submitting" @click="submitDocument"> Save Document </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
