import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import type { Measurement } from '@/types/domain';

const toCsv = (rows: Measurement[]): string => {
  const header = 'id,user_id,pluviometer_id,measured_at,volume_ml,rainfall_mm,no_rain,elapsed_minutes,observations,behaviors';
  const lines = rows.map((row) =>
    [
      row.id,
      row.userId,
      row.pluviometerId,
      row.measuredAt,
      row.volumeMl ?? '',
      row.rainfallMm,
      row.noRain,
      row.elapsedMinutes ?? '',
      row.observations ?? '',
      row.behaviors.join('|'),
    ]
      .map((item) => `"${String(item).replace(/"/g, '""')}"`)
      .join(','),
  );

  return [header, ...lines].join('\n');
};

export const exportMeasurementsCsv = async (rows: Measurement[]): Promise<void> => {
  const csv = toCsv(rows);
  const path = `${FileSystem.cacheDirectory}pluvio-export.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path);
};

export const exportMeasurementsXlsx = async (rows: Measurement[]): Promise<void> => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Measurements');

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const path = `${FileSystem.cacheDirectory}pluvio-export.xlsx`;

  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(path);
};
