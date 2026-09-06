import { useCallback, useEffect, useRef, useState } from 'react';

import * as habitsApi from '../../habits/api/habitsApi';
import type { AltaHabitoPersonal, CategoriaHabitoApi } from '../../habits/types/habits.types';
import { almacenMapa } from '../almacen';
import { completarHitos, definicionDeTerminado, redactar } from '../reglas';
import type { AccionMotora, Area, BloqueDia, MapaRenacimiento, PasoMapa } from '../tipos';
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

function altaDesde(accion: AccionMotora, metaCorta: string): AltaHabitoPersonal {
  return {
    title: accion.texto.trim(),
    habitType: 'CHECKBOX',
    category: CATEGORIA_POR_AREA[accion.area],
    template: 'OTRO',
    goalLabel: metaCorta || null,
    triggerTime: accion.momento ? HORA_POR_BLOQUE[accion.momento] : '09:00:00',
    limitTime: null,
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
   * que un segundo toque —o un reintento tras un fallo a mitad— no duplica nada. Lo que hoy
   * puede automatizarse desde el cliente es crear los hábitos (`POST /api/v1/habits`); hitos,
   * recordatorios, control semanal y aviso al mentor esperan al backend del mapa.
   */
  const activar = useCallback(async (): Promise<boolean> => {
    setActivando(true);
    setErrorActivacion(null);
    let creados = { ...mapa.habitosCreados };
    try {
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
