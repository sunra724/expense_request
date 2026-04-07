"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export function normalizePdfFileName(fileName: string) {
  const safeName = fileName.trim().replace(/[<>:"/\\|?*]+/g, "-");
  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
}

export async function createPdfBlobFromElement(targetId: string) {
  const element = document.getElementById(targetId);
  if (!element) {
    throw new Error("PDF로 만들 인쇄 영역을 찾지 못했습니다.");
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgData = canvas.toDataURL("image/png");
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf.output("blob");
}
