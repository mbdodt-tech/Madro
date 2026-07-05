import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import type { Scanner } from "./scanner";

/** ZXing-fallback (Safari/Firefox uden BarcodeDetector). */
export class ZxingScanner implements Scanner {
  private controls: IScannerControls | null = null;

  async start(
    video: HTMLVideoElement,
    onDetect: (barcode: string) => void,
  ): Promise<void> {
    const reader = new BrowserMultiFormatReader();
    this.controls = await reader.decodeFromConstraints(
      { video: { facingMode: "environment" }, audio: false },
      video,
      (result) => {
        const text = result?.getText();
        if (text && /^\d{4,14}$/.test(text)) {
          onDetect(text);
        }
      },
    );
  }

  stop(): void {
    this.controls?.stop();
    this.controls = null;
  }
}
