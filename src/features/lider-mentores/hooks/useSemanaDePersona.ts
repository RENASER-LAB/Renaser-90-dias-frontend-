import { useCallback, useEffect, useRef, useState } from 'react';

import { falloDeLectura } from '../../semaforo/api/semaforoApi';
import type { FalloSemaforo } from '../../semaforo/hooks/useMiSemaforo';
import { sumarDias } from '../../semaforo/utils/lecturaDelSemaforo';
import { obtenerSemanaDePersona } from '../api/cumplimientoDelLiderApi';
import type { SemanaDePersona } from '../types/cumplimientoDelLider.types';
import { puedeIrALaAnterior, rotuloDeLaSemana, semanaAnteriorDe } from '../utils/navegacionDeLaSemana';

/** Lo que una pantalla necesita para mostrar la semana de una persona y moverse entre semanas. */
export interface LecturaDeLaSemana {
  /** Lo que dijo el servidor para la semana pedida. `null` mientras carga o si falló: nunca la de antes. */
  datos: SemanaDePersona | null;
  /** El viernes pedido; `null` = la semana en curso, que la define el servidor. */
  semanaHasta: string | null;
  /** Qué semana se está mirando, escrita: sale de la respuesta o, mientras llega, de la semana pedida. */
  rotulo: { titulo: string; rango: string | null };
  cargando: boolean;
  fallo: FalloSemaforo | null;
  /** El texto técnico del último fallo (le ahorra media hora a quien mantiene la app). */
  detalleDelFallo: string | null;
  puedeAnterior: boolean;
  puedeSiguiente: boolean;
  /** Se está mirando una semana pasada: hay un atajo a la semana en curso (FR-010). */
  puedeVolverAEstaSemana: boolean;
  anterior: () => void;
  siguiente: () => void;
  /** Salta a la semana en curso sin recorrer las de en medio. */
  volverAEstaSemana: () => void;
  recargar: () => void;
}

/** Lo que se recuerda de la persona entre semana y semana: cuándo empezó y qué viernes es el de esta semana. */
interface Ancla {
  primeraSemana: string | null;
  viernesEnCurso: string | null;
}

const SIN_ANCLA: Ancla = { primeraSemana: null, viernesEnCurso: null };

/**
 * La semana de una persona del grupo, de sábado a viernes (spec 005; `GET /leadership/groups/{g}/people/{p}/week`).
 *
 * - **Una respuesta vieja nunca pisa a una nueva**: cada lectura toma un turno y solo la última escribe.
 *   Tocar «anterior» tres veces rápido no deja en pantalla la respuesta de la primera que llegó tarde.
 * - **Al cambiar de persona o de semana no queda a la vista el dato anterior, ni por un instante**: los datos
 *   se vacían en el mismo render del cambio, no cuando llega la respuesta nueva (SC-005). El cambio de persona
 *   se ajusta durante el render —y no en un efecto— para que la primera lectura ya salga con la semana buena.
 * - **Si falla, se dice y se puede reintentar**; no quedan datos viejos que parezcan de ahora.
 * - **Cada lectura deja un registro de consulta en el servidor** (FR-016): se pide al abrir la ficha y al
 *   cambiar de semana, no en cada foco ni en un sondeo.
 *
 * La navegación se apoya en la semana PEDIDA y no en la última que llegó: tras un fallo se puede seguir
 * moviéndose, y dos toques seguidos no se pierden mientras la primera lectura sigue en vuelo.
 *
 * @param inicio el viernes con que se abre (la semana en que estaba la lista); `null` o ausente = la en curso.
 */
export function useSemanaDePersona(grupoId: string, personaId: string, inicio?: string | null): LecturaDeLaSemana {
  const clave = `${grupoId}|${personaId}`;
  const [pedida, setPedida] = useState<string | null>(inicio ?? null);
  const [datos, setDatos] = useState<SemanaDePersona | null>(null);
  const [ancla, setAncla] = useState<Ancla>(SIN_ANCLA);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloSemaforo | null>(null);
  const [detalleDelFallo, setDetalleDelFallo] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const turno = useRef(0);

  /* Otra persona es otra cosa que mirar: se empieza de cero, ya en este render. */
  const [claveVista, setClaveVista] = useState(clave);
  if (claveVista !== clave) {
    setClaveVista(clave);
    setPedida(inicio ?? null);
    setDatos(null);
    setAncla(SIN_ANCLA);
    setCargando(true);
    setFallo(null);
    setDetalleDelFallo(null);
  }

  useEffect(() => {
    const miTurno = ++turno.current;
    setCargando(true);
    obtenerSemanaDePersona(grupoId, personaId, pedida)
      .then(semana => {
        if (miTurno !== turno.current) return;
        setDatos(semana);
        setFallo(null);
        setDetalleDelFallo(null);
        setAncla(antes => ({
          primeraSemana: semana.primeraSemana ?? antes.primeraSemana,
          viernesEnCurso: semana.semanaEnCurso ? semana.hasta : antes.viernesEnCurso,
        }));
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
  }, [grupoId, personaId, pedida, vuelta]);

  /** El viernes de la semana que se mira o se está pidiendo; `null` si todavía no se sabe cuál es. */
  const viernesActual = datos?.hasta ?? pedida ?? ancla.viernesEnCurso;
  const enCurso = datos ? datos.semanaEnCurso : pedida === null || pedida === ancla.viernesEnCurso;

  const puedeAnterior = viernesActual !== null && puedeIrALaAnterior(viernesActual, ancla.primeraSemana);
  const puedeSiguiente = viernesActual !== null && !enCurso;

  /* Cambiar de semana: los datos de la anterior no se dejan a la vista con el rótulo de la nueva. */
  const irA = useCallback(
    (nueva: string | null) => {
      setDatos(null);
      setFallo(null);
      setDetalleDelFallo(null);
      setCargando(true);
      /* La misma semana no cambia las dependencias del efecto: se vuelve a leer a mano. */
      if (nueva === pedida) setVuelta(v => v + 1);
      else setPedida(nueva);
    },
    [pedida],
  );

  const anterior = () => {
    if (!puedeAnterior || viernesActual === null) return;
    const destino = semanaAnteriorDe(viernesActual, ancla.primeraSemana);
    if (destino) irA(destino);
  };

  const siguiente = () => {
    if (!puedeSiguiente || viernesActual === null) return;
    const destino = sumarDias(viernesActual, 7);
    /* Llegar a la semana en curso es volver a pedirla sin fecha: la define el servidor. */
    irA(ancla.viernesEnCurso !== null && destino >= ancla.viernesEnCurso ? null : destino);
  };

  /* Pasadas varias semanas atrás, volver de a una es tedioso: un atajo a la en curso, que define el servidor. */
  const puedeVolverAEstaSemana = !enCurso;
  const volverAEstaSemana = () => {
    if (puedeVolverAEstaSemana) irA(null);
  };

  const recargar = useCallback(() => setVuelta(v => v + 1), []);

  return {
    datos,
    semanaHasta: pedida,
    rotulo: datos ? rotuloDeLaSemana(datos) : rotuloDeLaSemana({ hasta: pedida ?? ancla.viernesEnCurso }),
    cargando,
    fallo,
    detalleDelFallo,
    puedeAnterior,
    puedeSiguiente,
    puedeVolverAEstaSemana,
    anterior,
    siguiente,
    volverAEstaSemana,
    recargar,
  };
}
