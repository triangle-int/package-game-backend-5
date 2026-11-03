import type { GameConfigService } from '../game-config/game-config.service';
import { MathService, Vector3 } from './math.service';

const service = new MathService({
  config: { planetRadius: 6371000, buildingsCellLevel: 10 },
} as GameConfigService);

describe('MathService geography and resource arithmetic', () => {
  it('calculates zero and quarter-circumference route distances', () => {
    expect(
      service.getDistanceBetweenCoords({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }),
    ).toBe(0);
    expect(
      service.getDistanceBetweenCoords({ lat: 0, lng: 0 }, { lat: 0, lng: 90 }),
    ).toBeCloseTo((Math.PI * 6371000) / 2, 3);
  });

  it('round-trips map coordinates through a unit vector', () => {
    const coords = { lat: 51.5, lng: -0.12 };
    const vector = service.coordsToVector(coords);
    expect(vector.length).toBeCloseTo(1, 10);
    const restored = service.vectorToCoords(vector);
    expect(restored.lat).toBeCloseTo(coords.lat, 8);
    expect(restored.lng).toBeCloseTo(coords.lng, 8);
  });

  it('keeps generated delivery points within the requested radius', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const origin = { lat: 51.5, lng: -0.12 };
      const generated = service.randomPointFromCoords(origin, 1000);
      expect(service.getDistanceBetweenCoords(origin, generated)).toBeLessThanOrEqual(
        1000,
      );
    } finally {
      random.mockRestore();
    }
  });

  it('finds a hex cell and its immediate neighboring cells without duplicates', () => {
    const cell = service.getCell(51.5, -0.12);
    const neighbors = service.getNeighbours(cell.code);
    const radiusZero = service.getCellsInRadius(cell.code, 0);
    const radiusOne = service.getCellsInRadius(cell.code, 1);

    expect(radiusZero).toEqual([cell.code]);
    expect(neighbors).toHaveLength(6);
    expect(new Set(radiusOne).size).toBe(7);
    expect(radiusOne).toEqual(expect.arrayContaining(neighbors));
    expect(service.centerCoords(51.5, -0.12)).toEqual({
      lat: cell.lat,
      lng: cell.lon,
    });
  });

  it('compares bigint stock and preserves rounding precision', () => {
    expect(service.min(BigInt(2), BigInt(5))).toBe(BigInt(2));
    expect(service.min(BigInt(5), BigInt(2))).toBe(BigInt(2));
    expect(service.max(BigInt(2), BigInt(5))).toBe(BigInt(5));
    expect(service.max(BigInt(5), BigInt(2))).toBe(BigInt(5));
    expect(service.round(1.234, 2)).toBe(1.23);
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      expect(service.random(10, 20)).toBe(15);
    } finally {
      random.mockRestore();
    }
  });
});

describe('Vector3 operations used in map route geometry', () => {
  it('preserves vector arithmetic and orthogonality', () => {
    const x = new Vector3(1, 0, 0);
    const y = new Vector3(0, 1, 0);
    expect(Vector3.zero).toEqual(new Vector3(0, 0, 0));
    expect(x.add(y)).toEqual(new Vector3(1, 1, 0));
    expect(x.sub(y)).toEqual(new Vector3(1, -1, 0));
    expect(x.mul(3).div(3)).toEqual(x);
    expect(x.dot(y)).toBe(0);
    expect(x.cross(y)).toEqual(new Vector3(0, 0, 1));
    expect(new Vector3(3, 4, 0).sqrLength).toBe(25);
    expect(new Vector3(3, 4, 0).normalized.length).toBeCloseTo(1, 10);
  });
});
