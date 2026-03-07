export const toMoney = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const toDate = (d?: string | null) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toISOString().slice(0, 10);
};

export const daysOverdue = (due?: string | null) => {
  if (!due) return 0;
  const dd = new Date(due);
  if (Number.isNaN(dd.getTime())) return 0;
  const now = new Date();
  const diff = now.getTime() - dd.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
