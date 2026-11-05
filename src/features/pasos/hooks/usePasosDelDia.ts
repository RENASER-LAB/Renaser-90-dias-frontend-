import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { mensajeDeError } from '../../../services/http/apiClient';
import { DiaDeHabitosCambiadoError } from '../../habits/api/registroVigente';
import { registrarKilometrosAutomaticos } from '../api/pasosApi';
import {
  abrirHealthConnect,
  leerLosPasosDelDia,
  pedirPermisosDeSalud,
  permisosDeSalud,
  soporteDeSalud,
} from '../services/saludConectada';
import {
  anotarElIntento,
  borrarElIntento,
  borrarLaConexion,
  guardarLaConexion,
  hayUnIntentoReciente,
  leerLaConexion,
} from '../services/conexionDeLosPasos';
import type { LecturaDelDia } from '../types/pasos.types';
import { armarLaLectura, cuerpoParaElServidor } from '../utils/lecturaDelDia';
import { TEXTOS_DE_PASOS } from '../utils/textosDePasos';
import {
  vistaDeKilometros,
  type EstadoDelSoporte,
  type MedicionDelDia,
  type VistaDeKilometros,
} from '../utils/vistaDeKilometros';

/**
 * Los pasos de hoy para el hábito «Kilómetros diarios» de Training (spec 037, D-310). Un solo hook que junta lo que cambia
 * con el tiempo —el soporte del teléfono, el consentimiento, el permiso y la lectura de Health Connect— y entrega una
 * `vista` ya decidida (`vistaDeKilometros`, pura) y las acciones: conectar, actualizar, desconectar y registrar.
 *
 * **Cuándo lee** (no hay segundo plano ni tiempo real; el sistema escribe en lotes de ~1 minuto): al abrir Training, al volver
 * a primer plano, al tocar «Actualizar» y justo antes de registrar. Entre lecturas automáticas pasan al menos 30 s.
 * **Cuándo NO lee**: sin soporte, sin conectar, sin permiso, con el hábito ya cumplido, fuera de Training o en otro día.
 *
 * **Registrar** vuelve a leer, comprueba que la meta siga cumplida y envía; antes de enviar, `ejecutarEnRegistroVigente`
 * compara el id y el día del registro (regla del 17-oct). Si el día cambió no se manda nada: se recarga y se avisa.
 */

/** Entre dos lecturas automáticas. `actualizar` y `registrar` leen siempre. */
export const MINIMO_ENTRE_LECTURAS_MS = 30_000;

export interface HabitoDeKilometros {
  /** El id del registro de hoy (`HabitItem.id`). */
  id: string;
  /** `YYYY-MM-DD` del día del registro. */
  fechaEjecucion?: string | null;
  done: boolean;
  medicion?: (MedicionDelDia & { totalPrevio?: number }) | null;
}

export interface PasosEnTraining {
  /** El id del registro de «Kilómetros diarios» de hoy, o `null` si hoy no hay uno. */
  registroId: string | null;
  vista: VistaDeKilometros;
  /** «14:05» si se conectó hoy (para «Hoy contamos desde las 14:05.»). */
  conectadoHoyA: string | null;
  leyendo: boolean;
  registrando: boolean;
  /** Conectar: acepta la hoja y pide el permiso. `true` si quedó conectado. */
  conectar: () => Promise<boolean>;
  actualizar: () => Promise<void>;
  /** Olvida la conexión de este teléfono y abre Health Connect para quitar el permiso. */
  desconectar: () => void;
  registrar: () => Promise<void>;
  abrirHealthConnect: () => void;
}

/** Medianoche local del día del registro (o de hoy si no se sabe). */
export function inicioDelDia(fechaEjecucion: string | null | undefined, ahora: Date): Date {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaEjecucion ?? '');
  if (!partes) return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
}

function dosCifras(n: number): string {
  return String(n).padStart(2, '0');
}

/** «14:05» si `conectadoEn` cae en el día del registro (hora del teléfono); si no, `null`. */
export function horaDeConexionDeHoy(conectadoEn: string | null, fechaEjecucion: string | null | undefined): string | null {
  if (!conectadoEn || !fechaEjecucion) return null;
  const cuando = new Date(conectadoEn);
  if (Number.isNaN(cuando.getTime())) return null;
  const dia = `${cuando.getFullYear()}-${dosCifras(cuando.getMonth() + 1)}-${dosCifras(cuando.getDate())}`;
  return dia === fechaEjecucion.slice(0, 10) ? `${dosCifras(cuando.getHours())}:${dosCifras(cuando.getMinutes())}` : null;
}

export function usePasosDelDia({
  cuentaId,
  habito,
  activo,
  alRegistrado,
  alCambiarElDia,
}: {
  cuentaId: string | null;
  habito: HabitoDeKilometros | null;
  /** Training a la vista y en el día de hoy. */
  activo: boolean;
  /** El servidor cerró el hábito: quien monta refleja el cierre y avisa. */
  alRegistrado: (registroId: string, resultado: { puntosOtorgados: number; km: number }) => void;
  /** El día cambió con la pantalla abierta: se recarga Training. */
  alCambiarElDia: () => void;
}): PasosEnTraining {
  const [soporte, setSoporte] = useState<EstadoDelSoporte>('cargando');
  const [conectadoEn, setConectadoEn] = useState<string | null | undefined>(undefined);
  const [permisos, setPermisos] = useState<'otorgados' | 'faltan' | null>(null);
  const [lectura, setLectura] = useState<LecturaDelDia | null>(null);
  const [errorDeLectura, setErrorDeLectura] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const registroId = habito?.id ?? null;
  const cumplido = habito?.done ?? false;
  const meta = habito?.medicion?.meta ?? null;
  const conectado = conectadoEn === undefined ? null : conectadoEn !== null;
  /** Se puede leer: Training a la vista, el hábito de hoy sin cumplir, con meta y con Health Connect en el teléfono. */
  const sePuedeLeer = activo && !!registroId && !cumplido && meta != null && soporte === 'disponible';
  /** Y además la persona lo conectó y dejó el permiso: así se lee solo, sin que nadie lo pida. */
  const hayQueLeer = sePuedeLeer && conectado === true && permisos === 'otorgados';

  /* Lo último que se supo, para que las acciones no dependan de renders anteriores. */
  const vivo = useRef({ habito, hayQueLeer, sePuedeLeer, meta });
  vivo.current = { habito, hayQueLeer, sePuedeLeer, meta };
  const ultimaLecturaMs = useRef(0);
  const turno = useRef(0);
  const registrandoAhora = useRef(false);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  /* El soporte y la conexión de esta cuenta, una vez. */
  useEffect(() => {
    let vigente = true;
    void soporteDeSalud().then(estado => vigente && setSoporte(estado));
    return () => {
      vigente = false;
    };
  }, []);
  useEffect(() => {
    let vigente = true;
    setConectadoEn(undefined);
    setLectura(null);
    if (!cuentaId) {
      setConectadoEn(null);
      return;
    }
    void leerLaConexion(cuentaId).then(c => vigente && setConectadoEn(c.conectadoEn));
    return () => {
      vigente = false;
    };
  }, [cuentaId]);

  const refrescarPermisos = useCallback(async () => {
    const estado = await permisosDeSalud();
    if (montado.current) setPermisos(estado);
    return estado;
  }, []);
  useEffect(() => {
    if (soporte === 'disponible' && conectado === true) void refrescarPermisos();
  }, [soporte, conectado, refrescarPermisos]);

  /** Deja anotada la conexión de esta cuenta (lo que hace «Conectar» al terminar bien) y borra la nota del intento. */
  const quedarConectada = useCallback(async (): Promise<void> => {
    if (!cuentaId) return;
    const ahora = new Date();
    await guardarLaConexion(cuentaId, ahora);
    await borrarElIntento(cuentaId);
    if (montado.current) {
      setConectadoEn(ahora.toISOString());
      setPermisos('otorgados');
    }
    ultimaLecturaMs.current = 0;
  }, [cuentaId]);

  /**
   * Si la persona tocó «Conectar» hace poco, el sistema ya tiene el permiso y la conexión no quedó anotada (Android cerró la app con
   * el diálogo abierto y la respuesta se perdió con ella), se termina de conectar sin pedir nada otra vez. Sin intento reciente no se
   * conecta nada solo, aunque el permiso exista: el consentimiento es el toque en «Conectar».
   */
  const reconciliandoElIntento = useRef(false);
  const reconciliarElIntento = useCallback(async (): Promise<void> => {
    if (!cuentaId || reconciliandoElIntento.current) return;
    reconciliandoElIntento.current = true;
    try {
      if (!(await hayUnIntentoReciente(cuentaId, new Date()))) return;
      // Con relecturas: al volver del diálogo, en algunos teléfonos el permiso aparece unos instantes después.
      if ((await permisosDeSalud()) !== 'otorgados') return;
      await quedarConectada();
    } finally {
      reconciliandoElIntento.current = false;
    }
  }, [cuentaId, quedarConectada]);
  useEffect(() => {
    if (soporte === 'disponible' && conectado === false) void reconciliarElIntento();
  }, [soporte, conectado, reconciliarElIntento]);

  /**
   * Lee Health Connect. Con `forzar` es una acción de la persona («Actualizar», «Registrar»): ignora el enfriamiento y el
   * permiso que todavía no se hubiera reflejado en un render. Devuelve la lectura, o `null` si no se pudo o no hacía falta.
   */
  const leer = useCallback(async (forzar: boolean): Promise<LecturaDelDia | null> => {
    const { habito: actual, hayQueLeer: sePuede, sePuedeLeer: sePuedeSiempre } = vivo.current;
    if (!(forzar ? sePuedeSiempre : sePuede) || !actual) return null;
    const ahora = new Date();
    if (!forzar && ahora.getTime() - ultimaLecturaMs.current < MINIMO_ENTRE_LECTURAS_MS) return null;
    ultimaLecturaMs.current = ahora.getTime();
    const mio = (turno.current += 1);
    setLeyendo(true);
    try {
      const cruda = await leerLosPasosDelDia(inicioDelDia(actual.fechaEjecucion, ahora), ahora);
      const nueva = armarLaLectura(cruda, ahora);
      if (montado.current && mio === turno.current) {
        setLectura(nueva);
        setErrorDeLectura(false);
      }
      return nueva;
    } catch {
      if (montado.current && mio === turno.current) setErrorDeLectura(true);
      return null;
    } finally {
      if (montado.current && mio === turno.current) setLeyendo(false);
    }
  }, []);

  /* Al abrir Training (y cuando todo está listo) y al volver a primer plano. */
  useEffect(() => {
    if (hayQueLeer) void leer(false);
  }, [hayQueLeer, registroId, leer]);
  useEffect(() => {
    if (!activo) return undefined;
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado !== 'active') return;
      if (vivo.current.habito && soporte === 'disponible' && conectado === true) {
        void refrescarPermisos().then(() => leer(false));
      } else if (soporte === 'disponible' && conectado === false) {
        void reconciliarElIntento();
      }
    });
    return () => suscripcion.remove();
  }, [activo, soporte, conectado, refrescarPermisos, leer, reconciliarElIntento]);

  const conectar = useCallback(async (): Promise<boolean> => {
    if (!cuentaId) return false;
    // Antes del diálogo: si Android cierra la app mientras está abierto, esta nota permite terminar de conectar al volver.
    await anotarElIntento(cuentaId, new Date());
    if (!(await pedirPermisosDeSalud())) {
      // La nota del intento NO se borra (#127): en algunos teléfonos el diálogo contesta «vacío» apenas se abre, mientras la persona
      // todavía está eligiendo. Si después acepta, al volver a primer plano `reconciliarElIntento` encuentra el permiso y termina de
      // conectar sin otro toque. La nota vence sola a los 15 minutos; sin el permiso en el sistema no conecta nada.
      if (montado.current) setPermisos('faltan');
      return false;
    }
    await quedarConectada();
    return true;
  }, [cuentaId, quedarConectada]);

  const actualizar = useCallback(async (): Promise<void> => {
    // El permiso pudo cambiar en Health Connect mientras la app estaba abierta: se vuelve a preguntar y, si lo hay, se lee.
    if ((await refrescarPermisos()) === 'otorgados') await leer(true);
  }, [refrescarPermisos, leer]);

  const desconectar = useCallback(() => {
    if (cuentaId) void borrarLaConexion(cuentaId);
    setConectadoEn(null);
    setLectura(null);
    setErrorDeLectura(false);
    abrirHealthConnect();
  }, [cuentaId]);

  const registrar = useCallback(async (): Promise<void> => {
    const { habito: actual, meta: metaActual } = vivo.current;
    if (registrandoAhora.current || !actual || metaActual == null) return;
    registrandoAhora.current = true;
    setRegistrando(true);
    try {
      // La lectura más fresca posible: es la que se manda y la que se compara con la meta.
      const fresca = await leer(true);
      const cuerpo = fresca ? cuerpoParaElServidor(fresca) : null;
      if (!fresca || !cuerpo || fresca.km < metaActual) {
        Alert.alert(TEXTOS_DE_PASOS.errores.noSePudoRegistrar);
        return;
      }
      const cerrado = await registrarKilometrosAutomaticos(actual.id, cuerpo);
      alRegistrado(actual.id, { puntosOtorgados: cerrado.puntosOtorgados, km: fresca.km });
    } catch (e) {
      if (e instanceof DiaDeHabitosCambiadoError) {
        Alert.alert('Tu día cambió', e.message);
        alCambiarElDia();
      } else {
        Alert.alert('No pudimos registrar tus km', mensajeDeError(e, TEXTOS_DE_PASOS.errores.noSePudoRegistrar));
      }
    } finally {
      registrandoAhora.current = false;
      if (montado.current) setRegistrando(false);
    }
  }, [leer, alRegistrado, alCambiarElDia]);

  const conectadoHoyA = useMemo(
    () => horaDeConexionDeHoy(conectadoEn ?? null, habito?.fechaEjecucion),
    [conectadoEn, habito?.fechaEjecucion],
  );
  const vista = useMemo(
    () =>
      vistaDeKilometros({
        medicion: habito?.medicion ?? null,
        cumplido,
        soporte,
        conectado,
        permisos,
        lectura,
        errorDeLectura,
        conectadoHoyA,
      }),
    [habito?.medicion, cumplido, soporte, conectado, permisos, lectura, errorDeLectura, conectadoHoyA],
  );

  return {
    registroId,
    vista,
    conectadoHoyA,
    leyendo,
    registrando,
    conectar,
    actualizar,
    desconectar,
    registrar,
    abrirHealthConnect,
  };
}
