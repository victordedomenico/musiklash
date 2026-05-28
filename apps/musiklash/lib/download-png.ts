"use client";

import { toPng } from "html-to-image";

type DownloadPngOptions = {
  filename: string;
  backgroundColor?: string;
};

export async function downloadNodeAsPng(
  node: HTMLElement,
  { filename, backgroundColor }: DownloadPngOptions,
) {
  const computedBackground =
    backgroundColor?.startsWith("var(") &&
    typeof window !== "undefined" &&
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement)
          .getPropertyValue(backgroundColor.slice(4, -1).trim())
          .trim()
      : backgroundColor;

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: computedBackground,
    filter: (currentNode) => {
      if (!(currentNode instanceof Element)) return true;
      return !currentNode.classList.contains("no-export");
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
