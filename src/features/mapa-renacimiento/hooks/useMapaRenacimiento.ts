import { useCallback, useEffect, useRef, useState } from 'react';

import * as habitsApi from '../../habits/api/habitsApi';
import * as objetivosApi from '../../objetivos/api/objetivosApi';
import type { DefinicionRocaMaestra, EjeObjetivo } from '../../objetivos/types/objetivos.types';
import type { AltaHabitoPersonal, CategoriaHabitoApi, DiaSemanaApi } from '../../habits/types/habits.types';
import { almacenMapa } from '../almacen';
import { completarHitos, definicionDeTerminado, redactar } from '../reglas';
import type { AccionMotora, Area, BloqueDia, DiaSemana, MapaRenacimiento, Objetivo, PasoMapa } from '../tipos';
import { AREAS, objetivoDe } from '../tipos';
import { mapaVacio } from '../tipos';

/**
 * Estado del Mapa de Renacimiento: carga el borrador, autoguarda cada cambio, lleva el paso y
 * ejecuta la activación.
 *
 * Reanudación (§2.1): se vuelve al último paso incompleto, nunca se reinicia el recorrido.
 * Anterior conserva datos; Continuar solo avanza con campos válidos — pero eso lo decide cada
 * pantalla con las reglas de `reglas.ts`, no este hook.
 */

const AUTOGUARDADO_MS = 250;

/** Área del mapa → categoría del catálogo de hábitos (las cuatro reales, `renaser.categorias_habito`). */
const CATEGORIA_POR_AREA: Record<Area, CategoriaHabitoApi> = {
  salud: 'BODY',
  negocio_dinero: 'MIND',
  relaciones: 'CONSCIENCE',
};

/** El hábito personal exige hora de disparo; el bloque del día se traduce a una hora razonable. */
const HORA_POR_BLOQUE: Record<BloqueDia, string> = {
  manana: '07:00:00',
  tarde: '15:00:00',
  noche: '20:00:00',
};

/**
 * El eje de Rocas al que corresponde cada área del Mapa. Es una traducción 1 a 1 y por eso vive
 * acá, en el único lugar que conoce los dos vocabularios: el Mapa habla de áreas (`salud`,
 * `negocio_dinero`, `relaciones`) y `rocks` habla de ejes (`CUERPO`, `TRABAJO`, `RELACIONES`).
 */
const EJE_POR_AREA: Record<Area, EjeObjetivo> = {
  salud: 'CUERPO',
  negocio_dinero: 'TRABAJO',
  relaciones: 'RELACIONES',
};

/**
 * Convierte un objetivo del Mapa en la definición que espera `PUT /rocks/master/{eje}`.
 *
 * **`meta`, `avance` y `unidad` van los tres o ninguno**: el backend rechaza media meta con un 400
 * (regla en tres capas — el command, `MetaCuantitativa` y un CHECK de V35). Por eso solo se mandan
 * cuando la línea base y el resultado son números de verdad.
 *
 * `avance` arranca en la línea base y no en cero: el aprendiz que baja de 82 a 75 kg NO empieza con
 * 0 de avance, empieza en 82 — y con cero la barra mostraría un progreso que no es.
 *
 * **Relaciones va siempre sin meta cuantitativa.** Su escala es 1-10, que no es una unidad de
 * negocio; mandarla como tal haría que la barra de avance mezclara peras con puntajes.
 */
function definicionDesde(objetivo: Objetivo): DefinicionRocaMaestra {
  const texto = (objetivo.metaRedactada || '').trim().slice(0, 500);
  if (objetivo.area === 'relaciones') {
    return { objetivo: texto };
  }
  const base = aNumeroDeMeta(objetivo.lineaBase);
  const meta = aNumeroDeMeta(objetivo.resultadoDia90);
  const unidad = (objetivo.area === 'salud' ? objetivo.unidad : objetivo.moneda).trim().slice(0, 20);
  if (base === null || meta === null || meta <= 0 || !unidad) {
    return { objetivo: texto };
  }
  return { objetivo: texto, meta, avance: base, unidad };
}

/** `"78,5 kg"` → `78.5`. `null` si no hay ningún número: entonces el objetivo es cualitativo. */
function aNumeroDeMeta(crudo: string): number | null {
  const limpio = (crudo || '').replace(',', '.').replace(/[^0-9.]/g, '');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/**
 * Los días de la acción con el vocabulario del backend (`java.time.DayOfWeek`). La V06 del mapa los
 * guarda como iniciales en castellano, y esa traducción vive acá porque es lo único que sabe de las
 * dos puntas.
 */
const NOMBRE_ISO: Record<DiaSemana, DiaSemanaApi> = {
  L: 'MONDAY',
  M: 'TUESDAY',
  X: 'WEDNESDAY',
  J: 'THURSDAY',
  V: 'FRIDAY',
  S: 'SATURDAY',
  D: 'SUNDAY',
};

/**
 * **Los días de la acción viajan al hábito** (2026-09-08). Hasta hoy no lo hacían y todo hábito
 * creado al activar corría los siete: quien había elegido "3 veces por semana" en V06 terminaba con
 * un hábito diario. `MAPA_RENACIMIENTO_DIA7.md` §2.6 lo llamaba *"la limitación más visible para el
 * aprendiz"*, y se resolvió del lado del servidor con `activeWeekdays`.
 *
 * Sin días elegidos se omite el campo, que del lado del servidor significa los siete — el mismo
 * comportamiento de antes para una acción que no los declaró.
 */
function altaDesde(accion: AccionMotora, metaCorta: string): AltaHabitoPersonal {
  return {
    title: accion.texto.trim(),
    habitType: 'CHECKBOX',
    category: CATEGORIA_POR_AREA[accion.area],
    template: 'OTRO',
    goalLabel: metaCorta || null,
    triggerTime: accion.momento ? HORA_POR_BLOQUE[accion.momento] : '09:00:00',
    limitTime: null,
    activeWeekdays: accion.dias.length > 0 ? accion.dias.map(d => NOMBRE_ISO[d]) : undefined,
  };
}

export interface EstadoMapaRenacimiento {
  mapa: MapaRenacimiento;
  cargando: boolean;
  activando: boolean;
  errorActivacion: string | null;
  actualizar: (cambio: (previo: MapaRenacimiento) => MapaRenacimiento) => void;
  irA: (paso: PasoMapa) => void;
  siguiente: () => void;
  anterior: () => void;
  /** Regenera la redacción SMART de un objetivo si la persona no la editó a mano. */
  redactarObjetivo: (area: Area) => void;
  activar: () => Promise<boolean>;
}

export function useMapaRenacimiento(userId: string): EstadoMapaRenacimiento {
  const [mapa, setMapa] = useState<MapaRenacimiento>(mapaVacio);
  const [cargando, setCargando] = useState(true);
  const [activando, setActivando] = useState(false);
  const [errorActivacion, setErrorActivacion] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cargado = useRef(false);

  useEffect(() => {
    let vigente = true;
    almacenMapa.leer(userId).then(guardado => {
      if (!vigente) return;
      if (guardado) setMapa(guardado);
      cargado.current = true;
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [userId]);

  // Autoguardado local inmediato (con un pequeño debounce para no escribir en cada tecla).
  useEffect(() => {
    if (!cargado.current) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      void almacenMapa.guardar(userId, mapa);
    }, AUTOGUARDADO_MS);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [mapa, userId]);

  const actualizar = useCallback((cambio: (previo: MapaRenacimiento) => MapaRenacimiento) => {
    setMapa(previo => {
      const nuevo = cambio(previo);
      return {
        ...nuevo,
        estado: nuevo.estado === 'no_iniciado' ? 'en_progreso' : nuevo.estado,
        iniciadoEn: nuevo.iniciadoEn ?? new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };
    });
  }, []);

  const irA = useCallback((paso: PasoMapa) => {
    actualizar(previo => ({ ...previo, pasoActual: paso }));
  }, [actualizar]);

  const siguiente = useCallback(() => {
    actualizar(previo => {
      const paso = Math.min(11, previo.pasoActual + 1) as PasoMapa;
      // Al entrar a Hitos (V08) se sugieren los que falten, sin pisar los ya editados.
      const hitos = paso === 8 ? completarHitos(previo) : previo.hitos;
      const estado = paso === 10 && definicionDeTerminado({ ...previo, hitos }).listo
        ? 'listo_para_revision'
        : previo.estado;
      return { ...previo, pasoActual: paso, hitos, estado: estado === 'no_iniciado' ? 'en_progreso' : estado };
    });
  }, [actualizar]);

  const anterior = useCallback(() => {
    actualizar(previo => ({ ...previo, pasoActual: Math.max(1, previo.pasoActual - 1) as PasoMapa }));
  }, [actualizar]);

  const redactarObjetivo = useCallback((area: Area) => {
    actualizar(previo => {
      if (area === 'salud' && !previo.salud.metaEditadaAMano) {
        return { ...previo, salud: { ...previo.salud, metaRedactada: redactar(previo.salud) } };
      }
      if (area === 'negocio_dinero' && !previo.negocio.metaEditadaAMano) {
        return { ...previo, negocio: { ...previo.negocio, metaRedactada: redactar(previo.negocio) } };
      }
      if (area === 'relaciones' && !previo.relaciones.metaEditadaAMano) {
        return { ...previo, relaciones: { ...previo.relaciones, metaRedactada: redactar(previo.relaciones) } };
      }
      return previo;
    });
  }, [actualizar]);

  /**
   * Activación (§5.3, AC-07). Idempotente: cada acción recuerda el id del hábito que creó, así
   * que un segundo toque —o un reintento tras un fallo a mitad— no duplica nada.
   *
   * **Primero las tres Rocas Maestras, después los hábitos** (2026-09-08). Son el objetivo de 90
   * días que el aprendiz acaba de escribir, y hasta hoy no salían del teléfono: se usaban solo
   * como etiqueta del hábito y `rocas_maestras` quedaba vacía — con la pantalla de Objetivos del
   * Plan bloqueada por eso mismo (D-119/RK-9).
   *
   * Y no es solo mostrarlas: **las tres maestras son la llave de toda la cadena de Rocas.** Sin
   * ellas, `POST /rocks/weekly` responde `403 ROCKS_LOCKED`, y sin la semanal no hay roca diaria
   * (`NO_WEEKLY_ROCK`). Escribirlas acá es lo que destraba el plan completo.
   *
   * Van ANTES que los hábitos a propósito: si algo falla, es preferible un mapa sin activar que
   * uno con hábitos creados y sin objetivos. `PUT` hace upsert por `(participante, eje)`, así que
   * reintentar es seguro — la misma garantía que ya tienen los hábitos por otro camino.
   *
   * Los hitos, los recordatorios y el aviso al mentor siguen esperando al backend del mapa.
   */
  const activar = useCallback(async (): Promise<boolean> => {
    setActivando(true);
    setErrorActivacion(null);
    let creados = { ...mapa.habitosCreados };
    try {
      for (const area of AREAS) {
        await objetivosApi.definirRocaMaestra(EJE_POR_AREA[area], definicionDesde(objetivoDe(mapa, area)));
      }
      for (const accion of mapa.acciones) {
        if (creados[accion.id]) continue;
        const objetivo = accion.area === 'salud' ? mapa.salud : accion.area === 'negocio_dinero' ? mapa.negocio : mapa.relaciones;
        const habito = await habitsApi.crearHabitoPersonal(altaDesde(accion, objetivo.metaRedactada.slice(0, 120)));
        creados = { ...creados, [accion.id]: habito.id };
        // Se persiste tras CADA alta: si la siguiente falla, la primera no se repite al reintentar.
        actualizar(previo => ({ ...previo, habitosCreados: creados }));
      }
      actualizar(previo => ({
        ...previo,
        estado: 'activo',
        activadoEn: previo.activadoEn ?? new Date().toISOString(),
        habitosCreados: creados,
        pasoActual: 11,
      }));
      return true;
    } catch (e) {
      setErrorActivacion(e instanceof Error ? e.message : 'No pudimos activar tu mapa. Intenta de nuevo.');
      actualizar(previo => ({ ...previo, habitosCreados: creados }));
      return false;
    } finally {
      setActivando(false);
    }
  }, [mapa, actualizar]);

  return { mapa, cargando, activando, errorActivacion, actualizar, irA, siguiente, anterior, redactarObjetivo, activar };
}
