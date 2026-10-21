import {
  ALMACENAMIENTO_SIN_CONFIGURAR,
  almacenamientoSinConfigurar,
  subirArchivoAS3,
} from '../../habits/api/evidenciaHabitoApi';
import type { ArchivoEvidencia } from '../../habits/utils/capturarEvidencia';
import { registrarEvidenciaRoca, solicitarUrlSubidaEvidenciaRoca } from '../api/objetivosApi';

/**
 * Cierra una acción del día con su evidencia. Devuelve los puntos que otorgó el servidor.
 *
 * **El bug que esto arregla.** Training abría el modal de evidencia de hábitos para las tarjetas de
 * VIDA Y NEGOCIO, y ese modal pega siempre contra `/api/v1/habit-tracks/{id}/...`. A una roca se le
 * pasaba su **id de roca**, que no existe en `habit_tracks`: 404. No se notaba porque hasta ahora
 * esa dimensión estaba siempre vacía y no había ninguna tarjeta que tocar.
 *
 * **Tres pasos, no cuatro.** Un hábito necesita `/evidence` y después `/complete`, y es el segundo
 * el que da los puntos. Una roca se cierra y se premia en la misma llamada, así que repetirla da
 * `409 ALREADY_COMPLETED`.
 *
 * Se reusan `subirArchivoAS3` y la guardia de almacenamiento de `habits` en vez de duplicarlas: son
 * el PUT genérico a una URL prefirmada, no tienen nada de hábitos, y `objetivos` ya depende de ese
 * módulo (la rueda de hora). La dependencia inversa —`habits` sabiendo de rocas— sí estaría mal, y
 * es la que se evitó dejando el modal con un parámetro `sellarPersonalizado`.
 */
export async function sellarRocaDiaria(
  rocaId: string,
  datos: { archivo: Pick<ArchivoEvidencia, 'uri' | 'mimeType' | 'tipo' | 'tomadaEn'> | null; texto: string }
): Promise<number> {
  const { archivo, texto } = datos;
  let bucket: string | null = null;
  let rutaStorage: string | null = null;

  if (archivo) {
    // Ley VI: una FOTO tiene que traer cuándo fue tomada, y el servidor lo compara con el instante
    // de subida (±15 min). El backend rechaza el null con un 400 correcto pero ilegible para el
    // aprendiz ("timestampExif es obligatorio..."), así que se corta acá diciendo qué hacer.
    if (archivo.tipo === 'FOTO' && !archivo.tomadaEn) {
      throw new Error(
        'Esta imagen no guarda la fecha en que fue tomada, y tus acciones del día la necesitan como prueba. Saca la foto con la cámara desde aquí, o deja tu evidencia por escrito.'
      );
    }
    const url = await solicitarUrlSubidaEvidenciaRoca(rocaId, archivo.mimeType);
    if (almacenamientoSinConfigurar(url.uploadUrl)) {
      throw new Error(ALMACENAMIENTO_SIN_CONFIGURAR);
    }
    await subirArchivoAS3(url.uploadUrl, archivo.uri, archivo.mimeType);
    bucket = url.bucket;
    rutaStorage = url.ruta;
  }

  const roca = await registrarEvidenciaRoca(rocaId, {
    tipo: archivo ? archivo.tipo : 'TEXTO',
    bucket,
    rutaStorage,
    contenidoTexto: texto || null,
    timestampExif: archivo?.tomadaEn ?? null,
  });
  await dejarDeRepetirLaAccion(rocaId);
  return roca.puntosOtorgados;
}

/**
 * La acción quedó sellada: las repeticiones de su alarma («Repetir si no la atiendo», spec 010) dejan de sonar y no se
 * vuelven a poner. Pasan por acá todos los cierres de una acción (Training, el registro con foto, el acompañante). Se
 * carga acá adentro para no arrastrar las alarmas locales a quien solo sube una evidencia, y un fallo no puede deshacer una
 * acción que el servidor ya selló.
 */
async function dejarDeRepetirLaAccion(rocaId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { atenderLaAccion } = require('../notificaciones/repeticionesDeAcciones') as typeof import('../notificaciones/repeticionesDeAcciones');
    await atenderLaAccion(rocaId);
  } catch {
    // Las repeticiones de hoy sonarían una vez más; la acción ya quedó sellada.
  }
}
