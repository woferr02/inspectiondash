/**
 * CSV export utility – converts an array of objects into a downloadable CSV file.
 */

type CsvColumn<T> = {
  header: string;
  value: (item: T) => string | number | null | undefined;
};

export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: CsvColumn<T>[]
) {
  if (data.length === 0) return;

  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const rows = data.map((item) =>
    columns
      .map((c) => {
        const raw = c.value(item);
        return escape(raw == null ? "" : String(raw));
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
