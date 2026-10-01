import QRCode from "qrcode";

export interface QrOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export async function renderQrToCanvas(canvas: HTMLCanvasElement, url: string, options: QrOptions = {}): Promise<void> {
  await QRCode.toCanvas(canvas, url, {
    width: options.width ?? 240,
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
    color: { dark: "#111827", light: "#ffffff" },
  });
}

export function createReplacePrompt(message = "This device already has progress. Replace it with the transferred state?"): () => boolean {
  return () => globalThis.confirm(message);
}
