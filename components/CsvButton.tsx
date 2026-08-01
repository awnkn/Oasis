"use client";

export default function CsvButton({
  filename,
  header,
  rows,
  label,
}: {
  filename: string;
  header: string[];
  rows: (string | number)[][];
  label: string;
}) {
  function download() {
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...rows]
      .map((r) => r.map(escape).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="rounded-full border border-oasis-300 bg-white px-4 py-1.5 text-xs font-medium text-oasis-700 transition hover:border-oasis-500"
    >
      {label}
    </button>
  );
}
