export const toIsoDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYearMonth = (value: Date): { year: number; month: number } => ({
  year: value.getUTCFullYear(),
  month: value.getUTCMonth() + 1,
});

export const isSameDay = (left: Date, right: Date): boolean => {
  return toIsoDate(left) === toIsoDate(right);
};
