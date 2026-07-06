const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;

/**
 * Nedskalér et foto i klienten (deles af 2.2 måltidsfoto og 2.3
 * deklarationsfoto): mindre payload, og originalen forlader aldrig
 * enheden i fuld størrelse. Billedet persisteres aldrig.
 */
export async function downscaleToJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return dataUrl.split(",")[1]!;
}
