"use client";

import { useEffect } from "react";

export default function PrintButton({
  label = "PDF 저장 / 인쇄",
  documentTitle,
}: {
  label?: string;
  documentTitle?: string;
}) {
  useEffect(() => {
    if (!documentTitle) return;

    const previousTitle = document.title;
    document.title = documentTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [documentTitle]);

  return (
    <button className="btn btn-primary" onClick={() => window.print()}>
      {label}
    </button>
  );
}
