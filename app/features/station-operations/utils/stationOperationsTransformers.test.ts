import { describe, expect, it } from 'vitest';
import type { ApiStationFlight } from '../types/stationOperations';
import { flattenStationTasks } from './stationOperationsTransformers';

describe('station operations transformers', () => {
  it('filters station tasks using the master-data id instead of deriving it from the code', () => {
    const flight = {
      flightId: 'flight-1',
      flightNumber: 'AMA101',
      tasks: [
        { id: 'task-djj', stationId: 'station-master-djj' },
        { id: 'task-wmx', stationId: 'station-master-wmx' }
      ]
    } as ApiStationFlight;

    expect(flattenStationTasks('station-master-djj', [flight])).toEqual([
      expect.objectContaining({
        id: 'task-djj',
        flightId: 'flight-1',
        flightNumber: 'AMA101'
      })
    ]);
  });
});
