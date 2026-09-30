import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * E-nn (2026-09-29): la app se cerraba sola en 1 de cada 5 arranques en frío en Android con
 * `Fatal signal 11 (SIGSEGV) … in tid (mqt_v_js)` dentro de `MountingCoordinator::pullTransaction`.
 * Era react-native-screens 4.26.x: dos hilos creaban a la vez el `RNSScreenRemovalListener` sin
 * candado y el MountingCoordinator quedaba con un delegado liberado. Lo arregla
 * `scripts/arreglar-screens-removal-listener.js` (backport de react-native-screens#4413).
 *
 * El crash no se puede reproducir en jest; lo que sí se exige es que el código nativo que se
 * compila sea el arreglado. Sin el script en `postinstall`, la última prueba falla.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { aplicar, MARCA } = require('../../scripts/arreglar-screens-removal-listener.js') as {
  aplicar: (raiz: string) => string;
  MARCA: string;
};

const PROXY = 'android/src/main/cpp/NativeProxy.cpp';

function paqueteFalso(version: string): string {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'rns-'));
  fs.mkdirSync(path.join(raiz, 'cpp'));
  fs.mkdirSync(path.join(raiz, 'android/src/main/cpp'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'package.json'), JSON.stringify({ version }));
  const original = 'if (!screenRemovalListener_) {\n  screenRemovalListener_ = std::make_shared<RNSScreenRemovalListener>([this](int tag) {});\n}\n';
  for (const f of ['cpp/RNSScreenRemovalListener.h', 'cpp/RNSScreenRemovalListener.cpp', PROXY, 'android/src/main/cpp/NativeProxy.h']) {
    fs.writeFileSync(path.join(raiz, f), original);
  }
  return raiz;
}

describe('arreglo del RNSScreenRemovalListener de react-native-screens', () => {
  it('en 4.26.x reemplaza la inicialización perezosa sin candado por un singleton de proceso', () => {
    const raiz = paqueteFalso('4.26.2');
    expect(aplicar(raiz)).toBe('aplicado');
    const proxy = fs.readFileSync(path.join(raiz, PROXY), 'utf8');
    expect(proxy).toContain(MARCA);
    expect(proxy).toContain('static const std::shared_ptr<RNSScreenRemovalListener> instance');
    expect(proxy).not.toContain('screenRemovalListener_ =');
    expect(proxy).not.toContain('[this](int tag)');
    expect(proxy).toContain('[javaPart = javaPart_](int tag)');
  });

  it('es idempotente', () => {
    const raiz = paqueteFalso('4.26.2');
    aplicar(raiz);
    expect(aplicar(raiz)).toBe('ya-aplicado');
  });

  it('no toca otras versiones (4.28.0 ya trae el arreglo)', () => {
    const raiz = paqueteFalso('4.28.0');
    expect(aplicar(raiz)).toBe('otra-version');
    expect(fs.readFileSync(path.join(raiz, PROXY), 'utf8')).not.toContain(MARCA);
  });

  it('el react-native-screens instalado está arreglado o ya trae #4413', () => {
    const raiz = path.join(__dirname, '../../node_modules/react-native-screens');
    const version: string = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8')).version;
    const proxy = fs.readFileSync(path.join(raiz, PROXY), 'utf8');
    if (version.startsWith('4.26.')) {
      expect(proxy).toContain(MARCA);
    } else {
      expect(proxy).not.toContain('screenRemovalListener_ =');
    }
  });
});
