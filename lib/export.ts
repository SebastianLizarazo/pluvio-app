import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Excel from 'exceljs';

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
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('Measurements');

  // Add headers
  worksheet.addRow([
    'id',
    'userId',
    'pluviometerId',
    'measuredAt',
    'volumeMl',
    'rainfallMm',
    'noRain',
    'elapsedMinutes',
    'observations',
    'behaviors',
  ]);

  // Add data rows
  rows.forEach((row) => {
    worksheet.addRow([
      row.id,
      row.userId,
      row.pluviometerId,
      row.measuredAt,
      row.volumeMl,
      row.rainfallMm,
      row.noRain,
      row.elapsedMinutes,
      row.observations ?? '',
      row.behaviors.join('|'),
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const path = `${FileSystem.cacheDirectory}pluvio-export.xlsx`;

  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(path);
};