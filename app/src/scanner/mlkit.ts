import {
  BarcodeFormat,
  BarcodeScanner,
} from "@capacitor-mlkit/barcode-scanning";

/**
 * Native stregkodescanning (fase 5.2) — MLKit's færdige scanner-UI
 * tager over for viewfinderen (kontraktens 'native'-tilstand).
 *
 * OBS: kan ikke køres på denne udviklingsmaskine — enhedstest på
 * telefon er FØRSTE punkt i testperiode-tjeklisten (docs/native.md).
 */
export async function scanOnce(): Promise<string | null> {
  const permission = await BarcodeScanner.requestPermissions();
  if (permission.camera !== "granted" && permission.camera !== "limited") {
    throw new Error("camera_denied");
  }

  // Android leverer scanner-UI'et via et Google-modul, der kan mangle
  // ved første kørsel; metoden findes ikke på iOS (deraf try/catch).
  try {
    const { available } =
      await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
    }
  } catch {
    // iOS — intet modul nødvendigt.
  }

  try {
    const { barcodes } = await BarcodeScanner.scan({
      // Samme formater som web-scanneren (dagligvare-stregkoder).
      formats: [
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
      ],
    });
    return barcodes[0]?.rawValue ?? null;
  } catch {
    // Brugeren lukkede scanneren (eller den fejlede) — roligt null,
    // så siden blot viser "åbn scanneren"-knappen igen.
    return null;
  }
}
