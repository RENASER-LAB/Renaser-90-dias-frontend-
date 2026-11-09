import { almacen } from './almacen';

/**
 * Spec 048 (FR-017, D6): los audios de Espíritu (Pastilla Renaser) y de la Audioterapia se bajan solos apenas la app tiene su URL
 * (firmada, vence), para escucharlos sin señal. Se borran a los 7 días. Mientras se bajan, o si no hay lugar, se escucha por
 * internet como siempre.
 */
const CARPETA = 'renaser-audios';
const CLAVE_INDICE = 'renaser.sinRed.audios';
export const DIAS_QUE_SE_GUARDAN = 7;

type Bajado = { uri: string; bajadoMs: number };
let indice: Record<string, Bajado> = {};
const bajando = new Set<string>();

function fs() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-file-system') as typeof import('expo-file-system');
}

async function guardarIndice(): Promise<void> {
  await almacen().setItem(CLAVE_INDICE, JSON.stringify(indice)).catch(() => undefined);
}

/** Al abrir la app: lee qué hay bajado y borra lo de más de 7 días. */
export async function cargarAudiosGuardados(ahora: number = Date.now()): Promise<void> {
  try {
    const crudo = await almacen().getItem(CLAVE_INDICE);
    indice = crudo ? (JSON.parse(crudo) as Record<string, Bajado>) : {};
  } catch {
    indice = {};
  }
  const limite = ahora - DIAS_QUE_SE_GUARDAN * 24 * 60 * 60 * 1000;
  let cambio = false;
  for (const [clave, b] of Object.entries(indice)) {
    if (b.bajadoMs < limite) {
      try {
        const f = new (fs().File)(b.uri);
        if (f.exists) f.delete();
      } catch {
        /* se intenta la próxima vez */
      }
      delete indice[clave];
      cambio = true;
    }
  }
  if (cambio) await guardarIndice();
}

/** La fuente para reproducir: el archivo del teléfono si ya está, si no la URL. */
export function fuenteDelAudio(clave: string, url: string | null): string | null {
  return indice[clave]?.uri ?? url;
}

/** Baja el audio si todavía no está. Nunca lanza: si falla, se escucha por internet. */
export async function prepararAudio(clave: string, url: string | null, ahora: number = Date.now()): Promise<void> {
  if (!url || indice[clave] || bajando.has(clave) || !/^https?:/i.test(url)) return;
  bajando.add(clave);
  try {
    const { Directory, File, Paths } = fs();
    const carpeta = new Directory(Paths.document, CARPETA);
    if (!carpeta.exists) carpeta.create({ intermediates: true, idempotent: true });
    const nombre = `${clave.replace(/[^a-z0-9-]/gi, '-')}.audio`;
    const destino = new File(carpeta, nombre);
    if (destino.exists) destino.delete();
    const bajado = await File.downloadFileAsync(url, destino);
    indice[clave] = { uri: bajado.uri, bajadoMs: ahora };
    await guardarIndice();
  } catch {
    /* sin lugar o sin señal: se escucha por internet */
  } finally {
    bajando.delete(clave);
  }
}

export function claveDelAudio(rotulo: string, claveBorrador: string | number): string {
  return `${rotulo}-${claveBorrador}`.toLowerCase();
}

/** Solo para las pruebas. */
export function _reiniciarAudios(): void {
  indice = {};
  bajando.clear();
}
