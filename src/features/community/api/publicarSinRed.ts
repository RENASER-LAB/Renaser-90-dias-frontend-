import { obtenerCatalogo, obtenerTracksDeHoy } from '../../habits/api/habitsApi';
import { conMarcadosSinRed } from '../../habits/api/evidenciaHabitoApi';
import { CLAVE_SISTEMA_POST_DIARIO_COMUNIDAD } from '../../habits/types/habits.types';
import { borrarArchivoSinRed, existeArchivoSinRed, guardarArchivoSinRed, sinArchivo } from '../../sinRed/archivosSinRed';
import { agregarEnvio, cuentaDeLaSesion, leerCola, quitarEnvio, registrarManejador } from '../../sinRed/colaSinRed';
import { horaReal } from '../../sinRed/horaReal';
import { retocarLecturasGuardadas } from '../../sinRed/lecturasGuardadas';
import type { FotoMuroNormalizada } from '../utils/normalizarImagen';
import * as wallApi from './wallApi';

/**
 * Spec 048, fase 2 (FR-018, FR-020, D17–D19): la publicación del Muro escrita sin señal.
 *
 * - Se encola con la hora real y sus fotos copiadas a la carpeta sin red (la caché del sistema las puede limpiar).
 * - Al volver la señal, la cola sube cada foto (URL firmada → S3) y publica con `hechoEn` e `idCliente`: el servidor la
 *   guarda una sola vez, arriba como nueva (D18), y el «Post diario» cuenta el día en que se escribió (D17).
 * - Mientras espera se puede borrar (D19): sale de la cola y sus fotos se borran.
 * - El «Post diario» de Entrenar sale hecho al instante: el envío guarda el registro de ese hábito (leído de lo guardado) y
 *   el ajuste de lectura de los hábitos lo marca hecho mientras espera.
 */
export const TEXTO_EN_ESPERA = 'Se publicará al volver la señal';

export type DatosDePublicacionSinRed = {
  texto: string;
  /** Solo para dibujarla mientras espera (el servidor pone el autor de la sesión). */
  autor: string;
  fotos: { uri: string; mimeType: string }[];
  categoria: string | null;
  formacion: string | null;
  /** El registro del «Post diario» del día en que se escribió, si se pudo leer de lo guardado. */
  registroPostDiario: string | null;
};

export type PublicacionEnEspera = DatosDePublicacionSinRed & { idCliente: string; hechoEn: string };

/** Encola la publicación. Devuelve el `idCliente` del envío (con él se borra mientras espera). */
export async function encolarPublicacion(
  autor: string,
  texto: string,
  fotos: FotoMuroNormalizada[],
  categoria: string | null,
  formacion: string | null,
): Promise<string> {
  const cuenta = cuentaDeLaSesion();
  if (!cuenta) throw new Error('Tu sesión no está lista. Abre la app con señal una vez para poder publicar sin señal.');
  const hora = horaReal();
  const copias: { uri: string; mimeType: string }[] = [];
  for (const foto of fotos) copias.push({ uri: await guardarArchivoSinRed(foto.uri, foto.mimeType), mimeType: foto.mimeType });
  const datos: DatosDePublicacionSinRed = {
    texto,
    autor,
    fotos: copias,
    categoria,
    formacion,
    registroPostDiario: await registroDelPostDiario(fechaLocal(hora.instante)),
  };
  const envio = await agregarEnvio(cuenta, 'publicarMuro', datos, hora);
  return envio.idCliente;
}

/** Las publicaciones propias que esperan señal, de la más nueva a la más vieja. */
export async function publicacionesEnEspera(cuentaId: string | null = cuentaDeLaSesion()): Promise<PublicacionEnEspera[]> {
  if (!cuentaId) return [];
  return (await leerCola(cuentaId))
    .filter(e => e.tipo === 'publicarMuro')
    .map(e => ({ ...(e.datos as DatosDePublicacionSinRed), idCliente: e.idCliente, hechoEn: e.hechoEn }))
    .reverse();
}

/**
 * Borra una publicación que todavía espera (D19). `false` si ya estaba saliendo: en ese caso llega igual y se borra
 * después desde el Muro, como cualquier otra.
 */
export async function borrarPublicacionEnEspera(idCliente: string): Promise<boolean> {
  const cuenta = cuentaDeLaSesion();
  if (!cuenta) return false;
  const espera = (await publicacionesEnEspera(cuenta)).find(p => p.idCliente === idCliente);
  const quitada = await quitarEnvio(cuenta, idCliente);
  if (quitada && espera) espera.fotos.forEach(f => borrarArchivoSinRed(f.uri));
  return quitada;
}

async function registroDelPostDiario(fecha: string): Promise<string | null> {
  try {
    // Sin señal, estas lecturas salen de lo guardado (FR-004): el catálogo y los hábitos de hoy.
    const [catalogo, tracks] = await Promise.all([obtenerCatalogo(), obtenerTracksDeHoy()]);
    const habitoId = catalogo.find(h => h.systemKey === CLAVE_SISTEMA_POST_DIARIO_COMUNIDAD)?.id;
    const track = tracks.find(t => t.habitoId === habitoId && (!t.fechaEjecucion || t.fechaEjecucion === fecha));
    return track?.id ?? null;
  } catch {
    return null;
  }
}

function fechaLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

registrarManejador('publicarMuro', async envio => {
  const d = envio.datos as DatosDePublicacionSinRed;
  const media: { url: string; mimeType: string }[] = [];
  for (const foto of d.fotos) {
    if (!existeArchivoSinRed(foto.uri)) throw sinArchivo();
    const subida = await wallApi.solicitarUrlSubidaMuro(foto.mimeType);
    if (wallApi.almacenamientoSinConfigurar(subida.uploadUrl)) {
      throw Object.assign(new Error('El almacenamiento de fotos no está configurado en el servidor.'), { status: 503 });
    }
    await wallApi.subirImagenAS3(subida.uploadUrl, foto.uri, foto.mimeType);
    media.push({ url: subida.ruta, mimeType: foto.mimeType });
  }
  await wallApi.publicarEnMuro(d.texto, media, d.categoria, d.formacion, {
    hechoEn: envio.hechoEn,
    idCliente: envio.idCliente,
    origenDeLaHora: envio.origenDeLaHora,
  });
  d.fotos.forEach(f => borrarArchivoSinRed(f.uri));
  // Lo guardado de los hábitos tiene que decir hecho, o sin señal el «Post diario» volvería a verse pendiente (fase 1).
  if (d.registroPostDiario) {
    const registro = d.registroPostDiario;
    await retocarLecturasGuardadas(
      ruta => ruta.startsWith('/api/v1/habit-tracks/'),
      datos => conMarcadosSinRed(datos, new Set([registro])),
    );
  }
});
