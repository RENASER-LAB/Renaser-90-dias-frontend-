import { ApiError } from '../../../services/http/apiClient';
import { fechaLocal } from '../../habits/notificaciones/utils/alarmasPorDia';
import { avisarSinPuntos } from '../../sinRed/avisosDeLoNoAplicado';
import { cabecerasDe } from '../../sinRed/cabecerasSinRed';
import { agregarEnvio, cuentaDeLaSesion, leerCola, registrarManejador } from '../../sinRed/colaSinRed';
import { borrarArchivoSinRed, existeArchivoSinRed, guardarArchivoSinRed, sinArchivo } from '../../sinRed/archivosSinRed';
import { escriturasEsperando } from '../../sinRed/escrituraSinRed';
import { horaReal } from '../../sinRed/horaReal';
import { registrarAjusteDeLectura } from '../../sinRed/lecturasGuardadas';
import type {
  CierreRocaSemanal,
  DefinicionRocaMaestra,
  EdicionRocaSemanal,
  EjeObjetivo,
  ItemPlanDiario,
  ItemPlanSemanal,
  RocaDiariaApi,
  RocaMaestraApi,
  RocaSemanalApi,
} from '../types/objetivos.types';
import { AVISO_TODAVIA_NO_LLEGO, PREFIJO_DE_ACCION_EN_ESPERA, TEXTO_SE_GUARDARA, estaEnEspera } from '../utils/accionEnEspera';
import { ALMACENAMIENTO_SIN_CONFIGURAR, almacenamientoSinConfigurar, subirArchivoAS3 } from '../../habits/api/evidenciaHabitoApi';

/**
 * Spec 048, fase 3 (FR-019, D13, D14, P2, P3, P6): el Plan sin señal — las acciones del día y los objetivos (90 días, semana y mes).
 *
 * - **Agendar** (`POST /rocks/plan`) se guarda y las acciones se ven «Se guardará al volver la señal» (`pendienteDeEnvio`): el `id` lo pone
 *   el servidor, así que no se pueden marcar hasta que lleguen (P6). Si al llegar el día ya pasó, no se aplica y se avisa (P2).
 * - **Marcar una acción** (texto o foto) es el envío `completarAccion`: copia la foto a la carpeta sin red, y al volver la señal pide la
 *   URL, sube a S3 y manda `POST /rocks/{id}/evidence` con las tres cabeceras. Sale hecha al instante y sus alarmas se apagan; los
 *   puntos salen con la respuesta (con 48 h de tope y la hora real, FR-015: el servidor nunca la rechaza, la deja sin puntos).
 * - **Objetivos** (90 días, semana, mes) son escrituras genéricas con respuesta optimista y ajuste de lectura sobre `/rocks/…`.
 */
export { AVISO_TODAVIA_NO_LLEGO, PREFIJO_DE_ACCION_EN_ESPERA, TEXTO_SE_GUARDARA, estaEnEspera };

/** Un error de red como el de `apiFetch`, para lo que no se puede hacer sin señal. */
export function sinRedParaEsto(): ApiError {
  return new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
}

function sumarUnDia(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return fechaLocal(new Date(a, m - 1, d + 1));
}

// ---- Agendar ------------------------------------------------------------------------------------------------------------------

/** El color sale de la posición dentro del eje: la primera es la VERDE, la segunda AMARILLA y la tercera ROJA. */
function colorDe(posicion: number): RocaDiariaApi['color'] {
  return posicion <= 1 ? 'VERDE' : posicion === 2 ? 'AMARILLA' : 'ROJA';
}

export function accionesEnEspera(fecha: string, items: readonly ItemPlanDiario[], idCliente: string): RocaDiariaApi[] {
  return items.map(i => ({
    id: `${PREFIJO_DE_ACCION_EN_ESPERA}${idCliente}:${i.eje}:${i.posicion}`,
    fecha,
    posicion: i.posicion,
    titulo: i.titulo,
    descripcion: i.descripcion ?? null,
    color: colorDe(i.posicion),
    puntajeImpacto: i.puntajeImpacto,
    esDelegable: i.esDelegable,
    eje: i.eje,
    rocaSemanalId: null,
    horaInicio: i.horaInicio ? `${i.horaInicio.slice(0, 5)}:00` : null,
    horaFin: i.horaFin ? `${i.horaFin.slice(0, 5)}:00` : null,
    completada: false,
    completadaEn: null,
    puntosOtorgados: 0,
    // Solo la VERDE de cada eje está abierta; las otras esperan a que se cumpla (Pareto), igual que con señal.
    bloqueada: i.posicion > 1,
    acciones: i.acciones ?? [],
    pendienteDeEnvio: true,
  }));
}

/** Las reglas de la app antes de guardar (P2): no se agenda un día que ya pasó, con la hora real. */
export function revisarElDiaAAgendar(fecha: string, hoy: string): void {
  if (fecha < hoy) throw new ApiError(400, 'INVALID_DATE');
}

export function etiquetaDeAgendar(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Tus acciones de hoy';
  if (fecha === sumarUnDia(hoy)) return 'Tus acciones de mañana';
  const [, mes, dia] = fecha.split('-');
  return `Tus acciones del ${Number(dia)}/${Number(mes)}`;
}

export function resumenDeAgendar(items: readonly ItemPlanDiario[]): string {
  return items.map(i => `${i.horaInicio ? `${i.horaInicio.slice(0, 5)} ` : ''}${i.titulo}`).join('\n');
}

// ---- Marcar una acción ---------------------------------------------------------------------------------------------------------

export type DatosDeAccionEnEspera = {
  rocaId: string;
  etiqueta: string;
  tipo: 'FOTO' | 'VIDEO' | 'AUDIO' | 'TEXTO' | 'CAPTURA';
  uri: string | null;
  mimeType: string | null;
  texto: string | null;
  timestampExif: string | null;
};

/** Guarda la acción marcada sin señal. Devuelve los puntos que se ven ahora: ninguno, los da el servidor al llegar. */
export async function encolarAccionMarcada(
  rocaId: string,
  archivo: { uri: string; mimeType: string; tipo: DatosDeAccionEnEspera['tipo']; tomadaEn?: string | null } | null,
  texto: string,
  errorDeRed: unknown,
): Promise<number> {
  const cuenta = cuentaDeLaSesion();
  if (!cuenta) throw errorDeRed;
  if (estaEnEspera(rocaId)) throw sinRedParaEsto();
  const hora = horaReal();
  const copia = archivo ? await guardarArchivoSinRed(archivo.uri, archivo.mimeType) : null;
  const datos: DatosDeAccionEnEspera = {
    rocaId,
    etiqueta: 'Una acción que marcaste sin conexión',
    tipo: archivo ? archivo.tipo : 'TEXTO',
    uri: copia,
    mimeType: archivo?.mimeType ?? null,
    texto: texto || null,
    timestampExif: archivo?.tomadaEn ?? null,
  };
  await agregarEnvio(cuenta, 'completarAccion', datos, hora);
  return 0;
}

registrarManejador('completarAccion', async envio => {
  const d = envio.datos as unknown as DatosDeAccionEnEspera;
  let bucket: string | null = null;
  let rutaStorage: string | null = null;
  if (d.uri && d.mimeType) {
    if (!existeArchivoSinRed(d.uri)) throw sinArchivo();
    // Cargado acá adentro: `objetivosApi` importa este módulo para el ajuste de lectura.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require('./objetivosApi') as typeof import('./objetivosApi');
    const url = await api.solicitarUrlSubidaEvidenciaRoca(d.rocaId, d.mimeType);
    if (almacenamientoSinConfigurar(url.uploadUrl)) {
      throw Object.assign(new Error(ALMACENAMIENTO_SIN_CONFIGURAR), { status: 503 });
    }
    try {
      await subirArchivoAS3(url.uploadUrl, d.uri, d.mimeType);
    } catch (error) {
      if (error instanceof Error && /leer el archivo/i.test(error.message)) throw sinArchivo();
      throw error;
    }
    bucket = url.bucket;
    rutaStorage = url.ruta;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const api = require('./objetivosApi') as typeof import('./objetivosApi');
  const roca = await api.registrarEvidenciaRoca(
    d.rocaId,
    { tipo: d.tipo, bucket, rutaStorage, contenidoTexto: d.texto, timestampExif: d.timestampExif },
    cabecerasDe(envio),
  );
  if (d.uri) borrarArchivoSinRed(d.uri);
  // FR-015: quedó registrada sin puntos (más de 48 h, hora futura, fuera de su día): se dice por qué.
  if (roca.motivoSinPuntos) {
    await avisarSinPuntos(envio.cuentaId, {
      idCliente: envio.idCliente,
      etiqueta: roca.titulo ? `La acción «${roca.titulo}»` : d.etiqueta,
      hechoEn: envio.hechoEn,
      motivoSinPuntos: roca.motivoSinPuntos,
    });
  }
});

// ---- Objetivos ---------------------------------------------------------------------------------------------------------------

export function semanaEnEspera(items: readonly ItemPlanSemanal[], maestras: readonly RocaMaestraApi[], idCliente: string, hechoEn: string, numeroSemana: number): RocaSemanalApi[] {
  return items.map(i => ({
    id: `${PREFIJO_DE_ACCION_EN_ESPERA}${idCliente}:${i.eje}`,
    rocaMaestraId: maestras.find(m => m.eje === i.eje)?.id ?? '',
    numeroSemana,
    titulo: i.titulo,
    obstaculo: i.obstaculo ?? null,
    contingencia: i.contingencia ?? null,
    autoevaluacionInicio: i.autoevaluacionInicio ?? null,
    autoevaluacionFin: null,
    bloqueoPrincipal: null,
    correccion: null,
    creadoEn: hechoEn,
    actualizadoEn: hechoEn,
  }));
}

export function rocaSemanalEditada(base: RocaSemanalApi, edicion: EdicionRocaSemanal | CierreRocaSemanal, hechoEn: string): RocaSemanalApi {
  return { ...base, ...edicion, actualizadoEn: hechoEn };
}

export function rocaMaestraEnEspera(
  eje: EjeObjetivo,
  definicion: DefinicionRocaMaestra,
  base: RocaMaestraApi | null | undefined,
  idCliente: string,
  hechoEn: string,
): RocaMaestraApi {
  return {
    porcentaje: null,
    creadoEn: hechoEn,
    ...(base ?? {}),
    id: base?.id ?? `${PREFIJO_DE_ACCION_EN_ESPERA}${idCliente}`,
    eje,
    objetivo: definicion.objetivo,
    meta: definicion.meta ?? base?.meta ?? null,
    avance: definicion.avance ?? base?.avance ?? null,
    unidad: definicion.unidad ?? base?.unidad ?? null,
    lineaBase: definicion.lineaBase ?? base?.lineaBase ?? null,
    actualizadoEn: hechoEn,
    confirmed: true,
  };
}

// ---- Ajustes de lectura ------------------------------------------------------------------------------------------------------

type ListaAgendada = { desde: string; hasta: string; rocas: RocaDiariaApi[] };

function conAcciones(lista: RocaDiariaApi[], esperando: Array<{ fecha: string; rocas: RocaDiariaApi[] }>, deEstaFecha: (f: string) => boolean): RocaDiariaApi[] {
  let actual = lista;
  for (const e of esperando) {
    if (!deEstaFecha(e.fecha)) continue;
    // Un día futuro que se vuelve a agendar reemplaza al anterior, como en el servidor (E-208).
    actual = [...actual.filter(r => r.fecha !== e.fecha), ...e.rocas];
  }
  return actual;
}

function conMarcadas(lista: RocaDiariaApi[], marcadas: Map<string, string>): RocaDiariaApi[] {
  if (marcadas.size === 0) return lista;
  const hechas = lista.filter(r => marcadas.has(r.id));
  return lista.map(r => {
    if (marcadas.has(r.id)) return { ...r, completada: true, completadaEn: marcadas.get(r.id) as string };
    // Cumplida la VERDE de un eje, las otras de ese día se abren (Pareto), también mientras espera.
    if (r.bloqueada && hechas.some(h => h.eje === r.eje && h.fecha === r.fecha && h.color === 'VERDE')) return { ...r, bloqueada: false };
    return r;
  });
}

registrarAjusteDeLectura(async (ruta, datos) => {
  const limpia = ruta.split('?')[0];
  const esAgenda = limpia === '/api/v1/rocks/today' || limpia === '/api/v1/rocks/tomorrow' || limpia === '/api/v1/rocks/upcoming';
  const esObjetivo = limpia === '/api/v1/rocks/weekly' || limpia === '/api/v1/rocks/master' || limpia === '/api/v1/rocks/monthly/plan';
  if (!esAgenda && !esObjetivo) return datos;
  const cuenta = cuentaDeLaSesion();
  if (!cuenta) return datos;
  const cola = await leerCola(cuenta);
  const del = (e: { tipo: string; datos: Record<string, unknown> }) => (e.tipo === 'escritura' ? (e.datos as { ruta?: string; metodo?: string; cuerpo?: unknown }) : null);

  if (esAgenda) {
    const marcadas = new Map<string, string>();
    cola.filter(e => e.tipo === 'completarAccion').forEach(e => marcadas.set(String((e.datos as { rocaId?: unknown }).rocaId), e.hechoEn));
    const planes = cola
      .map(e => ({ e, d: del(e) }))
      .filter(x => x.d?.metodo === 'POST' && x.d.ruta === '/api/v1/rocks/plan')
      .map(x => {
        const cuerpo = x.d?.cuerpo as { fecha: string; rocas: ItemPlanDiario[] };
        return { fecha: cuerpo.fecha, rocas: accionesEnEspera(cuerpo.fecha, cuerpo.rocas, x.e.idCliente) };
      });
    if (planes.length === 0 && marcadas.size === 0) return datos;
    const hoy = fechaLocal(horaReal().instante);
    const manana = sumarUnDia(hoy);
    if (limpia === '/api/v1/rocks/upcoming') {
      const l = datos as ListaAgendada | null;
      if (!l || !Array.isArray(l.rocas)) return datos;
      return { ...l, rocas: conMarcadas(conAcciones(l.rocas, planes, f => f >= l.desde && f <= l.hasta), marcadas) };
    }
    if (!Array.isArray(datos)) return datos;
    const dia = limpia === '/api/v1/rocks/today' ? hoy : manana;
    return conMarcadas(conAcciones(datos as RocaDiariaApi[], planes, f => f === dia), marcadas);
  }

  const escrituras = await escriturasEsperando('plan', cuenta);
  if (escrituras.length === 0) return datos;
  if (limpia === '/api/v1/rocks/weekly' && Array.isArray(datos)) {
    let rocas = datos as RocaSemanalApi[];
    for (const e of escrituras) {
      if (e.ruta === '/api/v1/rocks/weekly' && e.metodo === 'POST' && rocas.length === 0) {
        const cuerpo = e.cuerpo as { rocas: ItemPlanSemanal[] };
        const contexto = (e.contexto ?? {}) as { maestras?: RocaMaestraApi[]; semana?: number };
        rocas = semanaEnEspera(cuerpo.rocas, contexto.maestras ?? [], e.idCliente, e.hechoEn, contexto.semana ?? 0);
      }
      const edicion = /^\/api\/v1\/rocks\/weekly\/([^/]+)(\/review)?$/.exec(e.ruta);
      if (edicion && e.metodo === 'PATCH') rocas = rocas.map(r => (r.id === edicion[1] ? rocaSemanalEditada(r, e.cuerpo as EdicionRocaSemanal, e.hechoEn) : r));
    }
    return rocas;
  }
  if (limpia === '/api/v1/rocks/master' && Array.isArray(datos)) {
    let rocas = datos as RocaMaestraApi[];
    for (const e of escrituras) {
      const m = /^\/api\/v1\/rocks\/master\/([A-Z]+)$/.exec(e.ruta);
      if (!m || e.metodo !== 'PUT') continue;
      const eje = m[1] as EjeObjetivo;
      const base = rocas.find(r => r.eje === eje);
      rocas = [...rocas.filter(r => r.eje !== eje), rocaMaestraEnEspera(eje, e.cuerpo as DefinicionRocaMaestra, base, e.idCliente, e.hechoEn)];
    }
    return rocas;
  }
  if (limpia === '/api/v1/rocks/monthly/plan' && Array.isArray(datos)) {
    let planes = datos as Array<{ eje: string; meses: Array<{ numeroMes: number; titulo: string | null; editado: boolean; cifra: number | null }> }>;
    for (const e of escrituras) {
      const m = /^\/api\/v1\/rocks\/monthly\/([A-Z]+)\/(\d+)$/.exec(e.ruta);
      if (!m || e.metodo !== 'PUT') continue;
      const cambio = e.cuerpo as { titulo: string; meta?: number };
      planes = planes.map(p =>
        p.eje !== m[1]
          ? p
          : { ...p, meses: p.meses.map(mes => (mes.numeroMes === Number(m[2]) ? { ...mes, titulo: cambio.titulo, editado: true, ...(cambio.meta !== undefined ? { cifra: cambio.meta } : {}) } : mes)) },
      );
    }
    return planes;
  }
  return datos;
});
