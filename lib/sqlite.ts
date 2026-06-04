import * as SQLite from 'expo-sqlite';

import type { Measurement, MonthlyTotal } from '@/types/domain';

const db = SQLite.openDatabaseSync('pluvio.db');

export const initSQLite = (): void => {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS measurements (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      pluviometer_id TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      volume_ml REAL,
      rainfall_mm REAL NOT NULL,
      no_rain INTEGER NOT NULL DEFAULT 0,
      elapsed_minutes INTEGER,
      observations TEXT,
      behaviors TEXT NOT NULL DEFAULT '[]',
      synced INTEGER NOT NULL DEFAULT 0,
      local_id TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_synced ON measurements(synced);
    CREATE INDEX IF NOT EXISTS idx_measurements_measured_at ON measurements(measured_at);

    CREATE TABLE IF NOT EXISTS monthly_totals (
      id TEXT PRIMARY KEY NOT NULL,
      pluviometer_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      total_mm REAL NOT NULL DEFAULT 0,
      measurement_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(pluviometer_id, year, month)
    );
  `);
};

export const insertLocalMeasurement = (measurement: Measurement): void => {
  db.runSync(
    `
      INSERT OR REPLACE INTO measurements (
        id, user_id, pluviometer_id, measured_at, volume_ml, rainfall_mm, no_rain,
        elapsed_minutes, observations, behaviors, synced, local_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      measurement.id,
      measurement.userId,
      measurement.pluviometerId,
      measurement.measuredAt,
      measurement.volumeMl,
      measurement.rainfallMm,
      measurement.noRain ? 1 : 0,
      measurement.elapsedMinutes,
      measurement.observations,
      JSON.stringify(measurement.behaviors),
      measurement.synced ? 1 : 0,
      measurement.localId,
      measurement.createdAt,
      measurement.updatedAt,
    ],
  );
};

export const updateLocalMeasurement = (measurement: Measurement): void => {
  db.runSync(
    `
      UPDATE measurements SET
        measured_at = ?,
        volume_ml = ?,
        rainfall_mm = ?,
        no_rain = ?,
        elapsed_minutes = ?,
        observations = ?,
        behaviors = ?,
        synced = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      measurement.measuredAt,
      measurement.volumeMl,
      measurement.rainfallMm,
      measurement.noRain ? 1 : 0,
      measurement.elapsedMinutes,
      measurement.observations,
      JSON.stringify(measurement.behaviors),
      measurement.synced ? 1 : 0,
      measurement.updatedAt,
      measurement.id,
    ],
  );
};

export const getPendingMeasurementsByUser = (userId: string): Measurement[] => {
  const rows = db.getAllSync<{
    id: string;
    user_id: string;
    pluviometer_id: string;
    measured_at: string;
    volume_ml: number | null;
    rainfall_mm: number;
    no_rain: number;
    elapsed_minutes: number | null;
    observations: string | null;
    behaviors: string;
    synced: number;
    local_id: string | null;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM measurements WHERE synced = 0 AND user_id = ? ORDER BY measured_at ASC`, [userId]);

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    pluviometerId: row.pluviometer_id,
    measuredAt: row.measured_at,
    volumeMl: row.volume_ml,
    rainfallMm: row.rainfall_mm,
    noRain: row.no_rain === 1,
    elapsedMinutes: row.elapsed_minutes,
    observations: row.observations,
    behaviors: JSON.parse(row.behaviors) as Measurement['behaviors'],
    synced: row.synced === 1,
    localId: row.local_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const getLocalMeasurementsByUser = (userId: string): Measurement[] => {
  const rows = db.getAllSync<{
    id: string;
    user_id: string;
    pluviometer_id: string;
    measured_at: string;
    volume_ml: number | null;
    rainfall_mm: number;
    no_rain: number;
    elapsed_minutes: number | null;
    observations: string | null;
    behaviors: string;
    synced: number;
    local_id: string | null;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM measurements WHERE user_id = ? ORDER BY measured_at DESC`, [userId]);

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    pluviometerId: row.pluviometer_id,
    measuredAt: row.measured_at,
    volumeMl: row.volume_ml,
    rainfallMm: row.rainfall_mm,
    noRain: row.no_rain === 1,
    elapsedMinutes: row.elapsed_minutes,
    observations: row.observations,
    behaviors: JSON.parse(row.behaviors) as Measurement['behaviors'],
    synced: row.synced === 1,
    localId: row.local_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const markMeasurementsAsSynced = (ids: string[]): void => {
  if (!ids.length) return;

  const placeholders = ids.map(() => '?').join(', ');
  db.runSync(`UPDATE measurements SET synced = 1 WHERE id IN (${placeholders})`, ids);
};

export const clearLocalMeasurementsByUser = (userId: string): void => {
  db.runSync(`DELETE FROM measurements WHERE user_id = ?`, [userId]);
};

export const getLatestLocalMeasurement = (pluviometerId: string): Measurement | null => {
  const row = db.getFirstSync<{
    id: string;
    user_id: string;
    pluviometer_id: string;
    measured_at: string;
    volume_ml: number | null;
    rainfall_mm: number;
    no_rain: number;
    elapsed_minutes: number | null;
    observations: string | null;
    behaviors: string;
    synced: number;
    local_id: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM measurements WHERE pluviometer_id = ? ORDER BY measured_at DESC LIMIT 1`,
    [pluviometerId],
  );

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    pluviometerId: row.pluviometer_id,
    measuredAt: row.measured_at,
    volumeMl: row.volume_ml,
    rainfallMm: row.rainfall_mm,
    noRain: row.no_rain === 1,
    elapsedMinutes: row.elapsed_minutes,
    observations: row.observations,
    behaviors: JSON.parse(row.behaviors) as Measurement['behaviors'],
    synced: row.synced === 1,
    localId: row.local_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const upsertMonthlyTotalLocal = (total: MonthlyTotal): void => {
  db.runSync(
    `
      INSERT INTO monthly_totals (id, pluviometer_id, year, month, total_mm, measurement_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(pluviometer_id, year, month)
      DO UPDATE SET total_mm = excluded.total_mm, measurement_count = excluded.measurement_count
    `,
    [
      total.id,
      total.pluviometerId,
      total.year,
      total.month,
      total.totalMm,
      total.measurementCount,
    ],
  );
};
