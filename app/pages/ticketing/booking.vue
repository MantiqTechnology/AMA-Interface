<script setup lang="ts">
definePageMeta({
  layout: false
});

const activeTab = ref('passenger');
const store = useAmaDemoStore();

// UI State
const searchId = ref('');
const searchedItem = ref<any>(null);
const searchType = ref<'ticket' | 'cargo'>('ticket');
const searchError = ref('');
const searchLoading = ref(false);

const successDialog = ref(false);
const successMessage = ref('');
const successBookingId = ref('');
const successBookingType = ref<'ticket' | 'cargo'>('ticket');

// ============ PASSENGER Booking Form ============
const paxOriginId = ref('');
const paxDestinationId = ref('');
const paxFlightId = ref('');
const passengerName = ref('');
const passengerIdentity = ref('');
const seatNumber = ref('');
const weightKg = ref(70);
const loyaltyMemberId = ref('');
const agentIdPax = ref('');
const isSubmittingPax = ref(false);

// ============ CARGO Booking Form ============
const cargoOriginId = ref('');
const cargoDestinationId = ref('');
const cargoFlightId = ref('');
const cargoSender = ref('');
const cargoReceiver = ref('');
const cargoWeight = ref(10);
const cargoLength = ref(30);
const cargoWidth = ref(30);
const cargoHeight = ref(30);
const isDangerous = ref(false);
const dgClass = ref('Class 9 - Lithium Batteries');
const cargoPaymentMethod = ref('TRANSFER');
const cargoAgentId = ref('');
const isSubmittingCargo = ref(false);

// Station IATA <-> ICAO translation mapping for cross-database matching
const stationIataToIcao: Record<string, string> = {
  DJJ: 'WAJJ',
  WMX: 'WAVV',
  TIM: 'WABP',
  MKQ: 'WAKK',
  SOQ: 'WASS',
  OKS: 'WAJO',
  DEX: 'WAVD',
  NBX: 'WABI'
};

const stationIcaoToIata: Record<string, string> = {
  WAJJ: 'DJJ',
  WAVV: 'WMX',
  WABP: 'TIM',
  WAKK: 'MKQ',
  WASS: 'SOQ',
  WAJO: 'OKS',
  WAVD: 'DEX',
  WABI: 'NBX'
};

function getNormalizedCode(code: string) {
  const upper = (code || '').toUpperCase();
  return stationIcaoToIata[upper] || stationIataToIcao[upper] || upper;
}

// Load Data from APIs — flights, agents, rate cards, master stations, and master routes
const { data: flightsData, refresh: refreshFlights } = await useAsyncData(
  'flights-list',
  () => {
    let url = '/api/flights';
    const params: string[] = [];

    if (activeTab.value === 'passenger') {
      params.push('type=passenger');
      if (paxOriginId.value && paxDestinationId.value) {
        const originIcao = stationIataToIcao[paxOriginId.value] || paxOriginId.value;
        const destIcao = stationIataToIcao[paxDestinationId.value] || paxDestinationId.value;
        params.push(`origin=${encodeURIComponent(originIcao)}`);
        params.push(`destination=${encodeURIComponent(destIcao)}`);
      }
    } else if (activeTab.value === 'cargo') {
      params.push('type=cargo');
      if (cargoOriginId.value && cargoDestinationId.value) {
        const originIcao = stationIataToIcao[cargoOriginId.value] || cargoOriginId.value;
        const destIcao = stationIataToIcao[cargoDestinationId.value] || cargoDestinationId.value;
        params.push(`origin=${encodeURIComponent(originIcao)}`);
        params.push(`destination=${encodeURIComponent(destIcao)}`);
      }
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return fetchApi<any[]>(url);
  },
  {
    watch: [activeTab, paxOriginId, paxDestinationId, cargoOriginId, cargoDestinationId]
  }
);

const { data: agentsData } = await useAsyncData('agents-list', () =>
  fetchApi<any>('/api/master-data/agents')
);
const { data: rateCardsData } = await useAsyncData('rate-cards-list', () =>
  fetchApi<any>('/api/master-data/rates')
);
const { data: stationsData } = await useAsyncData('booking-stations', () =>
  fetchApi<any>('/api/master-data/stations')
);
const { data: routesData } = await useAsyncData('booking-routes', () =>
  fetchApi<any>('/api/master-data/routes')
);

// Map rows
const flights = computed(() => flightsData.value || []);
const agents = computed(() => agentsData.value?.rows || []);
const rateCards = computed(() => rateCardsData.value?.rows || []);
const masterStations = computed(() => stationsData.value?.rows || []);
const masterRoutes = computed(() => routesData.value?.rows || []);

// Force refresh on mount to avoid stale SSR/Client navigation cache
onMounted(() => {
  refreshFlights();
});

// Only flights that are open for booking (activated via OCC sales)
const BOOKABLE_STATUSES = ['scheduled', 'ready'];

const bookableFlights = computed(() =>
  flights.value.filter((f: any) => BOOKABLE_STATUSES.includes(f.status))
);

// ========== Derive stations & routes from master data ==========
const opsStations = computed(() => {
  return masterStations.value.map((s: any) => ({
    id: s.id,
    code: s.station_code,
    name: s.station_name,
    title: `${s.station_name} (${s.station_code})`
  }));
});

// ========== PASSENGER computed ==========
const paxDestStations = computed(() => {
  if (!paxOriginId.value) return opsStations.value;
  const originIata = getNormalizedCode(paxOriginId.value);
  const destCodes = new Set(
    masterRoutes.value
      .filter((r: any) => {
        const originStation = masterStations.value.find((s: any) => s.id === r.origin_station_id);
        return originStation && getNormalizedCode(originStation.station_code) === originIata;
      })
      .map((r: any) => {
        const destStation = masterStations.value.find(
          (s: any) => s.id === r.destination_station_id
        );
        return destStation ? getNormalizedCode(destStation.station_code) : '';
      })
      .filter(Boolean)
  );
  return opsStations.value.filter((s: any) => destCodes.has(getNormalizedCode(s.code)));
});

const paxFilteredFlights = computed(() => {
  if (!paxOriginId.value || !paxDestinationId.value) return [];
  return bookableFlights.value;
});

// Passenger ticket price from rate cards (matching by station code)
const paxTicketPrice = computed(() => {
  if (!paxOriginId.value || !paxDestinationId.value) return 1200000;
  const originSt = opsStations.value.find(
    (s: any) => getNormalizedCode(s.code) === getNormalizedCode(paxOriginId.value)
  );
  const destSt = opsStations.value.find(
    (s: any) => getNormalizedCode(s.code) === getNormalizedCode(paxDestinationId.value)
  );
  if (!originSt || !destSt) return 1200000;

  // For now, find any passenger rate card (all same route group)
  const anyCard = rateCards.value.find((c: any) => c.service_type === 'PASSENGER');
  return anyCard ? anyCard.base_rate : 1200000;
});

// ========== CARGO computed ==========
const cargoDestStations = computed(() => {
  if (!cargoOriginId.value) return opsStations.value;
  const originIata = getNormalizedCode(cargoOriginId.value);
  const destCodes = new Set(
    masterRoutes.value
      .filter((r: any) => {
        const originStation = masterStations.value.find((s: any) => s.id === r.origin_station_id);
        return originStation && getNormalizedCode(originStation.station_code) === originIata;
      })
      .map((r: any) => {
        const destStation = masterStations.value.find(
          (s: any) => s.id === r.destination_station_id
        );
        return destStation ? getNormalizedCode(destStation.station_code) : '';
      })
      .filter(Boolean)
  );
  return opsStations.value.filter((s: any) => destCodes.has(getNormalizedCode(s.code)));
});

const cargoFilteredFlights = computed(() => {
  if (!cargoOriginId.value || !cargoDestinationId.value) return [];
  return bookableFlights.value;
});

// Cargo tariff
const cargoVolumetricWeight = computed(() => {
  const vol = (cargoLength.value * cargoWidth.value * cargoHeight.value) / 6000;
  return Math.round(vol * 10) / 10;
});

const cargoChargeableWeight = computed(() => {
  return Math.max(cargoWeight.value, cargoVolumetricWeight.value);
});

const cargoTariffRate = computed(() => {
  const anyCard = rateCards.value.find((c: any) => c.service_type === 'CARGO');
  return anyCard ? anyCard.base_rate : 25000;
});

const cargoTotalTariff = computed(() => {
  return cargoChargeableWeight.value * cargoTariffRate.value;
});

// Seat Map configuration
const seatRows = ['A', 'B', 'C'];
const seatCols = [1, 2, 3, 4];

const occupiedSeats = ref<string[]>([]);
const isFetchingSeats = ref(false);

async function fetchOccupiedSeats() {
  if (!paxFlightId.value) {
    occupiedSeats.value = [];
    return;
  }
  isFetchingSeats.value = true;
  try {
    const seats = await fetchApi<string[]>(
      `/api/ticketing/occupied-seats?flightOrderId=${paxFlightId.value}`
    );
    occupiedSeats.value = seats || [];
  } catch (e) {
    console.error('Failed to fetch occupied seats', e);
    occupiedSeats.value = [];
  } finally {
    isFetchingSeats.value = false;
  }
}

// Fetch initial occupied seats
fetchOccupiedSeats();

// Watch flight selection to load occupied seats
watch(paxFlightId, () => {
  fetchOccupiedSeats();
  seatNumber.value = '';
});

function selectSeat(seat: string) {
  if (occupiedSeats.value.includes(seat)) return;
  seatNumber.value = seat;
}

// Actions
async function handleBookPassenger() {
  if (!paxFlightId.value || !passengerName.value || !passengerIdentity.value || !seatNumber.value) {
    return;
  }
  isSubmittingPax.value = true;
  try {
    const res = await store.bookPassengerTicket({
      flightOrderId: paxFlightId.value,
      passengerName: passengerName.value,
      documentNumber: passengerIdentity.value,
      seatNumber: seatNumber.value,
      weightKg: weightKg.value,
      ticketPrice: paxTicketPrice.value,
      loyaltyMemberId: loyaltyMemberId.value,
      agentId: agentIdPax.value
    });

    if (res && res.success) {
      successBookingId.value = res.ticket.id;
      successBookingType.value = 'ticket';
      successMessage.value = `Tiket atas nama ${res.ticket.passengerName} berhasil dibooking! Silakan lanjutkan pembayaran di tab 'Cek Status Booking'.`;
      successDialog.value = true;

      // Reset Form
      passengerName.value = '';
      passengerIdentity.value = '';
      seatNumber.value = '';
      paxFlightId.value = '';
      refreshFlights();
    }
  } catch (e: any) {
    console.error(e);
    pushToast({
      type: 'error',
      title: 'Booking Gagal',
      message: e.statusMessage || e.message || 'Terjadi kesalahan saat melakukan booking.'
    });
  } finally {
    isSubmittingPax.value = false;
  }
}

async function handleBookCargo() {
  if (!cargoFlightId.value || !cargoSender.value || !cargoReceiver.value) {
    return;
  }
  isSubmittingCargo.value = true;
  try {
    const res = await store.bookCargo({
      flightOrderId: cargoFlightId.value,
      senderName: cargoSender.value,
      receiverName: cargoReceiver.value,
      actualWeightKg: cargoWeight.value,
      lengthCm: cargoLength.value,
      widthCm: cargoWidth.value,
      heightCm: cargoHeight.value,
      isDangerous: isDangerous.value,
      dgClass: dgClass.value,
      paymentMethod: cargoPaymentMethod.value,
      agentId: cargoAgentId.value,
      totalTariff: cargoTotalTariff.value
    });

    if (res && res.success) {
      successBookingId.value = res.cargo.id;
      successBookingType.value = 'cargo';
      successMessage.value = `Registrasi Kargo (AWB) berhasil didaftarkan! Nomor AWB: ${res.cargo.id}. Silakan selesaikan pembayaran di tab 'Cek Status Booking'.`;
      successDialog.value = true;

      // Reset
      cargoSender.value = '';
      cargoReceiver.value = '';
      cargoWeight.value = 10;
      cargoLength.value = 30;
      cargoWidth.value = 30;
      cargoHeight.value = 30;
      isDangerous.value = false;
      cargoFlightId.value = '';
      refreshFlights();
    }
  } catch (e: any) {
    console.error(e);
  } finally {
    isSubmittingCargo.value = false;
  }
}

// Lookup Ticket / Cargo AWB
async function handleLookup() {
  if (!searchId.value.trim()) return;
  searchLoading.value = true;
  searchError.value = '';
  searchedItem.value = null;

  try {
    if (searchType.value === 'ticket') {
      const res = await fetchApi<any>(`/api/ticketing/tickets?id=${searchId.value.trim()}`);
      if (res) {
        searchedItem.value = res;
      } else {
        searchError.value = 'Tiket tidak ditemukan. Pastikan ID Tiket benar.';
      }
    } else {
      const res = await fetchApi<any>(`/api/ticketing/cargo-bookings?id=${searchId.value.trim()}`);
      if (res) {
        searchedItem.value = res;
      } else {
        searchError.value = 'Nomor AWB Kargo tidak ditemukan.';
      }
    }
  } catch {
    searchError.value = 'Gagal melakukan pencarian.';
  } finally {
    searchLoading.value = false;
  }
}

// Payment simulation
async function handlePay() {
  if (!searchedItem.value) return;
  try {
    if (searchType.value === 'ticket') {
      await store.payPassengerTicket(searchedItem.value.id);
    } else {
      await store.payCargo(searchedItem.value.id);
    }
    pushToast({
      type: 'success',
      title: 'Pembayaran Sukses',
      message: 'Booking berhasil dilunasi!'
    });
    // Reload lookup
    await handleLookup();
  } catch (e) {
    console.error(e);
  }
}

// Helper to get flight label from ticket
function getFlightLabel(flightOrderId: string) {
  const flight = flights.value.find((f: any) => f.id === flightOrderId);
  if (!flight) return flightOrderId;
  return `${flight.flightNumber} (${flight.route?.origin?.code} → ${flight.route?.destination?.code})`;
}

// Download PDF helper by ID
async function downloadPdfById(id: string, type: 'ticket' | 'cargo') {
  try {
    let item: any = null;
    if (type === 'ticket') {
      item = await fetchApi<any>(`/api/ticketing/tickets?id=${id}`);
    } else {
      item = await fetchApi<any>(`/api/ticketing/cargo-bookings?id=${id}`);
    }

    if (!item) {
      throw new Error('Data tidak ditemukan.');
    }

    await downloadPdf(item, type);
  } catch (e: any) {
    console.error('Failed to fetch details for PDF:', e);
    pushToast({
      type: 'error',
      title: 'Unduh PDF Gagal',
      message: e.message || 'Gagal mengambil detail untuk pembuatan PDF.'
    });
  }
}

// Generate and download PDF
async function downloadPdf(item: any, type: 'ticket' | 'cargo') {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const isTicket = type === 'ticket';
    const titleText = isTicket ? 'PASSENGER TICKET RECEIPT' : 'CARGO AIR WAYBILL (AWB)';
    const docId = item.id;
    const flightLabel = getFlightLabel(item.flightOrderId);
    const dateStr = new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // --- Header Block ---
    doc.setFillColor(24, 103, 192); // Primary Blue
    doc.rect(0, 0, 148, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PT ASSOCIATED MISSION AVIATION (AMA)', 10, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Jl. Sentani No. 1, Jayapura, Papua, Indonesia', 10, 15);
    doc.text('Web: www.ama-papua.or.id | Telp: +62-967-591000', 10, 20);

    // --- Title & Metadata Block ---
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(titleText, 10, 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(117, 117, 117);
    doc.text(`Dicetak pada: ${dateStr}`, 10, 40);

    // Border line
    doc.setDrawColor(224, 224, 224);
    doc.line(10, 43, 138, 43);

    // --- Details Grid ---
    let y = 50;
    doc.setTextColor(33, 33, 33);

    const drawRow = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 10, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), 50, y);
      y += 7;
    };

    if (isTicket) {
      drawRow('ID Tiket', docId);
      drawRow('Nama Penumpang', item.passengerName);
      drawRow('No. Identitas (NIK)', item.documentNumber);
      drawRow('Penerbangan', flightLabel);

      let depTimeStr = '-';
      let checkinTimeStr = '-';
      const flight = flights.value.find((f: any) => f.id === item.flightOrderId);
      if (flight) {
        const depDate = new Date(flight.scheduledDeparture);
        depTimeStr =
          depDate.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIT';

        const checkinDate = new Date(depDate.getTime() - 60 * 60 * 1000);
        checkinTimeStr =
          checkinDate.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIT';
      }

      drawRow('Keberangkatan', depTimeStr);
      drawRow('Batas Check-In', checkinTimeStr);
      drawRow('Nomor Kursi', item.seatNumber);
      drawRow('Estimasi Berat', `${item.weightKg} Kg`);
      drawRow('Status Check-In', item.checkInStatus || 'PENDING');
      drawRow('Loyalty Member ID', item.loyaltyMemberId || '-');
    } else {
      drawRow('Nomor AWB', docId);
      drawRow('Pengirim', item.senderName);
      drawRow('Penerima', item.receiverName);
      drawRow('Penerbangan', flightLabel);

      let depTimeStr = '-';
      const flight = flights.value.find((f: any) => f.id === item.flightOrderId);
      if (flight) {
        const depDate = new Date(flight.scheduledDeparture);
        depTimeStr =
          depDate.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIT';
      }
      drawRow('Waktu Terbang', depTimeStr);

      drawRow('Berat Aktual', `${item.actualWeightKg} Kg`);
      drawRow('Dimensi Paket', `${item.lengthCm}x${item.widthCm}x${item.heightCm} cm`);
      drawRow('Dangerous Goods', item.isDangerous ? `YA (${item.dgClass})` : 'TIDAK');
      drawRow('Status', item.status || 'BOOKED');
    }

    doc.line(10, y, 138, y);
    y += 7;

    // --- Cost & Payment Block ---
    const cost = isTicket ? item.ticketPrice || 0 : item.totalTariff || 0;
    const paymentStatus = item.paymentStatus || 'UNPAID';

    doc.setFont('helvetica', 'bold');
    doc.text('Total Biaya', 10, y);
    doc.setFontSize(12);
    doc.setTextColor(24, 103, 192); // Primary Blue
    doc.text(`Rp ${cost.toLocaleString('id-ID')}`, 50, y);
    y += 7;

    doc.setFontSize(9);
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.text('Status Pembayaran', 10, y);
    if (paymentStatus === 'PAID') {
      doc.setTextColor(76, 175, 80); // Success Green
      doc.text('LUNAS / PAID', 50, y);
    } else {
      doc.setTextColor(244, 67, 54); // Error Red
      doc.text('BELUM LUNAS / UNPAID', 50, y);
    }
    y += 12;

    // --- Footer Terms ---
    doc.setTextColor(117, 117, 117);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('* Tiket ini valid sebagai bukti pemesanan penerbangan PT AMA.', 10, y);
    y += 4;
    doc.text(
      '* Tunjukkan dokumen identitas asli saat melakukan check-in di hangar/bandara.',
      10,
      y
    );

    // Draw a decorative ticket border
    doc.setDrawColor(24, 103, 192);
    doc.rect(5, 5, 138, 200);

    doc.save(`AMA_Ticket_${docId}.pdf`);
    pushToast({
      type: 'success',
      title: 'PDF Berhasil Diunduh',
      message: `Dokumen ${docId} telah disimpan.`
    });
  } catch (e: any) {
    console.error('Error generating PDF:', e);
    pushToast({
      type: 'error',
      title: 'Unduh PDF Gagal',
      message: e.message || 'Terjadi kesalahan saat memproses dokumen.'
    });
  }
}

// Customer Refund Request State
const custRefundDialog = ref(false);
const custRefundReason = ref('');
const isSubmittingCustRefund = ref(false);

// Customer Reschedule State
const custRescheduleDialog = ref(false);
const custTargetFlightId = ref('');
const custTargetSeat = ref('');
const isSubmittingCustReschedule = ref(false);
const custOccupiedSeatsForTargetFlight = ref<string[]>([]);
const isLoadingCustOccupiedSeats = ref(false);

// Caravan seats (12 seats)
const caravanSeats = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'];

// Get alternative flights for searchedItem
const custAlternativeFlights = computed(() => {
  if (!searchedItem.value || searchType.value !== 'ticket') return [];
  const currentFlight = flights.value.find((f: any) => f.id === searchedItem.value.flightOrderId);
  if (!currentFlight || !currentFlight.route) return [];

  return flights.value.filter(
    (f: any) =>
      f.route?.id === currentFlight.route.id &&
      f.id !== currentFlight.id &&
      ['scheduled', 'ready'].includes(f.status)
  );
});

// Watch flight selection in customer reschedule dialog
watch(custTargetFlightId, async (newVal) => {
  custTargetSeat.value = '';
  if (!newVal) {
    custOccupiedSeatsForTargetFlight.value = [];
    return;
  }
  isLoadingCustOccupiedSeats.value = true;
  try {
    const res = await fetchApi<string[]>(`/api/ticketing/occupied-seats?flightOrderId=${newVal}`);
    custOccupiedSeatsForTargetFlight.value = res || [];
  } catch (e) {
    console.error('Error fetching occupied seats for reschedule:', e);
    custOccupiedSeatsForTargetFlight.value = [];
  } finally {
    isLoadingCustOccupiedSeats.value = false;
  }
});

function openCustRefundDialog() {
  custRefundReason.value = '';
  custRefundDialog.value = true;
}

async function handleCustRefundRequest() {
  if (!searchedItem.value || !custRefundReason.value.trim()) return;
  isSubmittingCustRefund.value = true;
  try {
    const res = await fetchApi<any>('/api/ticketing/request-refund', {
      method: 'POST',
      body: {
        type: searchType.value,
        id: searchedItem.value.id,
        reason: custRefundReason.value
      }
    });
    if (res && res.success) {
      pushToast({
        type: 'success',
        title: 'Pengajuan Refund Terkirim',
        message: 'Permintaan refund Anda telah dikirim dan menunggu persetujuan admin.'
      });
      custRefundDialog.value = false;
      // Refresh search details
      const refreshRes = await fetchApi<any>(
        searchType.value === 'ticket'
          ? `/api/ticketing/tickets?id=${searchedItem.value.id}`
          : `/api/ticketing/cargo-bookings?id=${searchedItem.value.id}`
      );
      searchedItem.value = refreshRes;
    }
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Pengajuan Gagal',
      message: e.data?.message || 'Terjadi kesalahan saat mengajukan refund.'
    });
  } finally {
    isSubmittingCustRefund.value = false;
  }
}

function openCustRescheduleDialog() {
  custTargetFlightId.value = '';
  custTargetSeat.value = '';
  custRescheduleDialog.value = true;
}

async function handleCustReschedule() {
  if (!searchedItem.value || !custTargetFlightId.value || !custTargetSeat.value) return;
  isSubmittingCustReschedule.value = true;
  try {
    const res = await fetchApi<any>('/api/ticketing/reschedule-ticket', {
      method: 'POST',
      body: {
        ticketId: searchedItem.value.id,
        newFlightOrderId: custTargetFlightId.value,
        newSeatNumber: custTargetSeat.value
      }
    });
    if (res && res.success) {
      pushToast({
        type: 'success',
        title: 'Reschedule Berhasil',
        message: `Tiket Anda berhasil dipindahkan ke penerbangan baru dengan kursi ${custTargetSeat.value}.`
      });
      custRescheduleDialog.value = false;
      // Refresh search details
      const refreshRes = await fetchApi<any>(`/api/ticketing/tickets?id=${searchedItem.value.id}`);
      searchedItem.value = refreshRes;
    }
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Reschedule Gagal',
      message: e.data?.message || 'Terjadi kesalahan saat reschedule.'
    });
  } finally {
    isSubmittingCustReschedule.value = false;
  }
}

const { pushToast } = useDemoToasts();
</script>

<template>
  <div class="min-h-screen bg-grey-lighten-4 py-8 px-4">
    <VContainer class="max-w-4xl">
      <!-- Navbar / Back to Login -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div class="d-flex align-center ga-3">
          <VImg
            alt="PT AMA logo"
            height="48"
            src="https://amapapua.com/files/ama-pt-logo-shaded4.png"
            width="64"
          />
          <div>
            <h1 class="text-h5 font-weight-bold text-primary">PT AMA Passenger & Cargo</h1>
            <p class="text-caption text-grey">Portal Booking Penerbangan Perintis & B2B Logistik</p>
          </div>
        </div>
        <VBtn variant="tonal" prepend-icon="mdi-arrow-left" to="/">
          Kembali ke Login Internal
        </VBtn>
      </div>

      <!-- Portal Tabs -->
      <ClientOnly>
        <VCard border rounded="xl" elevation="0">
          <VTabs v-model="activeTab" color="primary" grow bg-color="white">
            <VTab value="passenger">
              <VIcon start>mdi-account-outline</VIcon>
              Booking Tiket Penumpang
            </VTab>
            <VTab value="cargo">
              <VIcon start>mdi-package-variant-closed</VIcon>
              Registrasi Kargo (AWB)
            </VTab>
            <VTab value="lookup">
              <VIcon start>mdi-file-search-outline</VIcon>
              Cek Status Booking & Bayar
            </VTab>
          </VTabs>

          <VCardText class="bg-white pa-6">
            <VWindow v-model="activeTab">
              <!-- TAB 1: PASSENGER BOOKING -->
              <VWindowItem value="passenger">
                <VForm @submit.prevent="handleBookPassenger">
                  <div class="text-subtitle-1 font-weight-bold text-primary mb-4">
                    Rute Penerbangan
                  </div>
                  <VRow density="comfortable">
                    <VCol cols="12" md="6">
                      <VSelect
                        v-model="paxOriginId"
                        label="Asal"
                        :items="opsStations"
                        item-title="title"
                        item-value="code"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-airplane-takeoff"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VSelect
                        v-model="paxDestinationId"
                        label="Tujuan"
                        :items="paxDestStations"
                        item-title="title"
                        item-value="code"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-airplane-landing"
                        :disabled="!paxOriginId"
                      />
                    </VCol>
                  </VRow>

                  <!-- Flight Selector -->
                  <div v-if="paxOriginId && paxDestinationId" class="mt-4">
                    <div class="text-subtitle-1 font-weight-bold text-primary mb-2">
                      Jadwal Penerbangan Tersedia
                    </div>
                    <div v-if="paxFilteredFlights.length > 0">
                      <VRadioGroup v-model="paxFlightId" required>
                        <VRadio
                          v-for="flight in paxFilteredFlights"
                          :key="flight.id"
                          :value="flight.id"
                          color="primary"
                          class="border rounded-lg pa-3 mb-2"
                        >
                          <template #label>
                            <div class="w-full d-flex justify-space-between align-center">
                              <div>
                                <strong>{{ flight.flightNumber }}</strong> |
                                {{
                                  new Date(flight.scheduledDeparture).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                }}
                                <span class="text-caption text-grey ml-2">({{
                                  flight.aircraft?.displayName || flight.aircraft?.type
                                }})</span>
                                <VChip
                                  size="x-small"
                                  class="ml-2"
                                  :color="
                                    flight.status === 'scheduled'
                                      ? 'info'
                                      : flight.status === 'ready'
                                        ? 'success'
                                        : 'default'
                                  "
                                  variant="tonal"
                                >
                                  {{ flight.status }}
                                </VChip>
                              </div>
                              <div class="text-subtitle-2 font-weight-bold text-primary">
                                Rp {{ paxTicketPrice.toLocaleString('id-ID') }}
                              </div>
                            </div>
                          </template>
                        </VRadio>
                      </VRadioGroup>
                    </div>
                    <div v-else class="text-center py-6 border rounded-lg border-dashed">
                      <VIcon size="large" color="grey">mdi-calendar-remove</VIcon>
                      <div class="text-caption text-grey mt-1">
                        Tidak ada penerbangan terjadwal pada rute ini.
                      </div>
                    </div>
                  </div>

                  <!-- Passenger Details (Only visible if flight is selected) -->
                  <VExpandTransition>
                    <div v-if="paxFlightId" class="mt-6">
                      <VDivider class="mb-5" />
                      <div class="text-subtitle-1 font-weight-bold text-primary mb-4">
                        Data Penumpang & Pilih Kursi
                      </div>
                      <VRow density="comfortable">
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="passengerName"
                            label="Nama Lengkap Penumpang"
                            placeholder="Sesuai KTP/Paspor"
                            variant="outlined"
                            density="comfortable"
                            required
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="passengerIdentity"
                            label="Nomor Identitas (NIK/Passport)"
                            variant="outlined"
                            density="comfortable"
                            required
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model.number="weightKg"
                            label="Estimasi Berat Badan + Barang Bawaan (Kg)"
                            type="number"
                            variant="outlined"
                            density="comfortable"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VSelect
                            v-model="agentIdPax"
                            label="Melalui Sales Agent (Opsional)"
                            :items="agents"
                            item-title="agent_name"
                            item-value="id"
                            variant="outlined"
                            density="comfortable"
                            clearable
                          />
                        </VCol>
                      </VRow>

                      <!-- Seat Map -->
                      <div class="mt-4">
                        <div class="text-caption font-weight-bold text-grey mb-2">
                          PILIH KURSI (SEAT MAP CAP-12)
                        </div>
                        <div class="bg-grey-lighten-4 border rounded-xl pa-4 max-w-sm mx-auto">
                          <div class="text-center text-caption text-grey mb-3">KOKPIT / DEPAN</div>
                          <div class="d-flex flex-column align-center ga-2">
                            <div v-for="col in seatCols" :key="col" class="d-flex ga-4">
                              <div v-for="row in seatRows" :key="row">
                                <VBtn
                                  size="small"
                                  :color="
                                    seatNumber === `${row}${col}`
                                      ? 'primary'
                                      : occupiedSeats.includes(`${row}${col}`)
                                        ? 'grey-lighten-1'
                                        : 'success'
                                  "
                                  :variant="
                                    seatNumber === `${row}${col}`
                                      ? 'elevated'
                                      : occupiedSeats.includes(`${row}${col}`)
                                        ? 'flat'
                                        : 'tonal'
                                  "
                                  :disabled="occupiedSeats.includes(`${row}${col}`)"
                                  class="rounded-lg font-weight-bold"
                                  @click="selectSeat(`${row}${col}`)"
                                >
                                  {{ row }}{{ col }}
                                </VBtn>
                              </div>
                            </div>
                          </div>
                          <div class="text-center text-caption text-grey mt-3">EKOR / BELAKANG</div>

                          <!-- Legend -->
                          <div class="d-flex justify-center ga-4 mt-4 pt-2 border-t text-caption">
                            <div class="d-flex align-center ga-1">
                              <span
                                class="d-inline-block rounded-circle"
                                style="width: 8px; height: 8px; background-color: #4caf50"
                              />
                              <span class="text-grey font-weight-medium">Tersedia</span>
                            </div>
                            <div class="d-flex align-center ga-1">
                              <span
                                class="d-inline-block rounded-circle"
                                style="width: 8px; height: 8px; background-color: #1867c0"
                              />
                              <span class="text-grey font-weight-medium">Terpilih</span>
                            </div>
                            <div class="d-flex align-center ga-1">
                              <span
                                class="d-inline-block rounded-circle"
                                style="width: 8px; height: 8px; background-color: #bdbdbd"
                              />
                              <span class="text-grey font-weight-medium">Terisi</span>
                            </div>
                          </div>
                        </div>
                        <div
                          v-if="seatNumber"
                          class="text-center text-caption text-primary font-weight-bold mt-2"
                        >
                          Kursi Terpilih: {{ seatNumber }}
                        </div>
                      </div>

                      <!-- Payment Mode -->
                      <div
                        class="mt-6 border-t pt-4 d-flex align-center justify-space-between flex-wrap ga-4"
                      >
                        <div>
                          <div class="text-caption text-grey">TOTAL BIAYA</div>
                          <div class="text-h5 font-weight-bold text-primary">
                            Rp {{ paxTicketPrice.toLocaleString('id-ID') }}
                          </div>
                        </div>
                        <VBtn
                          color="primary"
                          size="large"
                          type="submit"
                          :loading="isSubmittingPax"
                          :disabled="!passengerName || !passengerIdentity || !seatNumber"
                        >
                          Booking Tiket
                        </VBtn>
                      </div>
                    </div>
                  </VExpandTransition>
                </VForm>
              </VWindowItem>

              <!-- TAB 2: CARGO BOOKING -->
              <VWindowItem value="cargo">
                <VForm @submit.prevent="handleBookCargo">
                  <div class="text-subtitle-1 font-weight-bold text-primary mb-4">
                    Informasi Rute & Pengiriman
                  </div>
                  <VRow density="comfortable">
                    <VCol cols="12" md="6">
                      <VSelect
                        v-model="cargoOriginId"
                        label="Station Asal"
                        :items="opsStations"
                        item-title="title"
                        item-value="code"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-airplane-takeoff"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VSelect
                        v-model="cargoDestinationId"
                        label="Station Tujuan"
                        :items="cargoDestStations"
                        item-title="title"
                        item-value="code"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-airplane-landing"
                        :disabled="!cargoOriginId"
                      />
                    </VCol>
                  </VRow>

                  <!-- Flight Selector for Cargo -->
                  <div v-if="cargoOriginId && cargoDestinationId" class="mt-4">
                    <div class="text-subtitle-1 font-weight-bold text-primary mb-2">
                      Pilih Penerbangan Kargo
                    </div>
                    <div v-if="cargoFilteredFlights.length > 0">
                      <VRadioGroup v-model="cargoFlightId" required>
                        <VRadio
                          v-for="flight in cargoFilteredFlights"
                          :key="flight.id"
                          :value="flight.id"
                          color="secondary"
                          class="border rounded-lg pa-3 mb-2"
                        >
                          <template #label>
                            <div class="w-full d-flex justify-space-between align-center">
                              <div>
                                <strong>{{ flight.flightNumber }}</strong> |
                                {{
                                  new Date(flight.scheduledDeparture).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                }}
                                <VChip
                                  size="x-small"
                                  class="ml-2"
                                  :color="
                                    flight.status === 'scheduled'
                                      ? 'info'
                                      : flight.status === 'ready'
                                        ? 'success'
                                        : 'default'
                                  "
                                  variant="tonal"
                                >
                                  {{ flight.status }}
                                </VChip>
                              </div>
                              <div class="text-caption text-grey">
                                Sisa Kapasitas Cargo:
                                {{
                                  flight.aircraft?.capacity
                                    ? `${flight.aircraft.capacity} Pax`
                                    : '800 Kg'
                                }}
                              </div>
                            </div>
                          </template>
                        </VRadio>
                      </VRadioGroup>
                    </div>
                    <div v-else class="text-center py-6 border rounded-lg border-dashed">
                      <VIcon size="large" color="grey">mdi-calendar-remove</VIcon>
                      <div class="text-caption text-grey mt-1">
                        Tidak ada penerbangan terjadwal pada rute ini.
                      </div>
                    </div>
                  </div>

                  <!-- Cargo Form Details -->
                  <VExpandTransition>
                    <div v-if="cargoFlightId" class="mt-6">
                      <VDivider class="mb-5" />
                      <div class="text-subtitle-1 font-weight-bold text-primary mb-4">
                        Detail Pengirim & Barang Kargo
                      </div>
                      <VRow density="comfortable">
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="cargoSender"
                            label="Nama Pengirim (Sender)"
                            variant="outlined"
                            density="comfortable"
                            required
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="cargoReceiver"
                            label="Nama Penerima (Receiver)"
                            variant="outlined"
                            density="comfortable"
                            required
                          />
                        </VCol>
                        <VCol cols="12" md="3">
                          <VTextField
                            v-model.number="cargoWeight"
                            label="Berat Aktual (Kg)"
                            type="number"
                            variant="outlined"
                            density="comfortable"
                            required
                          />
                        </VCol>
                        <VCol cols="12" md="3">
                          <VTextField
                            v-model.number="cargoLength"
                            label="Panjang (cm)"
                            type="number"
                            variant="outlined"
                            density="comfortable"
                            required
                          />
                        </VCol>
                        <VCol cols="12" md="3">
                          <VTextField
                            v-model.number="cargoWidth"
                            label="Lebar (cm)"
                            type="number"
                            variant="outlined"
                            density="comfortable"
                            required
                          />
                        </VCol>
                        <VCol cols="12" md="3">
                          <VTextField
                            v-model.number="cargoHeight"
                            label="Tinggi (cm)"
                            type="number"
                            variant="outlined"
                            density="comfortable"
                            required
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VSelect
                            v-model="cargoAgentId"
                            label="Corporate Agent / B2B Account"
                            :items="agents"
                            item-title="agent_name"
                            item-value="id"
                            variant="outlined"
                            density="comfortable"
                            clearable
                          />
                        </VCol>
                      </VRow>

                      <!-- DG Category -->
                      <div class="mt-3">
                        <VSwitch
                          v-model="isDangerous"
                          color="warning"
                          label="Mengandung Dangerous Goods (Benda Berbahaya)"
                          inset
                        />
                        <VSelect
                          v-if="isDangerous"
                          v-model="dgClass"
                          label="Kelas Dangerous Goods (DG)"
                          :items="[
                            'Class 9 - Lithium Batteries',
                            'Class 3 - Flammable Liquids',
                            'Class 2 - Gases'
                          ]"
                          variant="outlined"
                          density="comfortable"
                        />
                      </div>

                      <!-- Cargo Price Calculations -->
                      <VAlert color="info" variant="tonal" class="rounded-lg mt-4">
                        <VRow density="comfortable">
                          <VCol cols="6">
                            <div class="text-caption">Chargeable Weight:</div>
                            <div class="font-weight-bold">
                              {{ cargoChargeableWeight }} Kg (Aktual: {{ cargoWeight }} Kg |
                              Volumetrik: {{ cargoVolumetricWeight }} Kg)
                            </div>
                          </VCol>
                          <VCol cols="6">
                            <div class="text-caption">Tarif Kargo Flat:</div>
                            <div class="font-weight-bold">
                              Rp {{ cargoTariffRate.toLocaleString('id-ID') }} / Kg
                            </div>
                          </VCol>
                        </VRow>
                      </VAlert>

                      <!-- Pay button -->
                      <div
                        class="mt-6 border-t pt-4 d-flex align-center justify-space-between flex-wrap ga-4"
                      >
                        <div>
                          <div class="text-caption text-grey">ESTIMASI TARIF KARGO</div>
                          <div class="text-h5 font-weight-bold text-secondary">
                            Rp {{ cargoTotalTariff.toLocaleString('id-ID') }}
                          </div>
                        </div>
                        <VBtn
                          color="secondary"
                          size="large"
                          type="submit"
                          :loading="isSubmittingCargo"
                          :disabled="!cargoSender || !cargoReceiver"
                        >
                          Registrasi Kargo (AWB)
                        </VBtn>
                      </div>
                    </div>
                  </VExpandTransition>
                </VForm>
              </VWindowItem>

              <!-- TAB 3: SEARCH & PAY PORTAL -->
              <VWindowItem value="lookup">
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-primary mb-3">
                    Pencarian Booking & Simulasi Pembayaran
                  </div>
                  <div class="d-flex flex-wrap ga-3 mb-6">
                    <VRadioGroup v-model="searchType" inline hide-details class="mr-4">
                      <VRadio label="Tiket Penumpang" value="ticket" color="primary" />
                      <VRadio label="Kargo Udara (AWB)" value="cargo" color="secondary" />
                    </VRadioGroup>
                    <div class="d-flex w-full md:w-auto ga-2 align-center flex-grow-1">
                      <VTextField
                        v-model="searchId"
                        :label="
                          searchType === 'ticket' ? 'Contoh: TKT-XXXXXX' : 'Contoh: AWB-XXXXXX'
                        "
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      />
                      <VBtn
                        color="primary"
                        prepend-icon="mdi-magnify"
                        height="48"
                        :loading="searchLoading"
                        @click="handleLookup"
                      >
                        Cari
                      </VBtn>
                    </div>
                  </div>

                  <VAlert v-if="searchError" type="error" variant="tonal" class="rounded-lg mb-4">
                    {{ searchError }}
                  </VAlert>

                  <!-- Search Result Detail Card -->
                  <VExpandTransition>
                    <div v-if="searchedItem">
                      <VCard border rounded="xl" class="pa-4">
                        <VCardTitle
                          class="text-primary font-weight-bold d-flex justify-space-between align-center border-b pb-3"
                        >
                          <span>Detail
                            {{ searchType === 'ticket' ? 'Tiket Penumpang' : 'AWB Kargo' }}</span>
                          <VChip
                            :color="searchedItem.paymentStatus === 'PAID' ? 'success' : 'warning'"
                            variant="elevated"
                            size="small"
                          >
                            {{ searchedItem.paymentStatus }}
                          </VChip>
                        </VCardTitle>

                        <VCardText class="pt-4 text-body-1">
                          <!-- Passenger detail -->
                          <div v-if="searchType === 'ticket'">
                            <VRow density="comfortable">
                              <VCol cols="12" md="6">
                                <strong>ID Tiket:</strong> {{ searchedItem.id }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Nama Penumpang:</strong>
                                {{ searchedItem.passengerName }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Nomor Identitas:</strong>
                                {{ searchedItem.documentNumber }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Penerbangan:</strong>
                                {{ getFlightLabel(searchedItem.flightOrderId) }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Nomor Kursi:</strong> {{ searchedItem.seatNumber }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Berat Bagasi:</strong> {{ searchedItem.weightKg }} Kg
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Biaya Tiket:</strong> Rp
                                {{ searchedItem.ticketPrice?.toLocaleString('id-ID') }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Status Check-In:</strong>
                                <VChip
                                  size="small"
                                  :color="
                                    searchedItem.checkInStatus === 'CHECKED_IN'
                                      ? 'success'
                                      : 'default'
                                  "
                                >
                                  {{ searchedItem.checkInStatus }}
                                </VChip>
                              </VCol>
                            </VRow>
                          </div>
                          <!-- Cargo detail -->
                          <div v-else>
                            <VRow density="comfortable">
                              <VCol cols="12" md="6">
                                <strong>Nomor AWB:</strong> {{ searchedItem.id }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Pengirim:</strong> {{ searchedItem.senderName }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Penerima:</strong> {{ searchedItem.receiverName }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Berat Aktual:</strong>
                                {{ searchedItem.actualWeightKg }} Kg
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Dimensi:</strong> {{ searchedItem.lengthCm }} x
                                {{ searchedItem.widthCm }} x {{ searchedItem.heightCm }} cm
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Benda Berbahaya (DG):</strong>
                                {{
                                  searchedItem.isDangerous
                                    ? 'YA (' + searchedItem.dgClass + ')'
                                    : 'TIDAK'
                                }}
                              </VCol>
                              <VCol cols="12" md="6">
                                <strong>Total Tarif:</strong> Rp
                                {{ searchedItem.totalTariff?.toLocaleString('id-ID') }}
                              </VCol>
                            </VRow>
                          </div>
                        </VCardText>

                        <!-- Action Area: Pay, Refund, Reschedule -->
                        <VCardActions
                          class="border-t pt-3 mt-3 d-flex flex-wrap align-center justify-end ga-2"
                        >
                          <VBtn
                            color="secondary"
                            prepend-icon="mdi-download"
                            variant="outlined"
                            @click="downloadPdf(searchedItem, searchType)"
                          >
                            Unduh PDF
                          </VBtn>

                          <!-- Simulasi Bayar jika belum lunas -->
                          <VBtn
                            v-if="
                              searchedItem.paymentStatus !== 'PAID' &&
                                searchedItem.paymentStatus !== 'REFUND_REQUESTED' &&
                                searchedItem.paymentStatus !== 'REFUNDED'
                            "
                            color="success"
                            prepend-icon="mdi-cash"
                            variant="flat"
                            @click="handlePay"
                          >
                            Simulasi Bayar Sekarang
                          </VBtn>

                          <!-- Jika Lunas, bisa ajukan Refund & Reschedule (jika syarat terpenuhi) -->
                          <template v-if="searchedItem.paymentStatus === 'PAID'">
                            <div
                              class="d-flex align-center ga-1 text-success font-weight-bold mr-auto"
                            >
                              <VIcon>mdi-check-decagram</VIcon>
                              Lunas & Terverifikasi
                            </div>

                            <!-- Reschedule untuk Tiket Penumpang -->
                            <VBtn
                              v-if="
                                searchType === 'ticket' &&
                                  searchedItem.checkInStatus !== 'CHECKED_IN'
                              "
                              color="warning"
                              variant="outlined"
                              prepend-icon="mdi-calendar-edit"
                              @click="openCustRescheduleDialog"
                            >
                              Reschedule
                            </VBtn>

                            <!-- Refund untuk Tiket (belum check-in) & Kargo (belum terkirim/batal) -->
                            <VBtn
                              v-if="
                                (searchType === 'ticket' &&
                                  searchedItem.checkInStatus !== 'CHECKED_IN') ||
                                  (searchType === 'cargo' &&
                                    searchedItem.status !== 'DELIVERED' &&
                                    searchedItem.status !== 'CANCELLED')
                              "
                              color="error"
                              variant="outlined"
                              prepend-icon="mdi-cash-refund"
                              @click="openCustRefundDialog"
                            >
                              Ajukan Refund
                            </VBtn>
                          </template>

                          <!-- Status Pengajuan Refund -->
                          <div
                            v-else-if="searchedItem.paymentStatus === 'REFUND_REQUESTED'"
                            class="d-flex align-center ga-1 text-warning font-weight-bold"
                          >
                            <VIcon color="warning">mdi-clock-outline</VIcon>
                            Menunggu Persetujuan Refund oleh Admin
                          </div>

                          <!-- Status Sudah Refunded -->
                          <div
                            v-else-if="searchedItem.paymentStatus === 'REFUNDED'"
                            class="d-flex align-center ga-1 text-error font-weight-bold"
                          >
                            <VIcon color="error">mdi-cancel</VIcon>
                            Booking Dibatalkan & Refund Selesai
                          </div>
                        </VCardActions>
                      </VCard>
                    </div>
                  </VExpandTransition>
                </div>
              </VWindowItem>
            </VWindow>
          </VCardText>
        </VCard>
      </ClientOnly>
    </VContainer>

    <!-- CUSTOMER REFUND REQUEST DIALOG -->
    <VDialog v-model="custRefundDialog" max-width="450">
      <VCard border rounded="xl" class="pa-4">
        <VCardTitle class="text-error font-weight-bold border-b pb-2">
          Pengajuan Pembatalan & Refund
        </VCardTitle>
        <VCardText v-if="searchedItem" class="pt-4">
          Apakah Anda yakin ingin mengajukan refund untuk
          {{ searchType === 'ticket' ? 'Tiket' : 'AWB Kargo' }}
          <strong>{{ searchedItem.id }}</strong>?
          <VTextarea
            v-model="custRefundReason"
            label="Alasan Pembatalan / Refund (Wajib)"
            placeholder="Tulis alasan mengapa Anda ingin mengajukan pembatalan tiket..."
            variant="outlined"
            density="comfortable"
            rows="3"
            class="mt-3"
            required
          />
        </VCardText>
        <VCardActions class="border-t pt-3 mt-3">
          <VSpacer />
          <VBtn variant="text" @click="custRefundDialog = false">Batal</VBtn>
          <VBtn
            color="error"
            :disabled="!custRefundReason.trim()"
            :loading="isSubmittingCustRefund"
            @click="handleCustRefundRequest"
          >
            Kirim Pengajuan
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- CUSTOMER RESCHEDULE DIALOG -->
    <VDialog v-model="custRescheduleDialog" max-width="500">
      <VCard border rounded="xl" class="pa-4">
        <VCardTitle class="text-warning font-weight-bold border-b pb-2">
          Reschedule Mandiri Penerbangan
        </VCardTitle>
        <VCardText v-if="searchedItem" class="pt-4">
          <div v-if="searchType === 'ticket'" class="mb-4">
            Reschedule tiket untuk: <strong>{{ searchedItem.passengerName }}</strong><br>
            Penerbangan saat ini:
            <strong>{{ getFlightLabel(searchedItem.flightOrderId) }}</strong> (Kursi:
            {{ searchedItem.seatNumber }})
          </div>

          <!-- Select New Flight -->
          <VSelect
            v-model="custTargetFlightId"
            :items="custAlternativeFlights"
            item-title="flightNumber"
            item-value="id"
            label="Pilih Penerbangan Alternatif"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            no-data-text="Tidak ada penerbangan alternatif dengan rute ini"
          />

          <!-- Select New Seat -->
          <div v-if="custTargetFlightId">
            <div class="text-subtitle-2 font-weight-bold mb-2">Pilih Kursi Baru:</div>
            <div class="d-grid ga-2" style="display: grid; grid-template-columns: repeat(4, 1fr)">
              <VBtn
                v-for="seat in caravanSeats"
                :key="seat"
                size="small"
                :color="custTargetSeat === seat ? 'warning' : 'default'"
                :disabled="custOccupiedSeatsForTargetFlight.includes(seat)"
                variant="outlined"
                @click="custTargetSeat = seat"
              >
                {{ seat }}
              </VBtn>
            </div>
            <div v-if="isLoadingCustOccupiedSeats" class="text-caption text-grey mt-2 text-center">
              Memuat status kursi...
            </div>
          </div>
        </VCardText>
        <VCardActions class="border-t pt-3 mt-3">
          <VSpacer />
          <VBtn variant="text" @click="custRescheduleDialog = false">Batal</VBtn>
          <VBtn
            color="warning"
            :disabled="!custTargetFlightId || !custTargetSeat"
            :loading="isSubmittingCustReschedule"
            @click="handleCustReschedule"
          >
            Confirm Reschedule
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- SUCCESS DIALOG -->
    <VDialog v-model="successDialog" max-width="500">
      <VCard border rounded="xl" class="pa-4 text-center">
        <VCardText>
          <VIcon size="64" color="success" class="mb-3">mdi-check-circle-outline</VIcon>
          <div class="text-h6 font-weight-bold mb-2">Booking Berhasil Diterbitkan!</div>
          <p class="text-body-2 text-grey mb-4">{{ successMessage }}</p>
          <div
            class="bg-grey-lighten-4 rounded-lg pa-3 font-weight-bold text-primary text-h5 mb-4 border border-dashed"
          >
            {{ successBookingId }}
          </div>
          <VBtn
            color="success"
            variant="tonal"
            prepend-icon="mdi-download"
            class="mb-4"
            block
            @click="downloadPdfById(successBookingId, successBookingType)"
          >
            Unduh Dokumen PDF
          </VBtn>
          <p class="text-caption text-grey-darken-1">
            Simpan kode di atas untuk melakukan pengecekan status tiket & pembayaran.
          </p>
        </VCardText>
        <VCardActions class="justify-center">
          <VBtn color="primary" variant="flat" @click="successDialog = false">Tutup</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
