import { NextResponse } from "next/server";
import { hasGoogleDriveUploadEnv, uploadPdfToGoogleDrive } from "@/lib/google-drive";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasGoogleDriveUploadEnv()) {
    return NextResponse.json(
      { error: "Google Drive 업로드 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const fileName = String(formData.get("fileName") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "업로드할 PDF 파일이 필요합니다." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uploaded = await uploadPdfToGoogleDrive(fileName || file.name, Buffer.from(arrayBuffer));

    return NextResponse.json({
      id: uploaded.id,
      name: uploaded.name,
      webViewLink: uploaded.webViewLink,
      webContentLink: uploaded.webContentLink,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Drive 업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
