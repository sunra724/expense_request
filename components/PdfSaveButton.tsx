"use client";

import { useState } from "react";
import { createPdfBlobFromElement, normalizePdfFileName } from "@/lib/browser-pdf";

export default function PdfSaveButton({
  targetId,
  documentTitle,
}: {
  targetId: string;
  documentTitle: string;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    try {
      setSaving(true);
      const blob = await createPdfBlobFromElement(targetId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = normalizePdfFileName(documentTitle);
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF 저장에 실패했습니다.";
      window.alert(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
      {saving ? "PDF 생성 중..." : "PDF 저장"}
    </button>
  );
}
