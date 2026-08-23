"use client";

import Papa from "papaparse";
import { useEffect, useState } from "react";

type Props = {
  file: string | undefined;
};

const CsvComponent = ({ file }: Props) => {
  const [tableRows, setTableRows] = useState<string[]>([]);
  const [values, setValues] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;

    setError(null);

    Papa.parse(file, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors?.length) {
          console.error("CSV parse errors:", results.errors);
        }

        const rows = results.data as Record<string, string>[];
        if (!rows.length) {
          setTableRows([]);
          setValues([]);
          return;
        }

        const headers = Object.keys(rows[0] ?? {});
        const vals = rows.map((row) => headers.map((h) => row[h] ?? ""));

        setTableRows(headers);
        setValues(vals);
      },
      error: (err) => {
        console.error("CSV parse failed:", err);
        setError("Failed to parse comments file.");
      },
    });
  }, [file]);

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!tableRows.length) {
    return (
      <p className="text-sm text-muted-foreground">No comments to display.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {tableRows.map((header, index) => (
              <th
                key={index}
                className="text-left p-2 border-b font-medium sticky top-0 bg-background"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((row, index) => (
            <tr key={index} className="border-b last:border-0">
              {row.map((val, i) => (
                <td className="p-2 align-top" key={i}>
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CsvComponent;
