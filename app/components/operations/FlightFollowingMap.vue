<script setup lang="ts">
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { OperationalFlightMonitorDto } from '#shared/contracts/operations-monitoring';

const props = defineProps<{
  flights: OperationalFlightMonitorDto[];
  selectedFlightId: string | null;
}>();
const emit = defineEmits<{ select: [flightId: string] }>();
const mapElement = ref<HTMLElement | null>(null);
const mapState = ref<'loading' | 'ready' | 'error'>('loading');
const basemapUnavailable = ref(false);
let map: MapLibreMap | null = null;
let maplibre: typeof import('maplibre-gl') | null = null;
let markers: Marker[] = [];

const mappableFlights = computed(() => props.flights.filter((flight) => flight.position));

function routeData() {
  return {
    type: 'FeatureCollection' as const,
    features: props.flights
      .filter(
        (flight) =>
          flight.originLatitude !== null &&
          flight.originLongitude !== null &&
          flight.destinationLatitude !== null &&
          flight.destinationLongitude !== null
      )
      .map((flight) => ({
        type: 'Feature' as const,
        properties: { selected: flight.id === props.selectedFlightId ? 1 : 0 },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [flight.originLongitude!, flight.originLatitude!],
            [flight.destinationLongitude!, flight.destinationLatitude!]
          ]
        }
      }))
  };
}

function renderMarkers() {
  if (!map || !maplibre) return;
  markers.forEach((marker) => marker.remove());
  markers = [];
  for (const flight of mappableFlights.value) {
    const position = flight.position!;
    const element = document.createElement('button');
    element.type = 'button';
    element.className = [
      'aircraft-map-marker',
      position.isStale ? 'is-stale' : '',
      flight.id === props.selectedFlightId ? 'is-selected' : ''
    ]
      .filter(Boolean)
      .join(' ');
    element.setAttribute(
      'aria-label',
      `${flight.aircraftRegistration ?? flight.flightNumber}, ${position.positionStatus}`
    );
    element.title = `${flight.flightNumber} · ${flight.aircraftRegistration ?? 'Unassigned'}`;
    element.innerHTML =
      '<span class="aircraft-map-marker__pulse"></span><span class="aircraft-map-marker__body"><i class="mdi mdi-airplane"></i></span>';
    element.style.transform = `rotate(${position.headingDeg ?? 0}deg)`;
    element.addEventListener('click', () => emit('select', flight.id));
    markers.push(
      new maplibre.Marker({ element, anchor: 'center' })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map)
    );
  }
}

function fitFleet() {
  if (!map || !maplibre) return;
  const coordinates = props.flights.flatMap((flight) => {
    const points: Array<[number, number]> = [];
    if (flight.position) points.push([flight.position.longitude, flight.position.latitude]);
    if (flight.originLatitude !== null && flight.originLongitude !== null) {
      points.push([flight.originLongitude, flight.originLatitude]);
    }
    if (flight.destinationLatitude !== null && flight.destinationLongitude !== null) {
      points.push([flight.destinationLongitude, flight.destinationLatitude]);
    }
    return points;
  });
  if (!coordinates.length) return;
  const bounds = coordinates.reduce(
    (result, coordinate) => result.extend(coordinate),
    new maplibre.LngLatBounds(coordinates[0], coordinates[0])
  );
  map.fitBounds(bounds, { padding: 56, maxZoom: 9, duration: 500 });
}

function focusSelected() {
  if (!map || !props.selectedFlightId) return;
  const flight = props.flights.find((item) => item.id === props.selectedFlightId);
  if (!flight?.position) return;
  map.easeTo({
    center: [flight.position.longitude, flight.position.latitude],
    zoom: Math.max(map.getZoom(), 8),
    duration: 500
  });
}

onMounted(async () => {
  if (!mapElement.value) return;
  try {
    // This package starts a browser WebGL worker; defer evaluation until client mount.
    maplibre = await import('maplibre-gl');
    await import('maplibre-gl/dist/maplibre-gl.css');
    const mapInstance = new maplibre.Map({
      container: mapElement.value,
      center: [139.5, -4],
      zoom: 6,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          { id: 'map-background', type: 'background', paint: { 'background-color': '#dfe9e8' } },
          { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.72 } }
        ]
      }
    });
    map = mapInstance;
    mapInstance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'bottom-right');
    mapInstance.addControl(
      new maplibre.AttributionControl({ compact: true, customAttribution: 'Demo telemetry' }),
      'bottom-left'
    );
    // `style.load` does not wait for the remote basemap tiles, unlike `load`.
    mapInstance.once('style.load', () => {
      mapInstance.addSource('flight-routes', { type: 'geojson', data: routeData() });
      mapInstance.addLayer({
        id: 'flight-routes-base',
        type: 'line',
        source: 'flight-routes',
        paint: {
          'line-color': ['case', ['==', ['get', 'selected'], 1], '#f47a1f', '#286e9e'],
          'line-width': ['case', ['==', ['get', 'selected'], 1], 4, 2],
          'line-opacity': ['case', ['==', ['get', 'selected'], 1], 0.95, 0.42],
          'line-dasharray': [2, 2]
        }
      });
      renderMarkers();
      fitFleet();
      mapState.value = 'ready';
    });
    mapInstance.on('error', () => {
      basemapUnavailable.value = true;
    });
  } catch (error) {
    console.error('Flight Following MapLibre failed to initialise.', error);
    mapState.value = 'error';
  }
});

watch(
  () => [props.flights, props.selectedFlightId],
  () => {
    if (!map?.isStyleLoaded()) return;
    (map.getSource('flight-routes') as GeoJSONSource | undefined)?.setData(routeData());
    renderMarkers();
    if (props.selectedFlightId) focusSelected();
    else fitFleet();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  markers.forEach((marker) => marker.remove());
  map?.remove();
});

defineExpose({ fitFleet });
</script>

<template>
  <div class="flight-map-wrap">
    <div ref="mapElement" class="flight-map" />
    <div v-if="mapState === 'loading'" class="map-status" role="status">
      Loading map and flight telemetry…
    </div>
    <div v-else-if="mapState === 'error'" class="map-status map-status--error" role="alert">
      Map could not initialise. Reload this page and check WebGL availability.
    </div>
    <div v-else-if="basemapUnavailable" class="map-status map-status--warning" role="status">
      Basemap unavailable — flight positions are still shown.
    </div>
  </div>
</template>

<style>
.flight-map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
}
.flight-map {
  width: 100%;
  height: 100%;
  min-height: 420px;
  background: #dfe9e8;
}
.map-status {
  position: absolute;
  z-index: 2;
  right: 12px;
  bottom: 12px;
  max-width: calc(100% - 24px);
  padding: 7px 10px;
  border: 1px solid rgb(255 255 255 / 70%);
  border-radius: 6px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 2px 8px rgb(18 33 31 / 10%);
  color: #334846;
  font-size: 0.72rem;
}
.map-status--warning {
  color: #76530b;
}
.map-status--error {
  color: #9c2525;
}
.aircraft-map-marker {
  position: relative;
  width: 42px;
  height: 42px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.aircraft-map-marker__body {
  position: absolute;
  inset: 7px;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #0e8c8a;
  box-shadow: 0 3px 9px rgb(8 43 73 / 28%);
  color: #fff;
  font-size: 17px;
}
.aircraft-map-marker__pulse {
  position: absolute;
  inset: 1px;
  border: 2px solid rgb(14 140 138 / 55%);
  border-radius: 50%;
  animation: aircraft-position-pulse 2s ease-out infinite;
}
.aircraft-map-marker.is-selected .aircraft-map-marker__body {
  background: #f47a1f;
}
.aircraft-map-marker.is-selected .aircraft-map-marker__pulse {
  border-color: rgb(244 122 31 / 65%);
}
.aircraft-map-marker.is-stale .aircraft-map-marker__body {
  background: #7a8586;
}
.aircraft-map-marker.is-stale .aircraft-map-marker__pulse {
  animation: none;
  border-color: rgb(122 133 134 / 45%);
}
@keyframes aircraft-position-pulse {
  from {
    opacity: 0.9;
    transform: scale(0.55);
  }
  to {
    opacity: 0;
    transform: scale(1.25);
  }
}
</style>
