/**
 * #49: la regla para reconocer, en la caché de la app, la foto que la cámara dejó cuando Android mató el proceso con ella
 * abierta; y los vigilantes de lo que esa recuperación da por supuesto de `expo-image-picker` y de las pantallas.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  buscarFotoDeLaCamara,
  CARPETA_DE_LA_CAMARA,
  elegirFotoHuerfana,
  MARGEN_DEL_RELOJ_MS,
  soltarFotoHuerfana,
  type EntornoDeLaCache,
  type FotoEnLaCache,
} from '../fotoHuerfanaDeLaCamara';

const T0 = 1_761_900_000_000;

function foto(nombre: string, extra: Partial<FotoEnLaCache> = {}): FotoEnLaCache {
  return { uri: `file:///cache/ImagePicker/${nombre}`, nombre, tamano: 2_500_000, modificadaEnMs: T0 + 30_000, ...extra };
}

describe('elegirFotoHuerfana', () => {
  it('sin archivos no hay foto', () => {
    expect(elegirFotoHuerfana([], T0)).toBeNull();
  });

  it('toma la más reciente de las que se escribieron después de abrir la cámara', () => {
    const nueva = foto('b.jpeg', { modificadaEnMs: T0 + 50_000 });
    expect(elegirFotoHuerfana([foto('a.jpeg', { modificadaEnMs: T0 + 10_000 }), nueva], T0)).toBe(nueva);
  });

  it('descarta lo anterior a la cámara (copias exportadas de fotos de antes), con un margen de reloj', () => {
    const deAntes = foto('vieja.jpeg', { modificadaEnMs: T0 - MARGEN_DEL_RELOJ_MS - 1 });
    const justo = foto('justo.jpeg', { modificadaEnMs: T0 - MARGEN_DEL_RELOJ_MS });
    expect(elegirFotoHuerfana([deAntes], T0)).toBeNull();
    expect(elegirFotoHuerfana([deAntes, justo], T0)).toBe(justo);
  });

  it('descarta el archivo vacío que Expo crea antes de abrir la cámara', () => {
    expect(elegirFotoHuerfana([foto('vacio.jpeg', { tamano: 0 })], T0)).toBeNull();
  });

  it('descarta lo que no es una imagen', () => {
    expect(elegirFotoHuerfana([foto('video.mp4'), foto('nota.txt'), foto('sin-extension')], T0)).toBeNull();
  });

  it.each(['a.jpg', 'a.JPEG', 'a.png', 'a.webp', 'a.heic'])('reconoce %s', nombre => {
    expect(elegirFotoHuerfana([foto(nombre)], T0)?.nombre).toBe(nombre);
  });

  it('una hora de modificación que no es un número no cuenta', () => {
    expect(elegirFotoHuerfana([foto('a.jpeg', { modificadaEnMs: Number.NaN })], T0)).toBeNull();
  });
});

describe('buscarFotoDeLaCamara y soltarFotoHuerfana', () => {
  const entorno = (listar: EntornoDeLaCache['listar'], borrar: EntornoDeLaCache['borrar'] = () => undefined): EntornoDeLaCache => ({
    listar,
    borrar,
  });

  it('nunca lanza: con la carpeta ilegible no hay foto', () => {
    const roto = entorno(() => {
      throw new Error('EACCES');
    });
    expect(buscarFotoDeLaCamara(T0, roto)).toBeNull();
  });

  it('lista la carpeta y aplica la regla', () => {
    const buena = foto('buena.jpeg');
    expect(buscarFotoDeLaCamara(T0, entorno(() => [foto('vacia.jpeg', { tamano: 0 }), buena]))).toBe(buena);
  });

  it('suelta (borra) la original; si no puede, no lanza', () => {
    const borradas: string[] = [];
    soltarFotoHuerfana(foto('a.jpeg'), entorno(() => [], uri => void borradas.push(uri)));
    expect(borradas).toEqual(['file:///cache/ImagePicker/a.jpeg']);
    expect(() =>
      soltarFotoHuerfana(
        foto('a.jpeg'),
        entorno(
          () => [],
          () => {
            throw new Error('EBUSY');
          },
        ),
      ),
    ).not.toThrow();
  });
});

/*
 * Lo que esta recuperación da por supuesto de `expo-image-picker`, contra su código fuente (la versión que el proyecto
 * instala). Si una actualización de Expo lo cambia, esta prueba falla y hay que volver a mirar #49 antes de seguir.
 */
describe('vigilante de expo-image-picker (Android)', () => {
  const RAIZ = join(__dirname, '../../../../../node_modules/expo-image-picker/android/src/main');
  const kotlin = (archivo: string) => readFileSync(join(RAIZ, 'java/expo/modules/imagepicker', archivo), 'utf8');

  it('la cámara escribe en cache/ImagePicker', () => {
    expect(kotlin('ImagePickerConstants.kt')).toMatch(new RegExp(`CACHE_DIR_NAME\\s*=\\s*"${CARPETA_DE_LA_CAMARA}"`));
    // La carpeta cuelga de la caché de la app, la misma que `Paths.cache` de expo-file-system.
    expect(kotlin('ImagePickerModule.kt')).toMatch(/createOutputFile\(cacheDirectory, options\.nativeMediaTypes\.toFileExtension\(\)\)/);
    expect(readFileSync(join(RAIZ, 'res/xml/image_picker_provider_paths.xml'), 'utf8')).toMatch(/<cache-path[^>]*path="\."/);
  });

  it('el resultado pendiente de Expo vive solo en memoria (por eso no sobrevive a la muerte del proceso)', () => {
    expect(kotlin('ImagePickerModule.kt')).toMatch(/private var pendingMediaPickingResult: PendingMediaPickingResult\? = null/);
  });
});

describe('las pantallas que pueden ser la primera que se ve al volver retoman la foto', () => {
  const pantalla = (nombre: string) => readFileSync(join(__dirname, '../../../../screens', nombre), 'utf8');

  it.each(['HoyScreen.tsx', 'TrainingScreen.tsx'])('%s llama a reanudarPendiente al montarse', nombre => {
    expect(pantalla(nombre)).toMatch(/useEffect\(\(\) => \{\s*void reanudarPendiente\(\);\s*\}, \[reanudarPendiente\]\)/);
  });
});
