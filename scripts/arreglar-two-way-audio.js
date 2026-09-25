#!/usr/bin/env node
/**
 * Arregla `@speechmatics/expo-two-way-audio` (0.1.2) para que compile bien con Expo 57.
 *
 * EL SÍNTOMA (2026-09-24), al ABRIR la app (antes de cualquier pantalla), en rojo:
 *   This function has a reified type parameter and thus can only be inlined at compilation time,
 *   not called directly.
 *   throwUndefinedForReified … definition ExpoTwoWayAudioModule.kt:277 … ModuleRegistry.register
 *
 * LA CAUSA. En Expo 57 el DSL de los módulos (`Function`, `AsyncFunction`, `Events`) necesita el
 * plugin de compilador de Kotlin "pika", que genera la información de tipos al compilar. Los
 * módulos oficiales lo reciben con `plugins { id 'expo-module-gradle-plugin' }`. Este paquete usa
 * la forma vieja (`apply from: ExpoModulesCorePlugin.gradle` + `applyKotlinExpoModulesCorePlugin()`),
 * que ya no aplica pika: el bytecode queda con `throwNonReifiedTypeDescriptorError` y revienta al
 * registrar el módulo. Visto con `javap` sobre la clase compilada.
 *
 * EL ARREGLO. Reescribir su `android/build.gradle` con la forma nueva, igual que `expo-audio`.
 * Es idempotente (deja una marca) y, si el paquete publica una versión que ya usa el plugin, no
 * toca nada.
 */
const fs = require('fs');
const path = require('path');

const archivo = path.join(
  __dirname,
  '..',
  'node_modules',
  '@speechmatics',
  'expo-two-way-audio',
  'android',
  'build.gradle'
);
const MARCA = '// [renaser] build.gradle con expo-module-gradle-plugin (scripts/arreglar-two-way-audio.js)';

const NUEVO = `${MARCA}
plugins {
  id 'com.android.library'
  id 'expo-module-gradle-plugin'
}

group = 'expo.modules.twowayaudio'
version = '0.1.2'

android {
  namespace "expo.modules.twowayaudio"
  defaultConfig {
    versionCode 1
    versionName "0.1.2"
  }
  lintOptions {
    abortOnError false
  }
}
`;

if (!fs.existsSync(archivo)) {
  process.exit(0);
}
const actual = fs.readFileSync(archivo, 'utf8');
if (actual.includes(MARCA) || actual.includes("id 'expo-module-gradle-plugin'")) {
  process.exit(0);
}
fs.writeFileSync(archivo, NUEVO);
console.log('[renaser] expo-two-way-audio: build.gradle pasado a expo-module-gradle-plugin');
