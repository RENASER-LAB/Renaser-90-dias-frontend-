#!/usr/bin/env node
/**
 * Arregla la parte de iOS de `@speechmatics/expo-two-way-audio` (0.1.2) para que compile con Expo 57.
 *
 * EL SÍNTOMA (2026-11-16, primer build de iOS en EAS): Xcode no compila el paquete:
 *   ExpoTwoWayAudioModule.swift:125: cannot convert value of type 'Promise.ResolveClosure'
 *     (aka '@Sendable (JavaScriptValue) -> ()') to expected argument type 'EXPromiseResolveBlock'
 *   MicrophonePermissionRequester.swift:18: cannot find 'EXErrorWithMessage' / 'EXFatal' in scope
 * En Android no se ve: es solo código Swift. El paquete no publica versiones desde enero de 2025.
 *
 * LA CAUSA. En Expo 57, `promise.resolver` pasó a recibir un `JavaScriptValue`, y los permisos
 * heredados (`EXPermissionsMethodsDelegate`) esperan el bloque viejo, `promise.legacyResolver`.
 * Además, Expo 57 quitó `EXFatal` y `EXErrorWithMessage`.
 *
 * EL ARREGLO. Hace lo mismo que `expo-audio` (oficial, compila con Expo 57):
 * - usa `promise.legacyResolver`;
 * - si falta `NSMicrophoneUsageDescription`, escribe un error en el log en vez de `EXFatal`;
 * - devuelve el estado con `.rawValue`;
 * - marca `@escaping` el `reject` de `requestPermissions`.
 * Es idempotente: si el texto viejo ya no está, no toca nada.
 */
const fs = require('fs');
const path = require('path');

const carpeta = path.join(__dirname, '..', 'node_modules', '@speechmatics', 'expo-two-way-audio', 'ios');

function reemplazar(archivo, cambios) {
  const ruta = path.join(carpeta, archivo);
  if (!fs.existsSync(ruta)) {
    console.log(`[arreglar-two-way-audio-ios] no está ${archivo}: nada que hacer`);
    return;
  }
  let texto = fs.readFileSync(ruta, 'utf8');
  let tocado = 0;
  for (const [viejo, nuevo] of cambios) {
    if (texto.includes(viejo)) {
      texto = texto.split(viejo).join(nuevo);
      tocado++;
    }
  }
  if (tocado > 0) {
    fs.writeFileSync(ruta, texto);
    console.log(`[arreglar-two-way-audio-ios] ${archivo}: ${tocado} cambio(s)`);
  } else {
    console.log(`[arreglar-two-way-audio-ios] ${archivo}: ya estaba arreglado`);
  }
}

reemplazar('ExpoTwoWayAudioModule.swift', [['resolve: promise.resolver,', 'resolve: promise.legacyResolver,']]);

reemplazar('MicrophonePermissionRequester.swift', [
  [
    `      EXFatal(EXErrorWithMessage("""
        This app is missing NSMicrophoneUsageDescription, so audio services will fail.
        Add one of these keys to your bundle's Info.plist.
      """))
      return ["status": EXPermissionStatusDenied]`,
    `      log.error("""
        This app is missing NSMicrophoneUsageDescription, so audio services will fail. \\
        Add the key to the app's Info.plist.
        """)
      return ["status": EXPermissionStatusDenied.rawValue]`,
  ],
  ['rejecter reject: EXPromiseRejectBlock)', 'rejecter reject: @escaping EXPromiseRejectBlock)'],
]);
