"use client";

export default function PrintButton({ label = "인쇄" }: { label?: string }) {
  return (
    <button className="btn btn-primary" onClick={() => window.print()}>
      {label}
    </button>
  );
}
