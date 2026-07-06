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

/**
 * Fase 5.2: 'inline' = web-kamera i video-elementet (uændret siden 1.3);
 * 'native' = MLKit's eget scanner-UI tager over (Capacitor-skallen).
 */
export type ScannerSetup =
  | { mode: "inline"; scanner: Scanner; kind: ScannerKind }
  | { mode: "native"; scanOnce: () => Promise<string | null> };

export async function createScanner(): Promise<ScannerSetup> {
  const { isNative } = await import("../lib/platform");
  if (isNative()) {
    const { scanOnce } = await import("./mlkit");
    return { mode: "native", scanOnce };
  }
  if (nativeDetectorAvailable()) {
    const { BarcodeDetectorScanner } = await import("./barcode-detector");
    return { mode: "inline", scanner: new BarcodeDetectorScanner(), kind: "barcode-detector" };
  }
  const { ZxingScanner } = await import("./zxing");
  return { mode: "inline", scanner: new ZxingScanner(), kind: "zxing" };
}

export type { BarcodeDetectorLike, BarcodeDetectorCtor };
