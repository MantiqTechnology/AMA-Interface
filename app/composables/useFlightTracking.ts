// composables/useFlightTracking.ts
//import { ref, computed } from 'vue'

export interface ActiveFlight {
  id: string
  callsign: string
  registration: string
  lastLkp: string
  lastPingTime: Date // Timestamp update radar terakhir
  status: 'NORMAL' | 'WARNING' | 'DISTRESS'
}

const activeFlights = ref<ActiveFlight[]>([
  {
    id: 'FL-001',
    callsign: 'AMA1264',
    registration: 'PK-AMA',
    lastLkp: "04°05'S 138°56'E at 10,500 ft",
    lastPingTime: new Date(Date.now() - 12 * 60 * 1000), // 12 menit lalu (Trigger Warning)
    status: 'WARNING'
  }
])

// Computed untuk mendapatkan daftar pesawat yang telat radar ping (10 - 15 menit)
export const overdueFlights = computed(() => {
  const NOW = Date.now()
  return activeFlights.value.filter(flight => {
    const minutesSinceLastPing = (NOW - new Date(flight.lastPingTime).getTime()) / (1000 * 60)
    return minutesSinceLastPing >= 10 && flight.status !== 'DISTRESS'
  })
})

export const hasYellowAlert = computed(() => overdueFlights.value.length > 0)