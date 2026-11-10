import { almacen } from './almacen';

/**
 * Spec 048, fase 3 (FR-015, FR-016, FR-019, D13, D14, P9): lo que hiciste sin señal y el servidor NO aplicó, o aplicó sin puntos.
 * «Nada se pierde en silencio»: la hoja corta que se abre al entrar a Hoy y el globo del ícono de conexión lo dicen hasta que se ve.
 *
 * - Un aviso lleva el nombre de lo que no se aplicó, la hora en que lo hiciste, el motivo (el texto que escribió el servidor) y,
 *   cuando la persona escribió algo (Cierra tu día, Código Renaser), ese texto: para poder volver a hacerlo (P4, P5, P7).
 * - Va por cuenta y se borra al cerrar sesión. **No hay historial** (P9): al verse se quita.
 * - Lo ve la hoja de `AvisoDeLoNoAplicado` y lo cuenta el globo (`textoDelGlobo`).
 */
export type TipoDeAviso = 'no-aplicado' | 'sin-puntos' | 'no-se-pudo';

export interface AvisoDeLoNoAplicado {
  /** El `idCliente` del envío (más `:puntos` si es de puntos): un mismo envío no avisa dos veces. */
  id: string;
  tipo: TipoDeAviso;
  /** Lo que no se aplicó, en pocas palabras: «Tu cierre del día», «Código Renaser de las 10:00». */
  etiqueta: string;
  /** Instante ISO en que la persona lo hizo sin señal. */
  hechoEn: string;
  /** El `codigo` del servidor (`CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR`…), o `null`. */
  codigo: string | null;
  /** Texto listo para mostrar. */
  motivo: string;
  /** Lo que la persona escribió, para que pueda copiarlo y volver a hacerlo. */
  texto: string | null;
}

const PREFIJO = 'renaser.sinRed.avisos.';
const MAXIMO = 20;
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach(o => {
    try {
      o();
    } catch {
      /* un oyente roto no frena a los demás */
    }
  });
}

export function suscribirAvisos(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export async function leerAvisos(cuentaId: string): Promise<AvisoDeLoNoAplicado[]> {
  try {
    const crudo = await almacen().getItem(PREFIJO + cuentaId);
    const lista = crudo ? (JSON.parse(crudo) as AvisoDeLoNoAplicado[]) : [];
    return Array.isArray(lista) ? lista.filter(a => a && typeof a.id === 'string' && typeof a.motivo === 'string') : [];
  } catch {
    return [];
  }
}

async function guardar(cuentaId: string, lista: AvisoDeLoNoAplicado[]): Promise<void> {
  try {
    if (lista.length === 0) await almacen().removeItem(PREFIJO + cuentaId);
    else await almacen().setItem(PREFIJO + cuentaId, JSON.stringify(lista.slice(-MAXIMO)));
  } catch {
    /* sin lugar: el aviso se pierde, no la app */
  }
}

/** Anota un aviso. Si ya había uno del mismo envío, lo reemplaza (un reintento no avisa dos veces). */
export async function agregarAviso(cuentaId: string, aviso: AvisoDeLoNoAplicado): Promise<void> {
  const previos = (await leerAvisos(cuentaId)).filter(a => a.id !== aviso.id);
  await guardar(cuentaId, [...previos, aviso]);
  avisar();
}

/** Ya se vieron: se quitan (no hay historial, P9). */
export async function descartarAvisos(cuentaId: string): Promise<void> {
  await guardar(cuentaId, []);
  avisar();
}

export async function borrarAvisos(cuentaId: string): Promise<void> {
  await guardar(cuentaId, []);
  avisar();
}

/** Los códigos con que el servidor dice «no se aplicó» (conjunto cerrado, contrato de la fase 3). */
export const CODIGOS_DE_NO_APLICADO = [
  'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR',
  'YA_ESTABA_HECHO',
  'RECURSO_YA_NO_EXISTE',
  'FUERA_DE_SU_DIA',
  'MI_RADAR_NO_APLICA',
] as const;

export function esCodigoDeNoAplicado(codigo: string | null | undefined): boolean {
  return typeof codigo === 'string' && (CODIGOS_DE_NO_APLICADO as readonly string[]).includes(codigo);
}

/** Si el servidor no mandó su texto, el de la app (en tuteo). */
const MOTIVO_POR_CODIGO: Record<string, string> = {
  CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR: 'Esto cambió en tu cuenta después de que lo hiciste sin conexión. Se quedó lo más nuevo.',
  YA_ESTABA_HECHO: 'Esto ya estaba hecho en tu cuenta. Se quedó lo que ya había.',
  RECURSO_YA_NO_EXISTE: 'Lo que tocaste ya no existe en tu cuenta. Se quedó lo del servidor.',
  FUERA_DE_SU_DIA: 'Esto era de un día que ya terminó y no se pudo aplicar.',
  MI_RADAR_NO_APLICA: 'Mi Radar no tenía esa hora para ti, así que no se guardó ese Código Renaser.',
};

export const MOTIVO_NO_SE_PUDO = 'El servidor no pudo aplicar esto. Vuelve a hacerlo con conexión.';

export function motivoDeNoAplicado(codigo: string | null, mensajeDelServidor: string | null | undefined): string {
  const propio = mensajeDelServidor?.trim();
  if (propio) return propio;
  return (codigo && MOTIVO_POR_CODIGO[codigo]) || MOTIVO_NO_SE_PUDO;
}

/** Por qué un envío que SÍ llegó quedó sin puntos (FR-015). `null` si el motivo no se reconoce: igual se avisa en general. */
const MOTIVO_SIN_PUNTOS: Record<string, string> = {
  LLEGO_DESPUES_DE_48_H: 'Llegó más de 48 horas después de que lo hiciste, así que quedó registrado sin puntos.',
  HORA_FUTURA: 'La hora del teléfono marcaba un momento que todavía no llegaba, así que quedó registrado sin puntos.',
  FUERA_DE_SU_DIA: 'Era de un día que ya terminó, así que quedó registrado sin puntos.',
  YA_ESTABA_HECHO: 'Ya estaba hecho en tu cuenta, así que no sumó puntos otra vez.',
};

export function motivoDeSinPuntos(codigo: string): string {
  return MOTIVO_SIN_PUNTOS[codigo] ?? 'Quedó registrado sin puntos.';
}

/** Anota que algo llegó pero sin puntos (FR-015): la hoja de Hoy lo dice con su motivo. */
export async function avisarSinPuntos(
  cuentaId: string,
  datos: { idCliente: string; etiqueta: string; hechoEn: string; motivoSinPuntos: string },
): Promise<void> {
  await agregarAviso(cuentaId, {
    id: `${datos.idCliente}:puntos`,
    tipo: 'sin-puntos',
    etiqueta: datos.etiqueta,
    hechoEn: datos.hechoEn,
    codigo: datos.motivoSinPuntos,
    motivo: motivoDeSinPuntos(datos.motivoSinPuntos),
    texto: null,
  });
}
