"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const advancedColorPattern = /(oklch|oklab|lab|lch|color-mix|rgb\(from)/i;

function normalizePdfCssValue(
  property: string,
  value: string,
  resolverHost: HTMLElement,
  cache: Map<string, string>,
) {
  if (!advancedColorPattern.test(value)) return value;

  const cacheKey = `${property}__${value}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const probe = document.createElement("div");
  probe.style.all = "initial";
  probe.style.position = "fixed";
  probe.style.left = "-99999px";
  probe.style.top = "0";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";

  try {
    probe.style.setProperty(property, value);
    resolverHost.appendChild(probe);
    const resolved = window.getComputedStyle(probe).getPropertyValue(property) || value;
    cache.set(cacheKey, resolved);
    return resolved;
  } catch {
    return value;
  } finally {
    probe.remove();
  }
}

function copyComputedStyles(source: HTMLElement, target: HTMLElement, resolverHost: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  const cache = new Map<string, string>();

  Array.from(computedStyle).forEach((property) => {
    const value = computedStyle.getPropertyValue(property);
    const normalizedValue = normalizePdfCssValue(property, value, resolverHost, cache);

    target.style.setProperty(
      property,
      normalizedValue,
      computedStyle.getPropertyPriority(property),
    );
  });
}

function inlineTreeStyles(sourceRoot: HTMLElement, clonedRoot: HTMLElement, resolverHost: HTMLElement) {
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>("*"))];
  const clonedNodes = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>("*"))];

  sourceNodes.forEach((sourceNode, index) => {
    const clonedNode = clonedNodes[index];
    if (!clonedNode) return;
    copyComputedStyles(sourceNode, clonedNode, resolverHost);
  });
}

function createCaptureRoot(element: HTMLElement) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${Math.ceil(element.scrollWidth)}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.padding = "0";
  wrapper.style.margin = "0";
  wrapper.style.zIndex = "-1";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = `${element.id}__pdf_clone`;
  clone.style.margin = "0";
  clone.style.width = `${Math.ceil(element.scrollWidth)}px`;

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  inlineTreeStyles(element, clone, wrapper);

  return { wrapper, clone };
}

export function normalizePdfFileName(fileName: string) {
  const safeName = fileName.trim().replace(/[<>:"/\\|?*]+/g, "-");
  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
}

export async function createPdfBlobFromElement(targetId: string) {
  const element = document.getElementById(targetId);
  if (!element) {
    throw new Error("PDF로 만들 인쇄 영역을 찾지 못했습니다.");
  }

  const { wrapper, clone } = createCaptureRoot(element);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: clone.scrollWidth,
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
  } finally {
    wrapper.remove();
  }
}
