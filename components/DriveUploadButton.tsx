"use client";

import { useState } from "react";
import { createPdfBlobFromElement, normalizePdfFileName } from "@/lib/browser-pdf";

export default function DriveUploadButton({
  targetId,
  documentTitle,
}: {
  targetId: string;
  documentTitle: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    try {
      setUploading(true);
      const blob = await createPdfBlobFromElement(targetId);
      const fileName = normalizePdfFileName(documentTitle);
      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("fileName", fileName);

      const response = await fetch("/api/drive/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { error?: string; webViewLink?: string };
      if (!response.ok) {
        throw new Error(result.error || "Google Drive 업로드에 실패했습니다.");
      }

      window.alert("공유드라이브 업로드가 완료되었습니다.");
      if (result.webViewLink) {
        window.open(result.webViewLink, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Drive 업로드에 실패했습니다.";
      window.alert(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <button className="btn btn-secondary" onClick={handleUpload} disabled={uploading}>
      {uploading ? "업로드 중..." : "공유드라이브 업로드"}
    </button>
  );
}
