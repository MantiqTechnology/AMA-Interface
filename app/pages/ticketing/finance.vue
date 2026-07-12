<script setup lang="ts">
const { can } = useAuthorization();

// Load agents
const { data: agentsData } = await useAsyncData('fin-agents', () =>
  fetchApi<any>('/api/master-data/agents')
);
const agents = computed(() => agentsData.value?.rows || []);

// Load tickets and cargo directly from API
const { data: ticketsData } = await useAsyncData('fin-tickets', () =>
  fetchApi<any[]>('/api/ticketing/tickets')
);
const { data: cargosData } = await useAsyncData('fin-cargos', () =>
  fetchApi<any[]>('/api/ticketing/cargo-bookings')
);
const { data: flightsData } = await useAsyncData('fin-flights', () =>
  fetchApi<any[]>('/api/flights')
);

const tickets = computed(() => ticketsData.value || []);
const cargos = computed(() => cargosData.value || []);
const flights = computed(() => flightsData.value || []);

// Financial calculations
const totalPassengerRevenue = computed(() => {
  return tickets.value
    .filter((t: any) => t.paymentStatus === 'PAID')
    .reduce((sum: number, t: any) => sum + (t.ticketPrice || 0), 0);
});

const totalCargoRevenue = computed(() => {
  return cargos.value
    .filter((c: any) => c.paymentStatus === 'PAID')
    .reduce((sum: number, c: any) => sum + (c.totalTariff || 0), 0);
});

const totalStationRevenue = computed(() => {
  return totalPassengerRevenue.value + totalCargoRevenue.value;
});

// Mock ledger logs (supporting refund transactions)
const ledgerEntries = computed(() => {
  const entries: any[] = [];
  tickets.value.forEach((t: any) => {
    if (t.paymentStatus === 'PAID') {
      entries.push({
        id: `TX-${t.id}`,
        type: 'PASSENGER',
        description: `Pendapatan Tiket Penumpang: ${t.passengerName} (Seat ${t.seatNumber})`,
        amount: t.ticketPrice,
        date: t.createdAt || new Date().toISOString()
      });
    } else if (t.paymentStatus === 'REFUNDED') {
      entries.push({
        id: `TX-${t.id}`,
        type: 'PASSENGER',
        description: `Pendapatan Tiket Penumpang: ${t.passengerName} (Seat ${t.seatNumber})`,
        amount: t.ticketPrice,
        date: t.createdAt || new Date().toISOString()
      });
      entries.push({
        id: `TX-${t.id}-REF`,
        type: 'PASSENGER',
        description: `Refund Tiket Penumpang: ${t.passengerName} (Seat ${t.seatNumber})`,
        amount: -(t.ticketPrice || 0),
        date: new Date().toISOString()
      });
    }
  });

  cargos.value.forEach((c: any) => {
    if (c.paymentStatus === 'PAID') {
      entries.push({
        id: `TX-${c.id}`,
        type: 'CARGO',
        description: `Pendapatan Kargo AWB: ${c.id} (${c.senderName} -> ${c.receiverName})`,
        amount: c.totalTariff,
        date: c.createdAt || new Date().toISOString()
      });
    } else if (c.paymentStatus === 'REFUNDED') {
      entries.push({
        id: `TX-${c.id}`,
        type: 'CARGO',
        description: `Pendapatan Kargo AWB: ${c.id} (${c.senderName} -> ${c.receiverName})`,
        amount: c.totalTariff,
        date: c.createdAt || new Date().toISOString()
      });
      entries.push({
        id: `TX-${c.id}-REF`,
        type: 'CARGO',
        description: `Refund Kargo AWB: ${c.id} (${c.senderName} -> ${c.receiverName})`,
        amount: -(c.totalTariff || 0),
        date: new Date().toISOString()
      });
    }
  });

  // Sort by date desc
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

// Route Revenue Recap: group revenue by route ID
const revenueByRoute = computed(() => {
  const routeMap: Record<
    string,
    { origin: string; destination: string; passenger: number; cargo: number; total: number }
  > = {};

  flights.value.forEach((f: any) => {
    if (!f.route) return;
    const key = f.route.id;
    if (!routeMap[key]) {
      routeMap[key] = {
        origin: f.route.origin?.name || f.route.origin?.code || '',
        destination: f.route.destination?.name || f.route.destination?.code || '',
        passenger: 0,
        cargo: 0,
        total: 0
      };
    }
  });

  tickets.value.forEach((t: any) => {
    if (t.paymentStatus !== 'PAID') return;
    const flight = flights.value.find((f: any) => f.id === t.flightOrderId);
    if (flight && flight.route) {
      const key = flight.route.id;
      if (!routeMap[key]) {
        routeMap[key] = {
          origin: flight.route.origin?.name || flight.route.origin?.code || '',
          destination: flight.route.destination?.name || flight.route.destination?.code || '',
          passenger: 0,
          cargo: 0,
          total: 0
        };
      }
      routeMap[key].passenger += t.ticketPrice || 0;
    }
  });

  cargos.value.forEach((c: any) => {
    if (c.paymentStatus !== 'PAID') return;
    const flight = flights.value.find((f: any) => f.id === c.flightOrderId);
    if (flight && flight.route) {
      const key = flight.route.id;
      if (!routeMap[key]) {
        routeMap[key] = {
          origin: flight.route.origin?.name || flight.route.origin?.code || '',
          destination: flight.route.destination?.name || flight.route.destination?.code || '',
          passenger: 0,
          cargo: 0,
          total: 0
        };
      }
      routeMap[key].cargo += c.totalTariff || 0;
    }
  });

  return Object.values(routeMap).map((r) => {
    r.total = r.passenger + r.cargo;
    return r;
  });
});

// Station Revenue Recap: group revenue by origin station code
const revenueByStation = computed(() => {
  const stationMap: Record<
    string,
    { stationName: string; code: string; ticketCount: number; cargoWeight: number; total: number }
  > = {};

  tickets.value.forEach((t: any) => {
    if (t.paymentStatus !== 'PAID') return;
    const flight = flights.value.find((f: any) => f.id === t.flightOrderId);
    if (flight && flight.route && flight.route.origin) {
      const station = flight.route.origin;
      const key = station.code;
      if (!stationMap[key]) {
        stationMap[key] = {
          stationName: station.name,
          code: station.code,
          ticketCount: 0,
          cargoWeight: 0,
          total: 0
        };
      }
      stationMap[key].ticketCount += 1;
      stationMap[key].total += t.ticketPrice || 0;
    }
  });

  cargos.value.forEach((c: any) => {
    if (c.paymentStatus !== 'PAID') return;
    const flight = flights.value.find((f: any) => f.id === c.flightOrderId);
    if (flight && flight.route && flight.route.origin) {
      const station = flight.route.origin;
      const key = station.code;
      if (!stationMap[key]) {
        stationMap[key] = {
          stationName: station.name,
          code: station.code,
          ticketCount: 0,
          cargoWeight: 0,
          total: 0
        };
      }
      stationMap[key].cargoWeight += c.actualWeightKg || 0;
      stationMap[key].total += c.totalTariff || 0;
    }
  });

  return Object.values(stationMap);
});
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div v-if="!can('booking.read').allowed && !can('finance_handoff.read').allowed">
      <VAlert type="error" variant="tonal" class="rounded-lg mb-3">
        Akses Ditolak: Anda tidak memiliki izin untuk melihat modul Keuangan & Loyalty (booking.read
        atau finance_handoff.read).
      </VAlert>
    </div>
    <div v-else>
      <!-- Page Header -->
      <div class="mb-5 d-flex flex-wrap align-end justify-space-between ga-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-text-primary">Keuangan & Sales Performa</h1>
          <p class="text-text-muted">
            Pencatatan pembukuan otomatis stasiun PT AMA (General Ledger), laporan performa sales
            agen, dan keanggotaan loyalty program.
          </p>
        </div>
      </div>

      <!-- Financial Statistics Cards -->
      <VRow class="mb-5">
        <VCol cols="12" sm="6" md="4">
          <VCard border class="rounded-xl pa-3">
            <VCardText class="d-flex align-center ga-4">
              <VAvatar color="primary-lighten-4" size="large">
                <VIcon color="primary" size="large">mdi-cash-multiple</VIcon>
              </VAvatar>
              <div>
                <div class="text-caption text-grey uppercase font-weight-bold">
                  Total Pendapatan Tiket
                </div>
                <div class="text-h5 font-weight-bold text-primary">
                  Rp {{ totalPassengerRevenue.toLocaleString('id-ID') }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard border class="rounded-xl pa-3">
            <VCardText class="d-flex align-center ga-4">
              <VAvatar color="secondary-lighten-4" size="large">
                <VIcon color="secondary" size="large">mdi-package-variant</VIcon>
              </VAvatar>
              <div>
                <div class="text-caption text-grey uppercase font-weight-bold">
                  Total Pendapatan Kargo
                </div>
                <div class="text-h5 font-weight-bold text-secondary">
                  Rp {{ totalCargoRevenue.toLocaleString('id-ID') }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard border class="rounded-xl pa-3">
            <VCardText class="d-flex align-center ga-4">
              <VAvatar color="success-lighten-4" size="large">
                <VIcon color="success" size="large">mdi-bank</VIcon>
              </VAvatar>
              <div>
                <div class="text-caption text-grey uppercase font-weight-bold">
                  Total Pendapatan Stasiun
                </div>
                <div class="text-h5 font-weight-bold text-success">
                  Rp {{ totalStationRevenue.toLocaleString('id-ID') }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Revenue Recap per Route & Station -->
      <VRow class="mb-5">
        <!-- Route Recap -->
        <VCol cols="12" md="6">
          <VCard border rounded="lg">
            <VCardTitle class="text-subtitle-1 font-weight-bold text-primary px-4 py-3">
              <VIcon start color="primary">mdi-map-marker-distance</VIcon>
              Rekap Pendapatan per Rute
            </VCardTitle>
            <VTable class="w-full">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th>RUTE</th>
                  <th>TIKET PENUMPANG</th>
                  <th>TARIF KARGO</th>
                  <th>TOTAL OMSET</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="route in revenueByRoute" :key="route.origin + '-' + route.destination">
                  <td class="font-weight-bold text-secondary">
                    {{ route.origin }} → {{ route.destination }}
                  </td>
                  <td>Rp {{ route.passenger.toLocaleString('id-ID') }}</td>
                  <td>Rp {{ route.cargo.toLocaleString('id-ID') }}</td>
                  <td class="font-weight-bold text-success">
                    Rp {{ route.total.toLocaleString('id-ID') }}
                  </td>
                </tr>
                <tr v-if="revenueByRoute.length === 0">
                  <td colspan="4" class="text-center text-grey py-4">
                    Belum ada transaksi rute tercatat.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>

        <!-- Station Recap -->
        <VCol cols="12" md="6">
          <VCard border rounded="lg">
            <VCardTitle class="text-subtitle-1 font-weight-bold text-primary px-4 py-3">
              <VIcon start color="primary">mdi-office-building-marker</VIcon>
              Rekap Pendapatan per Stasiun (Asal)
            </VCardTitle>
            <VTable class="w-full">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th>STASIUN</th>
                  <th>TIKET TERJUAL</th>
                  <th>BERAT KARGO</th>
                  <th>TOTAL PENDAPATAN</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="station in revenueByStation" :key="station.code">
                  <td class="font-weight-bold text-secondary">
                    {{ station.stationName }} ({{ station.code }})
                  </td>
                  <td>{{ station.ticketCount }} Tiket</td>
                  <td>{{ station.cargoWeight }} Kg</td>
                  <td class="font-weight-bold text-success">
                    Rp {{ station.total.toLocaleString('id-ID') }}
                  </td>
                </tr>
                <tr v-if="revenueByStation.length === 0">
                  <td colspan="4" class="text-center text-grey py-4">
                    Belum ada transaksi stasiun tercatat.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>

      <VRow>
        <!-- Ledger log -->
        <VCol cols="12" lg="8">
          <VCard border rounded="lg">
            <VCardTitle class="text-subtitle-1 font-weight-bold text-primary px-4 py-3">
              Jurnal Pembukuan Otomatis (General Ledger)
            </VCardTitle>
            <VTable class="w-full">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th>ID JURNAL</th>
                  <th>KATEGORI</th>
                  <th>KETERANGAN TRANSAKSI</th>
                  <th>DEBIT (MASUK)</th>
                  <th>TANGGAL CATAT</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in ledgerEntries" :key="entry.id">
                  <td class="font-weight-bold">{{ entry.id }}</td>
                  <td>
                    <VChip
                      size="small"
                      :color="entry.type === 'PASSENGER' ? 'primary' : 'secondary'"
                    >
                      {{ entry.type }}
                    </VChip>
                  </td>
                  <td>{{ entry.description }}</td>
                  <td class="font-weight-bold text-success">
                    Rp {{ entry.amount?.toLocaleString('id-ID') }}
                  </td>
                  <td>{{ new Date(entry.date).toLocaleString('id-ID') }}</td>
                </tr>
                <tr v-if="ledgerEntries.length === 0">
                  <td colspan="5" class="text-center text-grey py-8">
                    Belum ada jurnal pembukuan transaksi lunas yang tercatat.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>

        <!-- Sales Agents performance -->
        <VCol cols="12" lg="4">
          <VCard border rounded="lg">
            <VCardTitle class="text-subtitle-1 font-weight-bold text-primary px-4 py-3">
              Kanal Penjualan / Agen Logistik
            </VCardTitle>
            <VTable class="w-full">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th>NAMA AGEN</th>
                  <th>TIPE AGEN</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="agent in agents" :key="agent.id">
                  <td class="font-weight-bold">{{ agent.agent_name }}</td>
                  <td>{{ agent.agent_type }}</td>
                  <td>
                    <VChip size="small" :color="agent.is_active ? 'success' : 'default'">
                      {{ agent.is_active ? 'AKTIF' : 'NON-AKTIF' }}
                    </VChip>
                  </td>
                </tr>
                <tr v-if="agents.length === 0">
                  <td colspan="3" class="text-center text-grey py-8">
                    Tidak ada agen komersial yang terdaftar.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>
    </div>
  </VContainer>
</template>
