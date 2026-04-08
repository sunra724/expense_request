"use client";

import { useState } from "react";
import { createPdfBlobFromElement, normalizePdfFileName } from "@/lib/browser-pdf";

type UploadTarget = {
  targetId: string;
  documentTitle: string;
};

export default function DriveUploadButton({
  targetId,
  documentTitle,
  uploads,
}: {
  targetId?: string;
  documentTitle?: string;
  uploads?: UploadTarget[];
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    try {
      setUploading(true);

      const uploadTargets =
        uploads && uploads.length
          ? uploads
          : targetId && documentTitle
            ? [{ targetId, documentTitle }]
            : [];

      if (!uploadTargets.length) {
        throw new Error("업로드할 문서를 찾지 못했습니다.");
      }

      const uploadedLinks: string[] = [];

      for (const target of uploadTargets) {
        const blob = await createPdfBlobFromElement(target.targetId);
        const fileName = normalizePdfFileName(target.documentTitle);
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

        if (result.webViewLink) {
          uploadedLinks.push(result.webViewLink);
        }
      }

      window.alert(
        uploadTargets.length > 1
          ? `공유드라이브 업로드가 완료되었습니다. (${uploadTargets.length}개 파일)`
          : "공유드라이브 업로드가 완료되었습니다.",
      );

      if (uploadedLinks[0]) {
        window.open(uploadedLinks[0], "_blank", "noopener,noreferrer");
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
