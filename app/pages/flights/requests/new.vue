<script setup lang="ts">
import AircraftSelect from '../../../features/operations/aircraft/AircraftSelect.vue';
import CustomerSelect from '../../../features/commercial/customers/CustomerSelect.vue';
import FlightCapacityProfileSelect from '../../../features/operations/flight-capacity-profiles/FlightCapacityProfileSelect.vue';
import FlightScheduleTemplateSelect from '../../../features/operations/flight-schedule-templates/FlightScheduleTemplateSelect.vue';
import FuelSupplierSelect from '../../../features/finance/fuel-suppliers/FuelSupplierSelect.vue';
import HandlingParkingSupplierSelect from '../../../features/finance/handling-parking-suppliers/HandlingParkingSupplierSelect.vue';
import PersonnelSelect from '../../../features/operations/personnel/PersonnelSelect.vue';
import RouteSelect from '../../../features/operations/routes/RouteSelect.vue';
import type { CustomerOption } from '#shared/features/commercial/customers';
import type { AircraftOption } from '#shared/features/operations/aircraft';
import type { FlightCapacityProfileOption } from '#shared/features/operations/flight-capacity-profiles';
import type { FlightScheduleTemplateOption } from '#shared/features/operations/flight-schedule-templates';
import type { PersonnelOption } from '#shared/features/operations/personnel';
import type { RouteOption } from '#shared/features/operations/routes';
import type { StationOption } from '#shared/features/operations/stations';
import type {
  CreateFlightRequestBody,
  FlightOperationLookupsDto,
  FlightOperationLookupOption,
  FlightPlanningContextDto,
  FlightRatePreviewDto,
  FlightRequestRecord
} from '#shared/contracts/flight-operations';

const router = useRouter();
const { locale } = useI18n();
const step = ref(1);
const submitting = ref(false);
const submitAfterSave = ref(false);
const errorMessage = ref('');

const pageCopy = {
  en: {
    breadcrumbs: {
      requests: 'Flight Requests',
      create: 'Create Request'
    },
    title: 'Create Flight Request',
    subtitle: 'Prepare the operational request before Flight Order approval.',
    steps: [
      'Basic Flight Information',
      'Aircraft & Crew',
      'Manifest Setup',
      'Fuel & Station',
      'Review & Submit'
    ],
    sections: {
      basic: {
        title: 'Basic Flight Information',
        subtitle: 'Request identity, route, customer, and schedule',
        help: 'Defines the commercial and operational context used for planning, approval, and readiness checks.'
      },
      assignment: {
        title: 'Aircraft & Crew Assignment',
        subtitle: 'Initial assignment with serviceability and eligibility preview',
        help: 'Selects the aircraft and crew to validate serviceability, availability, station position, and role eligibility.'
      },
      manifest: {
        title: 'Manifest Setup',
        subtitle: 'Initial passenger and cargo planning',
        help: 'Captures expected payload so capacity, dangerous goods, and manifest readiness can be reviewed early.'
      },
      fuelStation: {
        title: 'Fuel & Station Preparation',
        subtitle: 'Mock supplier and ground-service requests',
        help: 'Captures fuel, supplier, handling, parking, and billing assumptions for station and finance preparation.'
      },
      review: {
        title: 'Review & Submit',
        subtitle: 'Operational request summary and readiness preview',
        help: 'Summarizes the request before saving a draft or submitting it for operational review.'
      },
      readiness: {
        title: 'Readiness Preview',
        subtitle: 'Current request inputs',
        help: 'Shows whether the minimum route, aircraft, PIC, fuel, and capacity inputs are ready for the next step.'
      }
    },
    fields: {
      flightDate: {
        label: 'Flight date',
        help: 'Planned operating date. Schedule templates and availability checks use this date.'
      },
      flightCategory: {
        label: 'Flight category',
        help: 'High-level operation category such as charter, passenger, or cargo.'
      },
      serviceType: {
        label: 'Service type',
        help: 'Specific service model that drives customer requirements, billing, and matching schedule templates.'
      },
      scheduleTemplate: {
        label: 'Schedule template',
        help: 'Optional reusable route and time pattern that can prefill route, service, aircraft, ETD, and ETA.'
      },
      route: {
        label: 'Route',
        help: 'Origin and destination pair used for readiness, rate preview, capacity profile, and station planning.'
      },
      customer: {
        label: 'Customer / corporate account',
        help: 'Commercial account responsible for the request when the service is billable.'
      },
      estimatedDeparture: {
        label: 'Estimated departure',
        help: 'Planned local departure date and time used by crew, aircraft, station, and route availability checks.'
      },
      estimatedArrival: {
        label: 'Estimated arrival',
        help: 'Planned local arrival date and time used for station handling, parking, and downstream operations.'
      },
      date: {
        label: 'Date',
        help: 'Local calendar date for this schedule point.'
      },
      time: {
        label: 'Time',
        help: 'Local 24-hour time for this schedule point.'
      },
      requestSource: {
        label: 'Request source',
        help: 'Where this request originated, used for traceability and operational prioritization.'
      },
      priority: {
        label: 'Priority',
        help: 'Operational urgency used to flag normal, high-priority, or emergency handling.'
      },
      operationalNotes: {
        label: 'Operational notes',
        help: 'Additional context for OCC, station, finance, or approvers.'
      },
      aircraft: {
        label: 'Aircraft',
        help: 'Aircraft intended for the flight. Readiness checks compare serviceability, station, and capacity.'
      },
      pic: {
        label: 'Pilot in command',
        help: 'Primary accountable pilot. Licence and availability warnings are evaluated here.'
      },
      coPilot: {
        label: 'Co-pilot',
        help: 'Optional second pilot. Availability and duplicate crew assignment are checked.'
      },
      capacityProfile: {
        label: 'Capacity profile',
        help: 'Optional route-aircraft-service capacity rule that reserves seats or cargo from total aircraft capacity.'
      },
      passengerEstimate: {
        label: 'Passenger estimate',
        help: 'Expected passenger count for capacity validation and passenger-rate preview.'
      },
      cargoEstimate: {
        label: 'Cargo estimate (kg)',
        help: 'Expected cargo weight for payload validation and cargo-rate preview.'
      },
      cargoCategory: {
        label: 'Cargo category',
        help: 'Cargo classification used to highlight handling needs and dangerous goods review.'
      },
      dangerousGoods: {
        label: 'Dangerous Goods review required',
        help: 'Marks cargo that needs dangerous goods assessment before final manifest approval.'
      },
      fuelType: {
        label: 'Fuel type',
        help: 'Fuel product requested for the uplift or marks that no uplift is required.'
      },
      requestedFuel: {
        label: 'Requested fuel (L)',
        help: 'Estimated uplift quantity in litres for station fuel planning.'
      },
      fuelSupplier: {
        label: 'Fuel supplier',
        help: 'Supplier expected to provide the requested fuel at the relevant station.'
      },
      handlingProvider: {
        label: 'Handling provider',
        help: 'Ground handling or parking vendor expected to support the flight.'
      },
      parkingRequired: {
        label: 'Parking required',
        help: 'Indicates whether station parking needs to be arranged.'
      },
      destinationHandlingRequired: {
        label: 'Destination handling required',
        help: 'Indicates whether ground handling is needed at destination.'
      },
      billingType: {
        label: 'Billing type',
        help: 'Commercial billing classification used by finance and revenue preview.'
      },
      estimatedRevenue: {
        label: 'Estimated revenue (IDR)',
        help: 'Expected revenue amount. Rate preview can populate this when a matching tariff exists.'
      }
    },
    reviewFields: {
      service: 'Service',
      route: 'Route',
      customer: 'Customer',
      schedule: 'Schedule',
      scheduleTemplate: 'Schedule template',
      aircraft: 'Aircraft',
      capacityProfile: 'Capacity profile',
      crew: 'PIC / Co-pilot',
      manifest: 'Manifest estimate',
      fuel: 'Fuel request',
      estimatedRevenue: 'Estimated revenue',
      matchedRate: 'Matched rate'
    },
    reviewHelp: {
      service: 'Selected service type that drives planning and billing assumptions.',
      route: 'Selected route and station pair for this request.',
      customer: 'Billable customer or corporate account.',
      schedule: 'Estimated departure and arrival stored with the request.',
      scheduleTemplate: 'Template used to prefill route and schedule, if any.',
      aircraft: 'Selected aircraft registration.',
      capacityProfile: 'Capacity rule used for seats and cargo, if any.',
      crew: 'Assigned PIC and co-pilot.',
      manifest: 'Passenger and cargo estimates that will seed manifest planning.',
      fuel: 'Fuel type and requested uplift quantity.',
      estimatedRevenue: 'Revenue estimate that finance can review later.',
      matchedRate: 'Tariff code matched by the rate preview service.'
    },
    actions: {
      done: 'Done',
      back: 'Back',
      cancel: 'Cancel',
      continue: 'Continue',
      saveDraft: 'Save as Draft',
      submit: 'Submit Request'
    },
    ratePreview: {
      label: 'Rate preview',
      noMatch: 'No matching rate',
      refreshing: 'Refreshing rate preview...',
      empty: 'Select route to preview estimated revenue.'
    },
    readinessWarning:
      'This request contains {count} readiness warning(s). The Flight Order will require resolution before approval.',
    readinessItems: {
      routeSchedule: 'Route and schedule',
      aircraft: 'Aircraft assignment',
      pic: 'PIC assignment',
      fuel: 'Fuel planning',
      capacity: 'Capacity validation'
    }
  },
  id: {
    breadcrumbs: {
      requests: 'Permintaan Penerbangan',
      create: 'Buat Permintaan'
    },
    title: 'Buat Permintaan Penerbangan',
    subtitle: 'Siapkan permintaan operasional sebelum persetujuan Flight Order.',
    steps: [
      'Informasi Dasar Penerbangan',
      'Pesawat & Kru',
      'Pengaturan Manifest',
      'Fuel & Stasiun',
      'Tinjau & Kirim'
    ],
    sections: {
      basic: {
        title: 'Informasi Dasar Penerbangan',
        subtitle: 'Identitas request, rute, customer, dan jadwal',
        help: 'Menentukan konteks komersial dan operasional untuk planning, approval, dan readiness check.'
      },
      assignment: {
        title: 'Penugasan Pesawat & Kru',
        subtitle: 'Penugasan awal dengan preview serviceability dan eligibility',
        help: 'Memilih pesawat dan kru untuk validasi serviceability, availability, posisi stasiun, dan kelayakan role.'
      },
      manifest: {
        title: 'Pengaturan Manifest',
        subtitle: 'Perencanaan awal penumpang dan cargo',
        help: 'Mencatat estimasi muatan agar kapasitas, dangerous goods, dan kesiapan manifest bisa ditinjau sejak awal.'
      },
      fuelStation: {
        title: 'Persiapan Fuel & Stasiun',
        subtitle: 'Request supplier dan ground service',
        help: 'Mencatat asumsi fuel, supplier, handling, parking, dan billing untuk persiapan stasiun dan finance.'
      },
      review: {
        title: 'Tinjau & Kirim',
        subtitle: 'Ringkasan request operasional dan preview readiness',
        help: 'Merangkum request sebelum disimpan sebagai draft atau dikirim untuk review operasional.'
      },
      readiness: {
        title: 'Preview Readiness',
        subtitle: 'Input request saat ini',
        help: 'Menunjukkan apakah input minimum rute, pesawat, PIC, fuel, dan kapasitas sudah siap untuk langkah berikutnya.'
      }
    },
    fields: {
      flightDate: {
        label: 'Tanggal penerbangan',
        help: 'Tanggal operasi yang direncanakan. Template jadwal dan availability check memakai tanggal ini.'
      },
      flightCategory: {
        label: 'Kategori penerbangan',
        help: 'Kategori operasi tingkat tinggi seperti charter, passenger, atau cargo.'
      },
      serviceType: {
        label: 'Tipe layanan',
        help: 'Model layanan spesifik yang menentukan kebutuhan customer, billing, dan pencocokan template jadwal.'
      },
      scheduleTemplate: {
        label: 'Template jadwal',
        help: 'Pola rute dan waktu reusable yang dapat mengisi rute, layanan, pesawat, ETD, dan ETA.'
      },
      route: {
        label: 'Rute',
        help: 'Pasangan origin dan destination untuk readiness, preview tarif, profil kapasitas, dan planning stasiun.'
      },
      customer: {
        label: 'Customer / akun korporat',
        help: 'Akun komersial yang bertanggung jawab atas request bila layanan bersifat billable.'
      },
      estimatedDeparture: {
        label: 'Estimasi keberangkatan',
        help: 'Tanggal dan jam lokal keberangkatan untuk pengecekan kru, pesawat, stasiun, dan rute.'
      },
      estimatedArrival: {
        label: 'Estimasi kedatangan',
        help: 'Tanggal dan jam lokal kedatangan untuk handling stasiun, parking, dan operasi lanjutan.'
      },
      date: {
        label: 'Tanggal',
        help: 'Tanggal kalender lokal untuk titik jadwal ini.'
      },
      time: {
        label: 'Jam',
        help: 'Waktu lokal format 24 jam untuk titik jadwal ini.'
      },
      requestSource: {
        label: 'Sumber request',
        help: 'Asal request untuk traceability dan prioritas operasional.'
      },
      priority: {
        label: 'Prioritas',
        help: 'Urgensi operasional untuk penanganan normal, prioritas tinggi, atau emergency.'
      },
      operationalNotes: {
        label: 'Catatan operasional',
        help: 'Konteks tambahan untuk OCC, stasiun, finance, atau approver.'
      },
      aircraft: {
        label: 'Pesawat',
        help: 'Pesawat yang direncanakan. Readiness check membandingkan serviceability, stasiun, dan kapasitas.'
      },
      pic: {
        label: 'Pilot in command',
        help: 'Pilot utama yang bertanggung jawab. Licence dan availability warning dievaluasi di sini.'
      },
      coPilot: {
        label: 'Co-pilot',
        help: 'Pilot kedua opsional. Availability dan duplikasi assignment kru akan dicek.'
      },
      capacityProfile: {
        label: 'Profil kapasitas',
        help: 'Aturan kapasitas opsional per rute-pesawat-layanan yang mencadangkan seat atau cargo dari total kapasitas.'
      },
      passengerEstimate: {
        label: 'Estimasi penumpang',
        help: 'Perkiraan jumlah penumpang untuk validasi kapasitas dan preview tarif penumpang.'
      },
      cargoEstimate: {
        label: 'Estimasi cargo (kg)',
        help: 'Perkiraan berat cargo untuk validasi payload dan preview tarif cargo.'
      },
      cargoCategory: {
        label: 'Kategori cargo',
        help: 'Klasifikasi cargo untuk menandai kebutuhan handling dan review dangerous goods.'
      },
      dangerousGoods: {
        label: 'Perlu review Dangerous Goods',
        help: 'Menandai cargo yang membutuhkan asesmen dangerous goods sebelum manifest final disetujui.'
      },
      fuelType: {
        label: 'Tipe fuel',
        help: 'Produk fuel yang diminta untuk uplift atau menandai tidak perlu uplift.'
      },
      requestedFuel: {
        label: 'Fuel diminta (L)',
        help: 'Estimasi jumlah uplift dalam liter untuk planning fuel stasiun.'
      },
      fuelSupplier: {
        label: 'Supplier fuel',
        help: 'Supplier yang diperkirakan menyediakan fuel di stasiun terkait.'
      },
      handlingProvider: {
        label: 'Provider handling',
        help: 'Vendor ground handling atau parking yang diperkirakan mendukung penerbangan.'
      },
      parkingRequired: {
        label: 'Perlu parking',
        help: 'Menandai apakah parking stasiun perlu disiapkan.'
      },
      destinationHandlingRequired: {
        label: 'Perlu handling destinasi',
        help: 'Menandai apakah ground handling dibutuhkan di destinasi.'
      },
      billingType: {
        label: 'Tipe billing',
        help: 'Klasifikasi billing komersial untuk finance dan preview revenue.'
      },
      estimatedRevenue: {
        label: 'Estimasi revenue (IDR)',
        help: 'Perkiraan revenue. Preview tarif bisa mengisi nilai ini saat tarif cocok ditemukan.'
      }
    },
    reviewFields: {
      service: 'Layanan',
      route: 'Rute',
      customer: 'Customer',
      schedule: 'Jadwal',
      scheduleTemplate: 'Template jadwal',
      aircraft: 'Pesawat',
      capacityProfile: 'Profil kapasitas',
      crew: 'PIC / Co-pilot',
      manifest: 'Estimasi manifest',
      fuel: 'Request fuel',
      estimatedRevenue: 'Estimasi revenue',
      matchedRate: 'Tarif cocok'
    },
    reviewHelp: {
      service: 'Tipe layanan terpilih yang menentukan asumsi planning dan billing.',
      route: 'Rute dan pasangan stasiun untuk request ini.',
      customer: 'Customer billable atau akun korporat.',
      schedule: 'Estimasi keberangkatan dan kedatangan yang disimpan di request.',
      scheduleTemplate: 'Template yang dipakai untuk mengisi rute dan jadwal, bila ada.',
      aircraft: 'Registrasi pesawat terpilih.',
      capacityProfile: 'Aturan kapasitas untuk seat dan cargo, bila ada.',
      crew: 'PIC dan co-pilot yang ditugaskan.',
      manifest: 'Estimasi penumpang dan cargo untuk awal planning manifest.',
      fuel: 'Tipe fuel dan jumlah uplift yang diminta.',
      estimatedRevenue: 'Estimasi revenue untuk ditinjau finance.',
      matchedRate: 'Kode tarif yang cocok dari service preview tarif.'
    },
    actions: {
      done: 'Selesai',
      back: 'Kembali',
      cancel: 'Batal',
      continue: 'Lanjut',
      saveDraft: 'Simpan Draft',
      submit: 'Kirim Request'
    },
    ratePreview: {
      label: 'Preview tarif',
      noMatch: 'Tidak ada tarif cocok',
      refreshing: 'Memuat ulang preview tarif...',
      empty: 'Pilih rute untuk melihat estimasi revenue.'
    },
    readinessWarning:
      'Request ini memiliki {count} readiness warning. Flight Order perlu menyelesaikannya sebelum approval.',
    readinessItems: {
      routeSchedule: 'Rute dan jadwal',
      aircraft: 'Penugasan pesawat',
      pic: 'Penugasan PIC',
      fuel: 'Planning fuel',
      capacity: 'Validasi kapasitas'
    }
  }
} as const;

const ui = computed(() => pageCopy[locale.value]);
const stepLabels = computed(() => ui.value.steps);

function todayDateInput() {
  const today = new Date();
  const timezoneOffsetMs = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

const form = reactive<CreateFlightRequestBody>({
  flightDate: todayDateInput(),
  flightTypeId: 'flight-type-cargo',
  serviceTypeId: 'flight-service-type-charter-cargo',
  routeId: '',
  customerId: null,
  aircraftId: null,
  pilotInCommandId: null,
  coPilotId: null,
  scheduledDepartureAt: null,
  scheduledArrivalAt: null,
  requestSource: 'Corporate Charter Request',
  priorityId: 'flight-priority-normal',
  passengerEstimate: 0,
  cargoCategory: null,
  cargoWeightEstimateKg: 0,
  fuelType: 'AVTUR',
  dangerousGoods: false,
  requestedFuelLitre: 0,
  fuelSupplierId: null,
  handlingSupplierId: null,
  parkingRequired: false,
  destinationHandlingRequired: false,
  billingType: 'CHARTER',
  estimatedRevenue: null,
  remarks: null
});

const { data: lookups } = await useAsyncData('new-flight-request-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);
const { data: routeOptions } = await useAsyncData(
  'route-options',
  () => fetchApi<RouteOption[]>('/api/master-data/routes/options'),
  { default: () => [] }
);
const { data: stationOptions } = await useAsyncData(
  'station-options',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const { data: scheduleTemplateOptions } = await useAsyncData(
  'flight-schedule-templates-options',
  () =>
    fetchApi<FlightScheduleTemplateOption[]>('/api/master-data/flight-schedule-templates/options'),
  { default: () => [] }
);
const { data: capacityProfileOptions } = await useAsyncData(
  'flight-capacity-profiles-options',
  () =>
    fetchApi<FlightCapacityProfileOption[]>('/api/master-data/flight-capacity-profiles/options'),
  { default: () => [] }
);
const { data: customerOptions } = await useAsyncData(
  'customers-options',
  () => fetchApi<CustomerOption[]>('/api/master-data/customers/options'),
  { default: () => [] }
);
const { data: aircraftOptions } = await useAsyncData(
  'aircraft-options',
  () => fetchApi<AircraftOption[]>('/api/master-data/aircraft/options'),
  { default: () => [] }
);
const { data: personnelOptions } = await useAsyncData(
  'personnel-options',
  () => fetchApi<PersonnelOption[]>('/api/master-data/personnel/options'),
  { default: () => [] }
);
const selectedScheduleTemplateId = ref<string | null>(null);
const selectedCapacityProfileId = ref<string | null>(null);
const ratePreview = ref<FlightRatePreviewDto | null>(null);
const ratePreviewPending = ref(false);
const schedulePickerMenus = reactive({
  departureDate: false,
  departureTime: false,
  arrivalDate: false,
  arrivalTime: false
});
const planningQuery = computed(() => ({
  routeId: form.routeId,
  flightDate: form.flightDate,
  serviceTypeId: form.serviceTypeId,
  scheduledDepartureAt: isoFromInput(form.scheduledDepartureAt) ?? undefined,
  scheduledArrivalAt: isoFromInput(form.scheduledArrivalAt) ?? undefined,
  passengerEstimate: form.passengerEstimate,
  cargoWeightEstimateKg: form.cargoWeightEstimateKg
}));
const {
  data: planningContext,
  pending: planningPending,
  error: planningError
} = await useAsyncData(
  'new-flight-request-planning-context',
  () =>
    form.routeId
      ? fetchApi<FlightPlanningContextDto>('/api/flight-operations/planning-context', {
          query: planningQuery.value
        })
      : Promise.resolve(null),
  { default: () => null, watch: [planningQuery] }
);

const requestSourceOptions = [
  'Corporate Charter Request',
  'Scheduled Service Plan',
  'Cargo Booking',
  'Medevac Request',
  'Positioning Instruction',
  'Ops Recovery'
];
const cargoCategoryOptions = [
  'General Cargo',
  'Perishable',
  'Medical Supplies',
  'AOG Parts',
  'Dangerous Goods',
  'Mail',
  'Baggage'
];
const fuelTypeOptions = ['AVTUR', 'Jet A-1', 'No Uplift Required'];
const billingTypeOptions = [
  'CHARTER',
  'SCHEDULED_PASSENGER',
  'CARGO',
  'INTERNAL_POSITIONING',
  'NON_REVENUE'
];
const operationalTimePresets = ['06:00', '07:00', '08:00', '09:00', '12:00', '15:00', '17:00'];
type ScheduleField = 'scheduledDepartureAt' | 'scheduledArrivalAt';

const defaultFlightTypeOptions: FlightOperationLookupOption[] = [
  {
    value: 'flight-type-charter',
    id: 'flight-type-charter',
    code: 'CHARTER',
    label: 'Charter',
    title: 'Charter',
    sortOrder: 1
  },
  {
    value: 'flight-type-passenger',
    id: 'flight-type-passenger',
    code: 'PASSENGER',
    label: 'Passenger',
    title: 'Passenger',
    sortOrder: 2
  },
  {
    value: 'flight-type-cargo',
    id: 'flight-type-cargo',
    code: 'CARGO',
    label: 'Cargo',
    title: 'Cargo',
    sortOrder: 3
  }
];
const defaultServiceTypeOptions: FlightOperationLookupOption[] = [
  {
    value: 'flight-service-type-charter-cargo',
    id: 'flight-service-type-charter-cargo',
    code: 'CHARTER_CARGO',
    label: 'Charter Cargo',
    title: 'Charter Cargo',
    sortOrder: 1
  },
  {
    value: 'flight-service-type-charter-passenger',
    id: 'flight-service-type-charter-passenger',
    code: 'CHARTER_PASSENGER',
    label: 'Charter Passenger',
    title: 'Charter Passenger',
    sortOrder: 2
  },
  {
    value: 'flight-service-type-scheduled-passenger',
    id: 'flight-service-type-scheduled-passenger',
    code: 'SCHEDULED_PASSENGER',
    label: 'Scheduled Passenger',
    title: 'Scheduled Passenger',
    sortOrder: 3
  },
  {
    value: 'flight-service-type-medevac',
    id: 'flight-service-type-medevac',
    code: 'MEDEVAC',
    label: 'Medevac',
    title: 'Medevac',
    sortOrder: 4
  },
  {
    value: 'flight-service-type-positioning',
    id: 'flight-service-type-positioning',
    code: 'POSITIONING',
    label: 'Positioning',
    title: 'Positioning',
    sortOrder: 5
  }
];
const defaultPriorityOptions: FlightOperationLookupOption[] = [
  {
    value: 'flight-priority-normal',
    id: 'flight-priority-normal',
    code: 'NORMAL',
    label: 'Normal',
    title: 'Normal',
    sortOrder: 1
  },
  {
    value: 'flight-priority-high',
    id: 'flight-priority-high',
    code: 'HIGH',
    label: 'High',
    title: 'High',
    sortOrder: 2
  },
  {
    value: 'flight-priority-emergency',
    id: 'flight-priority-emergency',
    code: 'EMERGENCY',
    label: 'Emergency',
    title: 'Emergency',
    sortOrder: 3
  }
];

const flightTypeOptions = computed(() => lookups.value?.flightTypes ?? defaultFlightTypeOptions);
const serviceTypeOptions = computed(
  () => lookups.value?.flightServiceTypes ?? defaultServiceTypeOptions
);
const priorityOptions = computed(() => lookups.value?.flightPriorities ?? defaultPriorityOptions);

const selectedRoute = computed(() => routeOptions.value.find((item) => item.id === form.routeId));
const selectedFlightType = computed(() =>
  flightTypeOptions.value.find((item) => item.value === form.flightTypeId)
);
const selectedServiceType = computed(() =>
  serviceTypeOptions.value.find((item) => item.value === form.serviceTypeId)
);
const commercialService = computed(() =>
  ['CHARTER_CARGO', 'CHARTER_PASSENGER', 'SCHEDULED_PASSENGER'].includes(
    selectedServiceType.value?.code ?? ''
  )
);
const picCandidates = computed(() =>
  (planningContext.value?.crewCandidates ?? []).filter(
    (candidate) => candidate.crewRole === 'PILOT_IN_COMMAND'
  )
);
const coPilotCandidates = computed(() =>
  (planningContext.value?.crewCandidates ?? []).filter(
    (candidate) => candidate.crewRole === 'CO_PILOT'
  )
);
const planningBlockers = computed(() => planningContext.value?.routeReadiness.blockers ?? []);
const planningWarnings = computed(() => planningContext.value?.routeReadiness.warnings ?? []);
const selectedAircraftCandidate = computed(() =>
  planningContext.value?.aircraftCandidates.find((item) => item.id === form.aircraftId)
);
const selectedPicCandidate = computed(() =>
  picCandidates.value.find((item) => item.id === form.pilotInCommandId)
);
const selectedCoPilotCandidate = computed(() =>
  coPilotCandidates.value.find((item) => item.id === form.coPilotId)
);
const hasPlanningBlocker = computed(
  () =>
    planningBlockers.value.length > 0 ||
    selectedAircraftCandidate.value?.available === false ||
    selectedPicCandidate.value?.available === false ||
    selectedCoPilotCandidate.value?.available === false ||
    Boolean(capacityWarning.value)
);
const selectedScheduleTemplate = computed(() =>
  scheduleTemplateOptions.value.find((item) => item.id === selectedScheduleTemplateId.value)
);
const selectedCapacityProfile = computed(() =>
  capacityProfileOptions.value.find((item) => item.id === selectedCapacityProfileId.value)
);
const selectedCustomer = computed(() =>
  customerOptions.value.find((item) => item.id === form.customerId)
);
const selectedAircraft = computed(() =>
  aircraftOptions.value.find((item) => item.id === form.aircraftId)
);
const selectedPic = computed(() =>
  personnelOptions.value.find((item) => item.id === form.pilotInCommandId)
);
const selectedCoPilot = computed(() =>
  personnelOptions.value.find((item) => item.id === form.coPilotId)
);
const selectedAircraftStation = computed(() => {
  const stationId =
    selectedAircraft.value?.currentStationId ?? selectedAircraft.value?.baseStationId;
  return stationOptions.value.find((item) => item.id === stationId) ?? null;
});
const capacityLimit = computed(() => {
  const profile = selectedCapacityProfile.value;
  if (profile) {
    return {
      passengerCapacity: Math.max(0, profile.seatCapacity - profile.reservedSeatCount),
      cargoCapacityKg: Math.max(0, profile.cargoCapacityKg - profile.reservedCargoKg),
      label: profile.profileCode
    };
  }

  if (!selectedAircraft.value) return null;
  return {
    passengerCapacity: selectedAircraft.value.passengerCapacity,
    cargoCapacityKg: selectedAircraft.value.cargoCapacityKg,
    label: selectedAircraft.value.registrationNumber
  };
});
const capacityWarning = computed(() => {
  if (!capacityLimit.value) return '';
  if (form.passengerEstimate > capacityLimit.value.passengerCapacity) {
    return `Passenger estimate exceeds ${capacityLimit.value.label} available capacity.`;
  }
  if (form.cargoWeightEstimateKg > capacityLimit.value.cargoCapacityKg) {
    return `Cargo estimate exceeds ${capacityLimit.value.label} available capacity.`;
  }
  return '';
});
const assignmentWarnings = computed(() => {
  const warnings: string[] = [];
  const aircraftStationId =
    selectedAircraft.value?.currentStationId ?? selectedAircraft.value?.baseStationId;
  if (
    aircraftStationId &&
    selectedRoute.value &&
    ![selectedRoute.value.originStationId, selectedRoute.value.destinationStationId].includes(
      aircraftStationId
    )
  ) {
    warnings.push('Aircraft positioning review is required.');
  }
  if (selectedAircraft.value?.serviceabilityStatus !== 'SERVICEABLE' && selectedAircraft.value) {
    warnings.push('Selected aircraft is not serviceable.');
  }
  if (
    selectedPic.value?.licenseExpiryDate &&
    selectedPic.value.licenseExpiryDate < form.flightDate
  ) {
    warnings.push('PIC licence expires before the flight date.');
  }
  if (
    selectedPic.value?.availabilityStatus &&
    selectedPic.value.availabilityStatus !== 'AVAILABLE'
  ) {
    warnings.push(`PIC availability is ${selectedPic.value.availabilityStatus}.`);
  }
  if (
    selectedCoPilot.value?.availabilityStatus &&
    selectedCoPilot.value.availabilityStatus !== 'AVAILABLE'
  ) {
    warnings.push(`Co-pilot availability is ${selectedCoPilot.value.availabilityStatus}.`);
  }
  if (form.pilotInCommandId && form.pilotInCommandId === form.coPilotId) {
    warnings.push('PIC and co-pilot must be different people.');
  }
  for (const candidate of [
    selectedAircraftCandidate.value,
    selectedPicCandidate.value,
    selectedCoPilotCandidate.value
  ]) {
    if (candidate) warnings.push(...candidate.warnings, ...candidate.blockers);
  }
  return warnings;
});

function isoFromInput(value: string | null | undefined) {
  if (!value) return null;
  return value.endsWith('Z') ? value : new Date(value).toISOString();
}

function localDateTime(date: string, time: string) {
  return `${date}T${time}`;
}

function scheduleDatePart(value: string | null | undefined, fallbackDate = form.flightDate) {
  return value?.slice(0, 10) || fallbackDate;
}

function scheduleTimePart(value: string | null | undefined) {
  return value?.match(/T(\d{2}:\d{2})/u)?.[1] ?? '';
}

function dateKeyFromPickerValue(value: unknown) {
  if (value instanceof Date) return todayDateInputFromDate(value);
  if (typeof value !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : todayDateInputFromDate(date);
}

function todayDateInputFromDate(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function pickerDateFromKey(value: string) {
  return new Date(`${value}T00:00:00`);
}

function setScheduleDate(field: ScheduleField, date: string) {
  const time = scheduleTimePart(form[field]);
  form[field] = time ? localDateTime(date, time) : null;
}

function setScheduleTime(field: ScheduleField, time: string) {
  form[field] = time ? localDateTime(scheduleDatePart(form[field]), time) : null;
}

function setScheduleDateFromPicker(field: ScheduleField, value: unknown) {
  const date = dateKeyFromPickerValue(value);
  if (!date) return;
  setScheduleDate(field, date);
  if (field === 'scheduledDepartureAt') schedulePickerMenus.departureDate = false;
  else schedulePickerMenus.arrivalDate = false;
}

function setScheduleTimeFromPicker(field: ScheduleField, time: string | null) {
  setScheduleTime(field, time ?? '');
}

function moveScheduleWithFlightDate(field: ScheduleField, oldDate: string, newDate: string) {
  if (!form[field] || scheduleDatePart(form[field], '') !== oldDate) return;
  form[field] = localDateTime(newDate, scheduleTimePart(form[field]));
}

const scheduledDepartureDate = computed({
  get: () => scheduleDatePart(form.scheduledDepartureAt),
  set: (date: string) => setScheduleDate('scheduledDepartureAt', date)
});
const scheduledDepartureTime = computed({
  get: () => scheduleTimePart(form.scheduledDepartureAt),
  set: (time: string) => setScheduleTime('scheduledDepartureAt', time)
});
const scheduledArrivalDate = computed({
  get: () => scheduleDatePart(form.scheduledArrivalAt),
  set: (date: string) => setScheduleDate('scheduledArrivalAt', date)
});
const scheduledArrivalTime = computed({
  get: () => scheduleTimePart(form.scheduledArrivalAt),
  set: (time: string) => setScheduleTime('scheduledArrivalAt', time)
});

function applyScheduleTemplate() {
  const template = selectedScheduleTemplate.value;
  if (!template) return;

  form.routeId = template.routeId;
  form.serviceTypeId = template.serviceTypeId;
  const serviceTypeCode = serviceTypeOptions.value.find(
    (item) => item.value === template.serviceTypeId
  )?.code;
  if (serviceTypeCode) form.flightTypeId = flightTypeIdFromServiceTypeCode(serviceTypeCode);
  if (template.defaultAircraftId) {
    form.aircraftId = template.defaultAircraftId;
  }
  form.scheduledDepartureAt = localDateTime(form.flightDate, template.departureTimeLocal);
  form.scheduledArrivalAt = localDateTime(form.flightDate, template.arrivalTimeLocal);
}

function flightTypeCodeFromServiceType(serviceType: string) {
  if (serviceType === 'SCHEDULED_PASSENGER') return 'PASSENGER';
  if (serviceType === 'CHARTER_CARGO') return 'CARGO';
  return 'CHARTER';
}

function flightTypeIdFromServiceTypeCode(serviceType: string) {
  const code = flightTypeCodeFromServiceType(serviceType);
  return flightTypeOptions.value.find((item) => item.code === code)?.value ?? form.flightTypeId;
}

function syncCapacityProfile() {
  if (selectedCapacityProfile.value) {
    const stillMatches =
      selectedCapacityProfile.value.routeId === form.routeId &&
      selectedCapacityProfile.value.aircraftId === form.aircraftId &&
      selectedCapacityProfile.value.serviceTypeId === form.serviceTypeId;
    if (stillMatches) return;
  }

  const match = capacityProfileOptions.value.find((profile) => {
    return (
      profile.routeId === form.routeId &&
      profile.aircraftId === form.aircraftId &&
      profile.serviceTypeId === form.serviceTypeId
    );
  });
  selectedCapacityProfileId.value = match?.id ?? null;
}

function ratePreviewQuantity() {
  if (selectedFlightType.value?.code === 'PASSENGER')
    return Math.max(1, form.passengerEstimate || 1);
  if (selectedFlightType.value?.code === 'CARGO')
    return Math.max(1, form.cargoWeightEstimateKg || 1);
  return 1;
}

function ratePreviewChannel() {
  if (selectedFlightType.value?.code === 'PASSENGER') return 'COUNTER';
  if (selectedFlightType.value?.code === 'CARGO') return 'CARGO';
  return undefined;
}

async function refreshRatePreview() {
  if (!form.routeId) {
    ratePreview.value = null;
    return;
  }

  ratePreviewPending.value = true;
  try {
    const preview = await fetchApi<FlightRatePreviewDto>('/api/flight-operations/rates/preview', {
      query: {
        routeId: form.routeId,
        flightTypeId: form.flightTypeId,
        serviceTypeId: form.serviceTypeId,
        bookingChannel: ratePreviewChannel(),
        passengerType: selectedFlightType.value?.code === 'PASSENGER' ? 'ADULT' : undefined,
        cargoPriceBasis:
          selectedFlightType.value?.code === 'CARGO' ? 'CHARGEABLE_WEIGHT' : undefined,
        customerId: form.customerId ?? undefined,
        aircraftType: selectedAircraft.value?.aircraftType,
        quantity: ratePreviewQuantity(),
        date: form.flightDate
      }
    });
    ratePreview.value = preview;
    if (preview.estimatedTotal > 0) {
      form.estimatedRevenue = preview.estimatedTotal;
    }
  } finally {
    ratePreviewPending.value = false;
  }
}

watch(selectedScheduleTemplateId, () => applyScheduleTemplate());
watch(
  () => form.serviceTypeId,
  () => {
    const code = selectedServiceType.value?.code;
    if (code) form.flightTypeId = flightTypeIdFromServiceTypeCode(code);
  }
);
watch(
  () => form.flightDate,
  (newDate, oldDate) => {
    if (selectedScheduleTemplateId.value) {
      applyScheduleTemplate();
      return;
    }
    if (!oldDate) return;
    moveScheduleWithFlightDate('scheduledDepartureAt', oldDate, newDate);
    moveScheduleWithFlightDate('scheduledArrivalAt', oldDate, newDate);
  }
);
watch(
  [() => form.routeId, () => form.aircraftId, () => form.serviceTypeId, capacityProfileOptions],
  () => {
    syncCapacityProfile();
  },
  { immediate: true }
);
watch(
  [
    () => form.routeId,
    () => form.flightTypeId,
    () => form.serviceTypeId,
    () => form.customerId,
    () => selectedAircraft.value?.aircraftType,
    () => form.passengerEstimate,
    () => form.cargoWeightEstimateKg,
    () => form.flightDate
  ],
  () => {
    void refreshRatePreview();
  },
  { immediate: true }
);

function nextStep() {
  errorMessage.value = '';
  if (
    step.value === 1 &&
    (!form.routeId ||
      (commercialService.value && !form.customerId) ||
      !form.scheduledDepartureAt ||
      !form.scheduledArrivalAt)
  ) {
    errorMessage.value = commercialService.value
      ? 'Route, customer, ETD, and ETA are required before continuing.'
      : 'Route, ETD, and ETA are required before continuing.';
    return;
  }
  if (step.value === 1 && planningBlockers.value.length) {
    errorMessage.value = planningBlockers.value.join(' ');
    return;
  }
  if (step.value === 2 && (!form.aircraftId || !form.pilotInCommandId)) {
    errorMessage.value = 'Aircraft and PIC assignment are required before continuing.';
    return;
  }
  step.value = Math.min(5, step.value + 1);
}

async function saveRequest(thenSubmit: boolean) {
  if (submitting.value) return;

  errorMessage.value = '';
  submitting.value = true;
  submitAfterSave.value = thenSubmit;
  try {
    const created = await fetchApi<FlightRequestRecord>('/api/flight-operations/requests', {
      method: 'POST',
      body: {
        ...form,
        scheduledDepartureAt: isoFromInput(form.scheduledDepartureAt),
        scheduledArrivalAt: isoFromInput(form.scheduledArrivalAt)
      }
    });
    if (thenSubmit) {
      await fetchApi(`/api/flight-operations/requests/${created.id}/actions/submit`, {
        method: 'POST'
      });
    }
    await router.push(`/flights/requests/${created.id}`);
  } catch (errorValue) {
    errorMessage.value =
      errorValue instanceof Error ? errorValue.message : 'Unable to save flight request';
  } finally {
    submitting.value = false;
    submitAfterSave.value = false;
  }
}

function money(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
</script>

<template>
  <VContainer class="request-create px-3 py-5 md:px-5" fluid>
    <VBreadcrumbs
      class="px-0 py-1"
      :items="[
        { title: ui.breadcrumbs.requests, to: '/flights/requests' },
        { title: ui.breadcrumbs.create }
      ]"
    />
    <div class="mb-5">
      <h1 class="text-h4 font-weight-bold">{{ ui.title }}</h1>
      <p class="text-text-secondary">
        {{ ui.subtitle }}
      </p>
    </div>

    <div class="stepper mb-5">
      <button
        v-for="(label, index) in stepLabels"
        :key="label"
        :class="{ active: step === Number(index) + 1, complete: step > Number(index) + 1 }"
        type="button"
        @click="step = Number(index) + 1"
      >
        <span>{{ Number(index) + 1 }}</span>
        <strong>{{ label }}</strong>
      </button>
    </div>

    <VAlert v-if="errorMessage" closable class="mb-4" type="error" variant="tonal">
      {{ errorMessage }}
    </VAlert>
    <VAlert v-if="planningError" class="mb-4" type="error" variant="tonal">
      Planning availability could not be refreshed. Review the selected route and schedule.
    </VAlert>
    <VAlert
      v-for="blocker in planningBlockers"
      :key="blocker"
      class="mb-3"
      type="error"
      variant="tonal"
    >
      {{ blocker }}
    </VAlert>
    <VAlert
      v-for="warning in planningWarnings"
      :key="warning"
      class="mb-3"
      type="warning"
      variant="tonal"
    >
      {{ warning }}
    </VAlert>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section class="border bg-surface pa-5">
        <VWindow v-model="step">
          <VWindowItem :value="1">
            <div class="section-title">
              <VIcon icon="mdi-airplane-plus" />
              <div>
                <h2>
                  <FieldHelpLabel :label="ui.sections.basic.title" :help="ui.sections.basic.help" />
                </h2>
                <span>{{ ui.sections.basic.subtitle }}</span>
              </div>
            </div>
            <VRow>
              <VCol cols="12" md="4">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.flightDate.label"
                    :help="ui.fields.flightDate.help"
                  />
                </div>
                <VDateInput
                  v-model="form.flightDate"
                  prepend-icon=""
                  prepend-inner-icon="mdi-calendar"
                  :aria-label="ui.fields.flightDate.label"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.flightCategory.label"
                    :help="ui.fields.flightCategory.help"
                  />
                </div>
                <VSelect
                  v-model="form.flightTypeId"
                  :aria-label="ui.fields.flightCategory.label"
                  item-title="title"
                  item-value="value"
                  :items="flightTypeOptions"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.serviceType.label"
                    :help="ui.fields.serviceType.help"
                  />
                </div>
                <VSelect
                  v-model="form.serviceTypeId"
                  :aria-label="ui.fields.serviceType.label"
                  item-title="title"
                  item-value="value"
                  :items="serviceTypeOptions"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.scheduleTemplate.label"
                    :help="ui.fields.scheduleTemplate.help"
                  />
                </div>
                <FlightScheduleTemplateSelect
                  v-model="selectedScheduleTemplateId"
                  :allow-create="true"
                  :candidates="planningContext?.scheduleTemplates ?? null"
                  clearable
                  :label="ui.fields.scheduleTemplate.label"
                  :loading="planningPending"
                />
              </VCol>
              <VCol cols="12" md="6">
                <div class="field-context">
                  <FieldHelpLabel :label="ui.fields.route.label" :help="ui.fields.route.help" />
                </div>
                <RouteSelect
                  v-model="form.routeId"
                  :allow-create="true"
                  external-label
                  :label="ui.fields.route.label"
                  :required="true"
                />
              </VCol>
              <VCol cols="12" md="6">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.customer.label"
                    :help="ui.fields.customer.help"
                  />
                </div>
                <CustomerSelect
                  v-model="form.customerId"
                  :allow-create="true"
                  :label="ui.fields.customer.label"
                />
              </VCol>
              <VCol cols="12" md="6">
                <div class="schedule-input-group">
                  <div class="schedule-input-title">
                    <VIcon icon="mdi-airplane-takeoff" size="18" />
                    <FieldHelpLabel
                      :label="ui.fields.estimatedDeparture.label"
                      :help="ui.fields.estimatedDeparture.help"
                    />
                  </div>
                  <div class="schedule-input-grid">
                    <VMenu
                      v-model="schedulePickerMenus.departureDate"
                      :close-on-content-click="false"
                      location="bottom start"
                    >
                      <template #activator="{ props }">
                        <VTextField
                          v-bind="props"
                          density="comfortable"
                          :label="ui.fields.date.label"
                          :model-value="scheduledDepartureDate"
                          prepend-inner-icon="mdi-calendar"
                          readonly
                          variant="outlined"
                        >
                          <template #label>
                            <FieldHelpLabel
                              :label="ui.fields.date.label"
                              :help="ui.fields.date.help"
                            />
                          </template>
                        </VTextField>
                      </template>
                      <VDatePicker
                        color="secondary"
                        hide-header
                        :model-value="pickerDateFromKey(scheduledDepartureDate)"
                        @update:model-value="
                          (value: unknown) =>
                            setScheduleDateFromPicker('scheduledDepartureAt', value)
                        "
                      />
                    </VMenu>
                    <VMenu
                      v-model="schedulePickerMenus.departureTime"
                      :close-on-content-click="false"
                      location="bottom start"
                    >
                      <template #activator="{ props }">
                        <VTextField
                          v-bind="props"
                          density="comfortable"
                          :label="ui.fields.time.label"
                          :model-value="scheduledDepartureTime || '--:--'"
                          prepend-inner-icon="mdi-clock-time-four-outline"
                          readonly
                          variant="outlined"
                        >
                          <template #label>
                            <FieldHelpLabel
                              :label="ui.fields.time.label"
                              :help="ui.fields.time.help"
                            />
                          </template>
                        </VTextField>
                      </template>
                      <VCard border class="schedule-picker-card" elevation="8" width="340">
                        <VTimePicker
                          color="secondary"
                          format="24hr"
                          :model-value="scheduledDepartureTime || null"
                          scrollable
                          @update:model-value="
                            (time: string | null) =>
                              setScheduleTimeFromPicker('scheduledDepartureAt', time)
                          "
                        />
                        <VCardActions class="justify-end">
                          <VBtn
                            color="secondary"
                            variant="text"
                            @click="schedulePickerMenus.departureTime = false"
                          >
                            {{ ui.actions.done }}
                          </VBtn>
                        </VCardActions>
                      </VCard>
                    </VMenu>
                  </div>
                  <div class="time-presets">
                    <VBtn
                      v-for="time in operationalTimePresets"
                      :key="`departure-${time}`"
                      size="x-small"
                      variant="tonal"
                      @click="setScheduleTime('scheduledDepartureAt', time)"
                    >
                      {{ time }}
                    </VBtn>
                  </div>
                </div>
              </VCol>
              <VCol cols="12" md="6">
                <div class="schedule-input-group">
                  <div class="schedule-input-title">
                    <VIcon icon="mdi-airplane-landing" size="18" />
                    <FieldHelpLabel
                      :label="ui.fields.estimatedArrival.label"
                      :help="ui.fields.estimatedArrival.help"
                    />
                  </div>
                  <div class="schedule-input-grid">
                    <VMenu
                      v-model="schedulePickerMenus.arrivalDate"
                      :close-on-content-click="false"
                      location="bottom start"
                    >
                      <template #activator="{ props }">
                        <VTextField
                          v-bind="props"
                          density="comfortable"
                          :label="ui.fields.date.label"
                          :model-value="scheduledArrivalDate"
                          prepend-inner-icon="mdi-calendar"
                          readonly
                          variant="outlined"
                        >
                          <template #label>
                            <FieldHelpLabel
                              :label="ui.fields.date.label"
                              :help="ui.fields.date.help"
                            />
                          </template>
                        </VTextField>
                      </template>
                      <VDatePicker
                        color="secondary"
                        hide-header
                        :model-value="pickerDateFromKey(scheduledArrivalDate)"
                        @update:model-value="
                          (value: unknown) => setScheduleDateFromPicker('scheduledArrivalAt', value)
                        "
                      />
                    </VMenu>
                    <VMenu
                      v-model="schedulePickerMenus.arrivalTime"
                      :close-on-content-click="false"
                      location="bottom start"
                    >
                      <template #activator="{ props }">
                        <VTextField
                          v-bind="props"
                          density="comfortable"
                          :label="ui.fields.time.label"
                          :model-value="scheduledArrivalTime || '--:--'"
                          prepend-inner-icon="mdi-clock-time-four-outline"
                          readonly
                          variant="outlined"
                        >
                          <template #label>
                            <FieldHelpLabel
                              :label="ui.fields.time.label"
                              :help="ui.fields.time.help"
                            />
                          </template>
                        </VTextField>
                      </template>
                      <VCard border class="schedule-picker-card" elevation="8" width="340">
                        <VTimePicker
                          color="secondary"
                          format="24hr"
                          :model-value="scheduledArrivalTime || null"
                          scrollable
                          @update:model-value="
                            (time: string | null) =>
                              setScheduleTimeFromPicker('scheduledArrivalAt', time)
                          "
                        />
                        <VCardActions class="justify-end">
                          <VBtn
                            color="secondary"
                            variant="text"
                            @click="schedulePickerMenus.arrivalTime = false"
                          >
                            {{ ui.actions.done }}
                          </VBtn>
                        </VCardActions>
                      </VCard>
                    </VMenu>
                  </div>
                  <div class="time-presets">
                    <VBtn
                      v-for="time in operationalTimePresets"
                      :key="`arrival-${time}`"
                      size="x-small"
                      variant="tonal"
                      @click="setScheduleTime('scheduledArrivalAt', time)"
                    >
                      {{ time }}
                    </VBtn>
                  </div>
                </div>
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.requestSource"
                  :items="requestSourceOptions"
                  :label="ui.fields.requestSource.label"
                  variant="outlined"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.requestSource.label"
                      :help="ui.fields.requestSource.help"
                    />
                  </template>
                </VSelect>
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.priorityId"
                  :label="ui.fields.priority.label"
                  item-title="title"
                  item-value="value"
                  :items="priorityOptions"
                  variant="outlined"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.priority.label"
                      :help="ui.fields.priority.help"
                    />
                  </template>
                </VSelect>
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.remarks"
                  :label="ui.fields.operationalNotes.label"
                  rows="3"
                  variant="outlined"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.operationalNotes.label"
                      :help="ui.fields.operationalNotes.help"
                    />
                  </template>
                </VTextarea>
              </VCol>
            </VRow>
          </VWindowItem>

          <VWindowItem :value="2">
            <div class="section-title">
              <VIcon icon="mdi-account-switch-outline" />
              <div>
                <h2>
                  <FieldHelpLabel
                    :label="ui.sections.assignment.title"
                    :help="ui.sections.assignment.help"
                  />
                </h2>
                <span>{{ ui.sections.assignment.subtitle }}</span>
              </div>
            </div>
            <VRow>
              <VCol cols="12">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.aircraft.label"
                    :help="ui.fields.aircraft.help"
                  />
                </div>
                <AircraftSelect
                  v-model="form.aircraftId"
                  :allow-create="true"
                  :candidates="planningContext?.aircraftCandidates ?? null"
                  :label="ui.fields.aircraft.label"
                  :loading="planningPending"
                />
              </VCol>
              <VCol cols="12" md="6">
                <div class="field-context">
                  <FieldHelpLabel :label="ui.fields.pic.label" :help="ui.fields.pic.help" />
                </div>
                <PersonnelSelect
                  v-model="form.pilotInCommandId"
                  :allow-create="true"
                  :candidates="picCandidates"
                  :label="ui.fields.pic.label"
                  :loading="planningPending"
                />
              </VCol>
              <VCol cols="12" md="6">
                <div class="field-context">
                  <FieldHelpLabel :label="ui.fields.coPilot.label" :help="ui.fields.coPilot.help" />
                </div>
                <PersonnelSelect
                  v-model="form.coPilotId"
                  clearable
                  :allow-create="true"
                  :candidates="coPilotCandidates"
                  :label="ui.fields.coPilot.label"
                  :loading="planningPending"
                />
              </VCol>
            </VRow>
            <div v-if="selectedAircraft" class="aircraft-preview">
              <div>
                <span>Registration</span>
                <strong>{{ selectedAircraft.registrationNumber }}</strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{{ selectedAircraft.aircraftType }}</strong>
              </div>
              <div>
                <span>Station</span>
                <strong>{{ selectedAircraftStation?.stationCode ?? '-' }}</strong>
              </div>
              <div>
                <span>Capacity</span>
                <strong>
                  {{ selectedAircraft.passengerCapacity }} pax /
                  {{ selectedAircraft.cargoCapacityKg }} kg
                </strong>
              </div>
              <div>
                <span>Status</span>
                <FlightsFlightStatusChip :status="selectedAircraft.serviceabilityStatus" />
              </div>
            </div>
            <VAlert
              v-for="warning in assignmentWarnings"
              :key="warning"
              class="mt-3"
              type="warning"
              variant="tonal"
            >
              {{ warning }}
            </VAlert>
          </VWindowItem>

          <VWindowItem :value="3">
            <div class="section-title">
              <VIcon icon="mdi-clipboard-text-outline" />
              <div>
                <h2>
                  <FieldHelpLabel
                    :label="ui.sections.manifest.title"
                    :help="ui.sections.manifest.help"
                  />
                </h2>
                <span>{{ ui.sections.manifest.subtitle }}</span>
              </div>
            </div>
            <VRow>
              <VCol cols="12">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.capacityProfile.label"
                    :help="ui.fields.capacityProfile.help"
                  />
                </div>
                <FlightCapacityProfileSelect
                  v-model="selectedCapacityProfileId"
                  :allow-create="true"
                  :candidates="planningContext?.capacityProfiles ?? null"
                  clearable
                  :label="ui.fields.capacityProfile.label"
                  :loading="planningPending"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model.number="form.passengerEstimate"
                  :label="ui.fields.passengerEstimate.label"
                  min="0"
                  type="number"
                  variant="outlined"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.passengerEstimate.label"
                      :help="ui.fields.passengerEstimate.help"
                    />
                  </template>
                </VTextField>
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model.number="form.cargoWeightEstimateKg"
                  :label="ui.fields.cargoEstimate.label"
                  min="0"
                  type="number"
                  variant="outlined"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.cargoEstimate.label"
                      :help="ui.fields.cargoEstimate.help"
                    />
                  </template>
                </VTextField>
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="form.cargoCategory"
                  clearable
                  :items="cargoCategoryOptions"
                  :label="ui.fields.cargoCategory.label"
                  variant="outlined"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.cargoCategory.label"
                      :help="ui.fields.cargoCategory.help"
                    />
                  </template>
                </VSelect>
              </VCol>
              <VCol cols="12">
                <VSwitch
                  v-model="form.dangerousGoods"
                  color="warning"
                  inset
                  :label="ui.fields.dangerousGoods.label"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.dangerousGoods.label"
                      :help="ui.fields.dangerousGoods.help"
                    />
                  </template>
                </VSwitch>
              </VCol>
            </VRow>
            <div v-if="capacityLimit" class="capacity-preview mb-4">
              <div>
                <span>Capacity source</span>
                <strong>{{ capacityLimit.label }}</strong>
              </div>
              <div>
                <span>Available seats</span>
                <strong>{{ capacityLimit.passengerCapacity }}</strong>
              </div>
              <div>
                <span>Available cargo</span>
                <strong>{{ capacityLimit.cargoCapacityKg }} kg</strong>
              </div>
              <div v-if="selectedCapacityProfile">
                <span>Reserved</span>
                <strong>
                  {{ selectedCapacityProfile.reservedSeatCount }} seats /
                  {{ selectedCapacityProfile.reservedCargoKg }} kg
                </strong>
              </div>
            </div>
            <VAlert v-if="capacityWarning" type="error" variant="tonal">
              {{ capacityWarning }}
            </VAlert>
          </VWindowItem>

          <VWindowItem :value="4">
            <div class="section-title">
              <VIcon icon="mdi-fuel" />
              <div>
                <h2>
                  <FieldHelpLabel
                    :label="ui.sections.fuelStation.title"
                    :help="ui.sections.fuelStation.help"
                  />
                </h2>
                <span>{{ ui.sections.fuelStation.subtitle }}</span>
              </div>
            </div>
            <VRow>
              <VCol cols="12" md="4">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.fuelType.label"
                    :help="ui.fields.fuelType.help"
                  />
                </div>
                <VSelect
                  v-model="form.fuelType"
                  :aria-label="ui.fields.fuelType.label"
                  :items="fuelTypeOptions"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.requestedFuel.label"
                    :help="ui.fields.requestedFuel.help"
                  />
                </div>
                <VTextField
                  v-model.number="form.requestedFuelLitre"
                  :aria-label="ui.fields.requestedFuel.label"
                  min="0"
                  type="number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.fuelSupplier.label"
                    :help="ui.fields.fuelSupplier.help"
                  />
                </div>
                <FuelSupplierSelect
                  v-model="form.fuelSupplierId"
                  :allow-create="true"
                  clearable
                  density="default"
                  external-label
                  :label="ui.fields.fuelSupplier.label"
                />
              </VCol>
              <VCol cols="12">
                <div class="field-context">
                  <FieldHelpLabel
                    :label="ui.fields.handlingProvider.label"
                    :help="ui.fields.handlingProvider.help"
                  />
                </div>
                <HandlingParkingSupplierSelect
                  v-model="form.handlingSupplierId"
                  clearable
                  :allow-create="true"
                  :label="ui.fields.handlingProvider.label"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="form.parkingRequired"
                  color="secondary"
                  inset
                  :label="ui.fields.parkingRequired.label"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.parkingRequired.label"
                      :help="ui.fields.parkingRequired.help"
                    />
                  </template>
                </VSwitch>
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="form.destinationHandlingRequired"
                  color="secondary"
                  inset
                  :label="ui.fields.destinationHandlingRequired.label"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.destinationHandlingRequired.label"
                      :help="ui.fields.destinationHandlingRequired.help"
                    />
                  </template>
                </VSwitch>
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.billingType"
                  :items="billingTypeOptions"
                  :label="ui.fields.billingType.label"
                  variant="outlined"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.billingType.label"
                      :help="ui.fields.billingType.help"
                    />
                  </template>
                </VSelect>
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="form.estimatedRevenue"
                  :label="ui.fields.estimatedRevenue.label"
                  min="0"
                  type="number"
                  variant="outlined"
                >
                  <template #label>
                    <FieldHelpLabel
                      :label="ui.fields.estimatedRevenue.label"
                      :help="ui.fields.estimatedRevenue.help"
                    />
                  </template>
                </VTextField>
              </VCol>
              <VCol cols="12">
                <VAlert :type="ratePreview?.matchedRateId ? 'info' : 'warning'" variant="tonal">
                  <div class="rate-preview-line">
                    <span>
                      {{ ui.ratePreview.label }}:
                      <strong>{{ ratePreview?.rateCode ?? ui.ratePreview.noMatch }}</strong>
                    </span>
                    <span>
                      {{ money(ratePreview?.estimatedTotal ?? 0) }}
                      <template v-if="ratePreview?.rateUnit">
                        / {{ ratePreview.rateUnit.replace('PER_', '').toLowerCase() }}
                      </template>
                    </span>
                  </div>
                  <small>
                    {{
                      ratePreviewPending
                        ? ui.ratePreview.refreshing
                        : (ratePreview?.note ?? ui.ratePreview.empty)
                    }}
                  </small>
                </VAlert>
              </VCol>
            </VRow>
          </VWindowItem>

          <VWindowItem :value="5">
            <div class="section-title">
              <VIcon icon="mdi-check-decagram-outline" />
              <div>
                <h2>
                  <FieldHelpLabel
                    :label="ui.sections.review.title"
                    :help="ui.sections.review.help"
                  />
                </h2>
                <span>{{ ui.sections.review.subtitle }}</span>
              </div>
            </div>
            <div class="review-grid">
              <div>
                <span>
                  <FieldHelpLabel :label="ui.reviewFields.service" :help="ui.reviewHelp.service" />
                </span>
                <strong>{{ selectedServiceType?.label ?? '-' }}</strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel :label="ui.reviewFields.route" :help="ui.reviewHelp.route" />
                </span>
                <strong>
                  {{
                    selectedRoute
                      ? `${selectedRoute.routeCode} (${selectedRoute.originStationCode} -> ${selectedRoute.destinationStationCode})`
                      : '-'
                  }}
                </strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel
                    :label="ui.reviewFields.customer"
                    :help="ui.reviewHelp.customer"
                  />
                </span>
                <strong>{{ selectedCustomer?.accountName ?? '-' }}</strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel
                    :label="ui.reviewFields.schedule"
                    :help="ui.reviewHelp.schedule"
                  />
                </span>
                <strong>
                  {{ form.scheduledDepartureAt ?? '-' }} → {{ form.scheduledArrivalAt ?? '-' }}
                </strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel
                    :label="ui.reviewFields.scheduleTemplate"
                    :help="ui.reviewHelp.scheduleTemplate"
                  />
                </span>
                <strong>{{ selectedScheduleTemplate?.templateCode ?? '-' }}</strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel
                    :label="ui.reviewFields.aircraft"
                    :help="ui.reviewHelp.aircraft"
                  />
                </span>
                <strong>{{ selectedAircraft?.registrationNumber ?? '-' }}</strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel
                    :label="ui.reviewFields.capacityProfile"
                    :help="ui.reviewHelp.capacityProfile"
                  />
                </span>
                <strong>{{ selectedCapacityProfile?.profileName ?? '-' }}</strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel :label="ui.reviewFields.crew" :help="ui.reviewHelp.crew" />
                </span>
                <strong>
                  {{ selectedPic?.fullName ?? '-' }} / {{ selectedCoPilot?.fullName ?? '-' }}
                </strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel
                    :label="ui.reviewFields.manifest"
                    :help="ui.reviewHelp.manifest"
                  />
                </span>
                <strong>
                  {{ form.passengerEstimate }} pax / {{ form.cargoWeightEstimateKg }} kg
                </strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel :label="ui.reviewFields.fuel" :help="ui.reviewHelp.fuel" />
                </span>
                <strong>{{ form.requestedFuelLitre }} L {{ form.fuelType }}</strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel
                    :label="ui.reviewFields.estimatedRevenue"
                    :help="ui.reviewHelp.estimatedRevenue"
                  />
                </span>
                <strong>{{ money(form.estimatedRevenue) }}</strong>
              </div>
              <div>
                <span>
                  <FieldHelpLabel
                    :label="ui.reviewFields.matchedRate"
                    :help="ui.reviewHelp.matchedRate"
                  />
                </span>
                <strong>{{ ratePreview?.rateCode ?? '-' }}</strong>
              </div>
            </div>
            <VAlert
              v-if="assignmentWarnings.length || capacityWarning || planningWarnings.length"
              class="mt-4"
              type="warning"
              variant="tonal"
            >
              {{
                ui.readinessWarning.replace(
                  '{count}',
                  String(
                    assignmentWarnings.length + planningWarnings.length + (capacityWarning ? 1 : 0)
                  )
                )
              }}
            </VAlert>
          </VWindowItem>
        </VWindow>

        <div class="mt-5 flex items-center border-t pt-4">
          <VBtn v-if="step > 1" prepend-icon="mdi-arrow-left" variant="text" @click="step--">
            {{ ui.actions.back }}
          </VBtn>
          <VBtn v-else to="/flights/requests" variant="text">{{ ui.actions.cancel }}</VBtn>
          <VSpacer />
          <VBtn v-if="step < 5" append-icon="mdi-arrow-right" color="secondary" @click="nextStep">
            {{ ui.actions.continue }}
          </VBtn>
          <template v-else>
            <VBtn
              :disabled="submitting || planningBlockers.length > 0 || planningPending"
              :loading="submitting && !submitAfterSave"
              variant="tonal"
              @click="saveRequest(false)"
            >
              {{ ui.actions.saveDraft }}
            </VBtn>
            <VBtn
              class="ml-2"
              color="secondary"
              :disabled="submitting || hasPlanningBlocker || planningPending"
              :loading="submitting && submitAfterSave"
              prepend-icon="mdi-send-outline"
              @click="saveRequest(true)"
            >
              {{ ui.actions.submit }}
            </VBtn>
          </template>
        </div>
      </section>

      <aside class="border bg-surface pa-4 self-start">
        <div class="section-title">
          <VIcon icon="mdi-clipboard-pulse-outline" />
          <div>
            <h2>
              <FieldHelpLabel
                :label="ui.sections.readiness.title"
                :help="ui.sections.readiness.help"
              />
            </h2>
            <span>{{ ui.sections.readiness.subtitle }}</span>
          </div>
        </div>
        <div class="preview-item">
          <VIcon
            :color="form.routeId ? 'success' : 'warning'"
            :icon="form.routeId ? 'mdi-check-circle' : 'mdi-clock-outline'"
          />
          <span>{{ ui.readinessItems.routeSchedule }}</span>
        </div>
        <div class="preview-item">
          <VIcon
            :color="form.aircraftId ? 'success' : 'warning'"
            :icon="form.aircraftId ? 'mdi-check-circle' : 'mdi-clock-outline'"
          />
          <span>{{ ui.readinessItems.aircraft }}</span>
        </div>
        <div class="preview-item">
          <VIcon
            :color="form.pilotInCommandId ? 'success' : 'warning'"
            :icon="form.pilotInCommandId ? 'mdi-check-circle' : 'mdi-clock-outline'"
          />
          <span>{{ ui.readinessItems.pic }}</span>
        </div>
        <div class="preview-item">
          <VIcon
            :color="form.requestedFuelLitre > 0 ? 'success' : 'warning'"
            :icon="form.requestedFuelLitre > 0 ? 'mdi-check-circle' : 'mdi-clock-outline'"
          /><span>{{ ui.readinessItems.fuel }}</span>
        </div>
        <div class="preview-item">
          <VIcon
            :color="!capacityWarning ? 'success' : 'error'"
            :icon="!capacityWarning ? 'mdi-check-circle' : 'mdi-alert-circle'"
          />
          <span>{{ ui.readinessItems.capacity }}</span>
        </div>
      </aside>
    </div>
  </VContainer>
</template>

<style scoped>
.request-create {
  max-width: 1500px;
}
.stepper {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-surface));
}
.stepper button {
  position: relative;
  display: flex;
  min-height: 62px;
  align-items: center;
  gap: 9px;
  border-right: 1px solid rgb(var(--v-theme-border));
  padding: 10px 14px;
  color: rgb(var(--v-theme-text-secondary));
  text-align: left;
}
.stepper button:last-child {
  border-right: 0;
}
.stepper button span {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 50%;
  font-size: 11px;
}
.stepper button strong {
  font-size: 11px;
}
.stepper button.active {
  border-bottom: 3px solid rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-brand-primary));
}
.stepper button.complete span {
  border-color: rgb(var(--v-theme-success));
  background: rgb(var(--v-theme-success));
  color: white;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.section-title h2 {
  font-size: 15px;
  font-weight: 700;
}
.section-title span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.field-context {
  margin-bottom: 6px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 12px;
  font-weight: 600;
}
.schedule-input-group {
  display: grid;
  gap: 10px;
}
.schedule-input-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.schedule-input-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(132px, 0.85fr);
  gap: 10px;
}
.time-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.schedule-picker-card {
  background: rgb(var(--v-theme-surface));
}
.aircraft-preview,
.capacity-preview,
.review-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-background));
  padding: 14px;
}
.aircraft-preview > div,
.capacity-preview > div,
.review-grid > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}
.aircraft-preview span,
.capacity-preview span,
.review-grid span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 10px;
  text-transform: uppercase;
}
.aircraft-preview strong,
.capacity-preview strong,
.review-grid strong {
  overflow-wrap: anywhere;
  font-size: 12px;
}
.review-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.capacity-preview {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.rate-preview-line {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.preview-item {
  display: flex;
  align-items: center;
  gap: 9px;
  border-top: 1px solid rgb(var(--v-theme-border));
  padding: 11px 0;
  font-size: 12px;
}
@media (max-width: 900px) {
  .stepper {
    grid-template-columns: 1fr;
  }
  .stepper button {
    min-height: 44px;
    border-right: 0;
    border-bottom: 1px solid rgb(var(--v-theme-border));
  }
  .aircraft-preview,
  .capacity-preview,
  .review-grid {
    grid-template-columns: 1fr 1fr;
  }
  .schedule-input-grid {
    grid-template-columns: 1fr;
  }
}
</style>
