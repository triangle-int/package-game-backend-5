import { Injectable } from '@nestjs/common';
import { GameConfigService } from '../game-config/game-config.service';
import Geohex from 'geohex';
import _ from 'lodash';

@Injectable()
export class MathService {
  constructor(private config: GameConfigService) {}

  random(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  round(number: number, precision: number) {
    const power = Math.pow(10, precision);
    return Math.round((number + Number.EPSILON) * power) / power;
  }

  getCell(lat: number, lng: number) {
    return Geohex.getCellByLocation(
      lat,
      lng,
      this.config.config.buildingsCellLevel,
    );
  }

  getNeighbours(hex: string) {
    const { x, y } = Geohex.getXYByCode(hex);
    const zoom = this.config.config.buildingsCellLevel;

    return [
      Geohex.getCellByXY(x + 1, y + 1, zoom).code,
      Geohex.getCellByXY(x + 1, y, zoom).code,
      Geohex.getCellByXY(x, y - 1, zoom).code,
      Geohex.getCellByXY(x - 1, y - 1, zoom).code,
      Geohex.getCellByXY(x - 1, y, zoom).code,
      Geohex.getCellByXY(x, y + 1, zoom).code,
    ];
  }

  getCellsInRadius(hex: string, radius: number) {
    const neighbours = [hex];
    let cellsToProcess = [hex];

    for (let i = 0; i < radius; i++) {
      const newCells = [];

      for (const hex of cellsToProcess) {
        for (const neighbour of this.getNeighbours(hex)) {
          if (!_.includes(neighbours, neighbour)) {
            neighbours.push(neighbour);
            newCells.push(neighbour);
          }
        }
      }

      cellsToProcess = newCells;
    }

    return neighbours;
  }

  centerCoords(lat: number, lng: number) {
    const cell = this.getCell(lat, lng);
    return { lat: cell.lat, lng: cell.lon };
  }

  get deg2rad() {
    return Math.PI / 180;
  }

  get rad2deg() {
    return 180 / Math.PI;
  }

  coordsToVector(coords: Coords): Vector3 {
    const lat = coords.lat * this.deg2rad;
    const lng = coords.lng * this.deg2rad;

    return new Vector3(
      Math.cos(lng) * Math.cos(lat),
      Math.sin(lat),
      Math.sin(lng) * Math.cos(lat),
    );
  }

  vectorToCoords(vector: Vector3): Coords {
    const normalized = vector.normalized;
    const lat = Math.asin(normalized.y);
    const lng = Math.atan2(normalized.z, normalized.x);

    return {
      lat: lat * this.rad2deg,
      lng: lng * this.rad2deg,
    };
  }

  randomVectorInCone(direction: Vector3, angle: number): Vector3 {
    const dirz = direction.normalized;
    const dirx = dirz.cross(
      Math.abs(dirz.x) < 0.5 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0),
    ).normalized;
    const diry = dirz.cross(dirx);

    const z = Math.random() * (1 - Math.cos(angle)) + Math.cos(angle);
    const r = Math.sqrt(1 - z * z);
    const angle2 = Math.random() * Math.PI * 2;
    const x = r * Math.cos(angle2);
    const y = r * Math.sin(angle2);

    return dirx.mul(x).add(diry.mul(y).add(dirz.mul(z)));
  }

  randomPointFromCoords(
    coords: {
      lat: number;
      lng: number;
    },
    radius: number,
  ): Coords {
    return this.vectorToCoords(
      this.randomVectorInCone(
        this.coordsToVector(coords),
        radius / this.config.config.planetRadius,
      ),
    );
  }

  getDistanceBetweenCoords(coords1: Coords, coords2: Coords) {
    const lat1 = coords1.lat * this.deg2rad;
    const lng1 = coords1.lng * this.deg2rad;
    const lat2 = coords2.lat * this.deg2rad;
    const lng2 = coords2.lng * this.deg2rad;

    const dlong = lng2 - lng1;
    const dlat = lat2 - lat1;

    return (
      this.config.config.planetRadius *
      2 *
      Math.asin(
        Math.sqrt(
          Math.pow(Math.sin(dlat / 2), 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlong / 2), 2),
        ),
      )
    );
  }

  min(a: bigint, b: bigint) {
    return a < b ? a : b;
  }

  max(a: bigint, b: bigint) {
    return a > b ? a : b;
  }
}

export interface Coords {
  lat: number;
  lng: number;
}

export class Vector3 {
  x = 0;
  y = 0;
  z = 0;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static get zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  get sqrLength(): number {
    return this.dot(this);
  }

  get length(): number {
    return Math.sqrt(this.sqrLength);
  }

  get normalized(): Vector3 {
    return this.div(this.length);
  }

  add(other: Vector3): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  sub(other: Vector3): Vector3 {
    return this.add(other.mul(-1));
  }

  mul(other: number): Vector3 {
    return new Vector3(this.x * other, this.y * other, this.z * other);
  }

  div(other: number): Vector3 {
    return this.mul(1 / other);
  }

  dot(other: Vector3): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  cross(other: Vector3): Vector3 {
    return new Vector3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x,
    );
  }
}
