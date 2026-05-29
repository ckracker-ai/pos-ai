/** Exporta filas a CSV compatible con Excel (UTF-8 con BOM). */
export function exportRowsToExcel(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const escape = (value: string | number) => {
    const str = String(value ?? '');
    if (/[",;\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [headers.map(escape).join(';'), ...rows.map((row) => row.map(escape).join(';'))];
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
