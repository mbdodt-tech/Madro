/**
 * Scanner-kontrakten (fase-tjekliste 1.3). Fase 5 erstatter
 * web-implementeringerne med Capacitor/MLKit UDEN API-ændringer —
 * alt uden for denne mappe kender kun dette interface.
 */

export interface Scanner {
  /** Starter kameraet i det givne video-element og kalder onDetect ved fund. */
  start(video: HTMLVideoElement, onDetect: (barcode: string) => void): Promise<void>;
  /** Stopper kamera og detektion; skal kunne kaldes flere gange. */
  stop(): void;
}

export type ScannerKind = "barcode-detector" | "zxing";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

export function nativeDetectorAvailable(): boolean {
  return typeof (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector ===
    "function";
}

export async function createScanner(): Promise<{ scanner: Scanner; kind: ScannerKind }> {
  if (nativeDetectorAvailable()) {
    const { BarcodeDetectorScanner } = await import("./barcode-detector");
    return { scanner: new BarcodeDetectorScanner(), kind: "barcode-detector" };
  }
  const { ZxingScanner } = await import("./zxing");
  return { scanner: new ZxingScanner(), kind: "zxing" };
}

export type { BarcodeDetectorLike, BarcodeDetectorCtor };
