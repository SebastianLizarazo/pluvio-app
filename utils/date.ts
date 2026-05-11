export const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const getYearMonth = (value: Date): { year: number; month: number } => ({
  year: value.getUTCFullYear(),
  month: value.getUTCMonth() + 1,
});

export const isSameDay = (left: Date, right: Date): boolean => {
  return toIsoDate(left) === toIsoDate(right);
};
