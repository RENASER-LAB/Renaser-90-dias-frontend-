import { useCallback, useEffect, useRef, useState } from 'react';

import { falloDeLectura, obtenerResumenPorGrupos, obtenerSemaforoDelGrupo, type OrigenDelGrupo } from '../api/semaforoApi';
import type { ResumenPorGrupos, SemaforoDelGrupo, VentanaSemanal } from '../types/semaforo.types';
import {
  claveDePosicion,
  rangoDePosicion,
  semanaAnterior,
  semanaSiguiente,
  VIGENTE,
  type PosicionSemanal,
} from '../utils/semanasDelSemaforo';
import type { FalloSemaforo } from './useMiSemaforo';

/** Desde qué semana arranca una lectura, y con qué ancla (el `hasta` de la ventana vigente). */
export interface InicioSemanal {
  posicion: PosicionSemanal;
  hastaVigente: string | null;
}

/** Lo que una pantalla necesita para mostrar una lectura por semanas y moverse entre ellas. */
export interface LecturaPorSemana<T> {
  /** Lo que dijo el servidor para la posición actual. `null` mientras carga o si falló. */
  datos: T | null;
  posicion: PosicionSemanal;
  /** Qué días se miran: los de la respuesta o, mientras llega, los que corresponden a la posición. */
  rango: { desde: string; hasta: string } | null;
  /** Si la semana ya cerró. `null` mientras no hay respuesta. */
  cerrada: boolean | null;
  cargando: boolean;
  fallo: FalloSemaforo | null;
  /** El texto técnico del último fallo: le ahorra media hora a quien mantiene la app. */
  detalleDelFallo: string | null;
  puedeAnterior: boolean;
  puedeSiguiente: boolean;
  anterior: () => void;
  siguiente: () => void;
  /** Vuelve a los últimos 7 días; si ya estaba ahí, los relee. */
  volverAVigente: () => void;
  recargar: () => void;
  /** Para abrir otra lectura parada en la misma semana (del resumen por grupos a la tabla de uno). */
  inicio: InicioSemanal;
}

/**
 * Una lectura del semáforo que se puede mirar semana por semana: la tabla de un grupo (§4.3) y el
 * resumen por grupos (§4.4) comparten la forma y la navegación, y solo cambia a quién se pregunta.
 *
 * - Arranca en la ventana vigente (sin `semanaHasta`), que es lo que el contrato da por defecto.
 * - "Anterior" y "siguiente" van por semanas sábado→viernes, calculadas desde el `hasta` que
 *   devolvió el servidor, nunca desde el reloj del teléfono (`utils/semanasDelSemaforo.ts`).
 * - `clave` `null` = inactiva: no se pregunta nada (quien no tiene el rol no paga una petición).
 *   Otra clave —otro grupo— empieza de cero.
 * - Cada lectura toma un turno y solo la última escribe: tocar "anterior" tres veces rápido no deja
 *   en pantalla la respuesta de la primera que llegó tarde.
 *
 * Se carga al montar y al cambiar de semana, no en cada foco: estas vistas viven dentro de Hoy o de
 * Administración, y el barrido corre una vez por hora; "Reintentar" y volver a entrar alcanzan.
 */
export function useLecturaPorSemana<T extends VentanaSemanal>(
  leer: (semanaHasta: string | null) => Promise<T>,
  clave: string | null,
  inicio?: InicioSemanal,
): LecturaPorSemana<T> {
  const leerActual = useRef(leer);
  leerActual.current = leer;

  const [posicion, setPosicion] = useState<PosicionSemanal>(inicio?.posicion ?? VIGENTE);
  const [hastaVigente, setHastaVigente] = useState<string | null>(inicio?.hastaVigente ?? null);
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(clave !== null);
  const [fallo, setFallo] = useState<FalloSemaforo | null>(null);
  const [detalleDelFallo, setDetalleDelFallo] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const turno = useRef(0);

  /* Otra clave es otra cosa que mirar: se empieza de cero, en la ventana vigente. Se ajusta durante
     el render (y no en un efecto) para que la primera lectura del grupo nuevo ya salga con la
     posición buena, sin una petición de más con la semana del grupo anterior. */
  const [claveVista, setClaveVista] = useState(clave);
  if (claveVista !== clave) {
    setClaveVista(clave);
    setPosicion(VIGENTE);
    setHastaVigente(null);
    setDatos(null);
    setFallo(null);
    setDetalleDelFallo(null);
  }

  const semanaHasta = posicion.modo === 'semana' ? posicion.semanaHasta : null;

  useEffect(() => {
    if (clave === null) {
      setCargando(false);
      return;
    }
    const miTurno = ++turno.current;
    setCargando(true);
    leerActual
      .current(semanaHasta)
      .then(nuevo => {
        if (miTurno !== turno.current) return;
        setDatos(nuevo);
        setFallo(null);
        setDetalleDelFallo(null);
        /* El ancla de la navegación: solo la ventana vigente la fija. */
        if (semanaHasta === null) setHastaVigente(nuevo.hasta);
      })
      .catch((e: unknown) => {
        if (miTurno !== turno.current) return;
        setDatos(null);
        setFallo(falloDeLectura(e));
        setDetalleDelFallo(e instanceof Error ? e.message : null);
      })
      .finally(() => {
        if (miTurno === turno.current) setCargando(false);
      });
    return () => {
      /* Lo que llegue después de desmontar, o de pedir otra semana, ya no escribe. */
      turno.current++;
    };
  }, [clave, semanaHasta, vuelta]);

  const irA = useCallback(
    (nueva: PosicionSemanal | null) => {
      if (!nueva || claveDePosicion(nueva) === claveDePosicion(posicion)) return;
      /* Los datos de la semana anterior no se dejan a la vista con el rótulo de la nueva. */
      setDatos(null);
      setFallo(null);
      setDetalleDelFallo(null);
      setPosicion(nueva);
    },
    [posicion],
  );

  const recargar = useCallback(() => setVuelta(v => v + 1), []);

  const anteriorPosicion = semanaAnterior(posicion, hastaVigente);
  const siguientePosicion = semanaSiguiente(posicion, hastaVigente);

  return {
    datos,
    posicion,
    rango: datos ? { desde: datos.desde, hasta: datos.hasta } : rangoDePosicion(posicion, hastaVigente),
    cerrada: datos ? datos.cerrada : null,
    cargando,
    fallo,
    detalleDelFallo,
    puedeAnterior: anteriorPosicion !== null,
    puedeSiguiente: siguientePosicion !== null,
    anterior: () => irA(anteriorPosicion),
    siguiente: () => irA(siguientePosicion),
    volverAVigente: () => (posicion.modo === 'vigente' ? recargar() : irA(VIGENTE)),
    recargar,
    inicio: { posicion, hastaVigente },
  };
}

export type LecturaDelGrupo = LecturaPorSemana<SemaforoDelGrupo>;
export type LecturaDeGrupos = LecturaPorSemana<ResumenPorGrupos>;

/**
 * La tabla de un grupo, CON nombres (§4.3): el mentor por su puerta, administración por la suya.
 * `origen` `null` = todavía no se sabe qué grupo es; no se pregunta nada.
 */
export function useSemaforoDelGrupo(origen: OrigenDelGrupo | null, inicio?: InicioSemanal): LecturaDelGrupo {
  const clave = origen ? `${origen.quien}:${origen.grupoId}` : null;
  return useLecturaPorSemana(
    semanaHasta => (origen ? obtenerSemaforoDelGrupo(origen, semanaHasta) : Promise.reject(new Error('Sin grupo'))),
    clave,
    inicio,
  );
}

/**
 * El resumen por grupos, SIN nombres (§4.4). `activo` lo decide quien lo usa según el rol: al resto
 * no se le hace esta petición, y al que no le corresponde el servidor le responde 403 igual.
 */
export function useResumenPorGrupos(activo: boolean): LecturaDeGrupos {
  return useLecturaPorSemana(obtenerResumenPorGrupos, activo ? 'grupos' : null);
}
