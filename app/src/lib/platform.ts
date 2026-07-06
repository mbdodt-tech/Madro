import { Capacitor } from "@capacitor/core";

/**
 * Platformskel (fase 5.1): 'native' = Capacitor-skallen på iOS/Android.
 * Bruges til at vælge native implementeringer (scanner, senere HealthKit)
 * og til at springe service workeren over i skallen.
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
