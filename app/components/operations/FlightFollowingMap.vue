<script setup lang="ts">
import {
  AttributionControl,
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { OperationalFlightMonitorDto } from '#shared/contracts/operations-monitoring';

const props = defineProps<{
  flights: OperationalFlightMonitorDto[];
  selectedFlightId: string | null;
}>();

const emit = defineEmits<{
  select: [flightId: string];
}>();

const mapElement = ref<HTMLElement | null>(null);
let map: MapLibreMap | null = null;
let markers: Marker[] = [];

const mappableFlights = computed(() =>
  props.flights.filter((flight: OperationalFlightMonitorDto) => flight.position)
);

function routeData() {
  return {
    type: 'FeatureCollection',
    features: props.flights
      .filter(
        (flight: OperationalFlightMonitorDto) =>
          flight.originLatitude !== null &&
          flight.originLongitude !== null &&
          flight.destinationLatitude !== null &&
          flight.destinationLongitude !== null
      )
      .map((flight: OperationalFlightMonitorDto) => ({
        type: 'Feature',
        properties: {
          selected: flight.id === props.selectedFlightId ? 1 : 0
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [flight.originLongitude!, flight.originLatitude!],
            [flight.destinationLongitude!, flight.destinationLatitude!]
          ]
        }
      }))
  };
}

function renderMarkers() {
  if (!map) return;
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
      new Marker({ element, anchor: 'center' })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map)
    );
  }
}

function fitFleet() {
  if (!map) return;
  const coordinates = props.flights.flatMap((flight: OperationalFlightMonitorDto) => {
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
    (result: LngLatBounds, coordinate: [number, number]) => result.extend(coordinate),
    new LngLatBounds(coordinates[0], coordinates[0])
  );
  map.fitBounds(bounds, { padding: 56, maxZoom: 9, duration: 500 });
}

function focusSelected() {
  if (!map || !props.selectedFlightId) return;
  const flight = props.flights.find(
    (item: OperationalFlightMonitorDto) => item.id === props.selectedFlightId
  );
  if (!flight?.position) return;
  map.easeTo({
    center: [flight.position.longitude, flight.position.latitude],
    zoom: Math.max(map.getZoom(), 8),
    duration: 500
  });
}

onMounted(() => {
  if (!mapElement.value) return;
  const mapInstance = new MapLibreMap({
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
  mapInstance.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
  mapInstance.addControl(
    new AttributionControl({ compact: true, customAttribution: 'Demo telemetry' }),
    'bottom-left'
  );
  mapInstance.on('load', () => {
    map?.addSource('flight-routes', { type: 'geojson', data: routeData() });
    map?.addLayer({
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
  });
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
  <div ref="mapElement" class="flight-map" />
</template>

<style>
.flight-map {
  width: 100%;
  height: 100%;
  min-height: 420px;
  background: #dfe9e8;
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
