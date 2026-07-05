import type {
  BarcodeDetectorCtor,
  Scanner,
} from "./scanner";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

/** Native BarcodeDetector (Chrome/Android — hurtigst, ingen ekstra kode). */
export class BarcodeDetectorScanner implements Scanner {
  private stream: MediaStream | null = null;
  private running = false;

  async start(
    video: HTMLVideoElement,
    onDetect: (barcode: string) => void,
  ): Promise<void> {
    const Detector = (globalThis as unknown as { BarcodeDetector: BarcodeDetectorCtor })
      .BarcodeDetector;
    const supported = await Detector.getSupportedFormats();
    const formats = FORMATS.filter((f) => supported.includes(f));
    const detector = new Detector({ formats: formats.length ? formats : undefined });

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    video.srcObject = this.stream;
    await video.play();
    this.running = true;

    const tick = async () => {
      if (!this.running) return;
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          const hit = codes.find((c) => c.rawValue && /^\d{4,14}$/.test(c.rawValue));
          if (hit && this.running) {
            onDetect(hit.rawValue);
            return; // stop loop — ScanPage kalder stop()
          }
        } catch {
          // enkelte frames kan fejle — fortsæt
        }
      }
      requestAnimationFrame(() => void tick());
    };
    requestAnimationFrame(() => void tick());
  }

  stop(): void {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
