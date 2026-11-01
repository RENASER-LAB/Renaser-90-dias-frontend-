import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Keyboard } from 'react-native';

import { ApiError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { preguntasQueFaltan } from '../api/diagnosticoApi';
import type { PropiedadesDelRecorrido, ResultadoDeTerminar } from '../types/diagnostico.types';
import { borrarBorrador, guardarBorrador, leerBorrador } from '../utils/borradorLocal';
import {
  armarPasos,
  indiceInicial,
  primeraQueFalta,
  rellenoPorSeccion,
  type PasoDelRecorrido,
} from '../utils/pasosDelRecorrido';
import {
  aRespuesta,
  desdeRespuesta,
  respuestaDe,
  valoresIniciales,
  type RespuestaEnEdicion,
  type ValoresDelDiagnostico,
} from '../utils/respuestasEnEdicion';
import { FALLO_AL_GUARDAR, FALLO_AL_TERMINAR, FALTA_ALGO_SIN_UBICAR } from '../utils/textosDelDiagnostico';
import { primerPasoConFalta, validarPaso, type ErroresDelPaso } from '../utils/validacion';
import { preguntasPorId } from '../utils/visibilidad';

/**
 * La máquina del recorrido del diagnóstico (spec 026): portada → pasos → cierre. Sin dibujar nada; `RecorridoDelDiagnostico` la
 * usa para la persona y para la vista previa de Administración.
 *
 * Lo que garantiza, y por qué:
 * - **Una respuesta no guardada nunca se da por guardada.** «Siguiente» llama a `onGuardarPaso` y solo avanza si resuelve; si
 *   falla, la persona se queda en el paso, con lo escrito, y puede reintentar.
 * - **Se guarda el paso al que se llega**, no el que se deja: el servidor guarda «el paso en que se quedó» (`PUT /onboarding/state`),
 *   y retomar cae justo ahí. En el último paso se guarda ese mismo paso.
 * - **Lo escrito sobrevive a un cierre de la app** en un borrador local por usuario y versión (`borradorLocal`), que se escribe
 *   un instante después de teclear, al pasar la app a segundo plano y al salir, y se borra al guardar el paso y al terminar.
 * - **Lo que falta se marca en la propia pregunta** y la vista baja hasta ella; nunca un diálogo genérico.
 * - **La vista previa no toca nada**: ni servidor ni teléfono; el último botón cierra con `onSalir`.
 */

export type FaseDelRecorrido = 'portada' | 'pasos' | 'cierre';
export type DireccionDelPaso = 'adelante' | 'atras';

export interface FalloDelRecorrido {
  tipo: 'guardar' | 'terminar' | 'faltaAlgo';
  mensaje: string;
}

/** Cuánto esperar tras la última tecla para escribir el borrador (y no golpear el disco en cada letra). */
const ESPERA_DEL_BORRADOR_MS = 500;
/** Aire entre el borde de arriba de la vista y la pregunta a la que se baja. */
const AIRE_AL_DESPLAZAR = 4;

function estadoInicial(props: PropiedadesDelRecorrido) {
  const valores = valoresIniciales(props.datos);
  const pasos = armarPasos(props.datos.secciones, valores);
  const retoma = props.datos.paso !== null;
  return {
    valores,
    indice: indiceInicial(props.datos.paso, pasos.length),
    fase: (retoma ? 'pasos' : 'portada') as FaseDelRecorrido,
  };
}

export function useRecorridoDelDiagnostico(props: PropiedadesDelRecorrido) {
  const { datos, modo, onGuardarPaso, onTerminar, onSalir, onContinuar, usuarioId } = props;
  const esPersona = modo === 'persona';
  const usaBorrador = esPersona && !!usuarioId;

  const [inicial] = useState(() => estadoInicial(props));
  const [valores, setValores] = useState<ValoresDelDiagnostico>(inicial.valores);
  const [indice, setIndice] = useState(inicial.indice);
  const [fase, setFase] = useState<FaseDelRecorrido>(inicial.fase);
  const [direccion, setDireccion] = useState<DireccionDelPaso>('adelante');
  const [errores, setErrores] = useState<ErroresDelPaso>({});
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<FalloDelRecorrido | null>(null);
  const [resultado, setResultado] = useState<ResultadoDeTerminar | null>(null);
  const [desplazar, setDesplazar] = useState<{ y: number; vez: number } | null>(null);
  const [cargandoBorrador, setCargandoBorrador] = useState(usaBorrador);

  const pasos = useMemo(() => armarPasos(datos.secciones, valores), [datos.secciones, valores]);
  const indiceEfectivo = pasos.length === 0 ? 0 : Math.min(indice, pasos.length - 1);
  const paso: PasoDelRecorrido | null = pasos[indiceEfectivo] ?? null;
  const esUltimo = pasos.length > 0 && indiceEfectivo === pasos.length - 1;

  /* Espejos para las funciones que corren después de un `await`, que no pueden confiar en lo que vieron al nacer. */
  const valoresRef = useRef(valores);
  const pasosRef = useRef(pasos);
  const indiceRef = useRef(indiceEfectivo);
  valoresRef.current = valores;
  pasosRef.current = pasos;
  indiceRef.current = indiceEfectivo;

  /** Un doble toque en «Siguiente» no manda dos pedidos: la bandera se cierra al instante, no al re-dibujar. */
  const enVuelo = useRef(false);
  const posiciones = useRef<Record<number, number>>({});
  const preguntaPendienteDeVer = useRef<number | null>(null);
  const temporizadorDelBorrador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const borradorApagado = useRef(false);

  // ───────────── Borrador local ─────────────

  const escribirBorrador = useCallback(() => {
    if (temporizadorDelBorrador.current) {
      clearTimeout(temporizadorDelBorrador.current);
      temporizadorDelBorrador.current = null;
    }
    if (!usaBorrador || borradorApagado.current || !usuarioId) return;
    const delPaso = pasosRef.current[indiceRef.current];
    if (!delPaso) return;
    const respuestas = delPaso.preguntas.map(q => aRespuesta(q, respuestaDe(valoresRef.current, q.id)));
    void guardarBorrador(usuarioId, datos.version, indiceRef.current, respuestas);
  }, [usaBorrador, usuarioId, datos.version]);

  const programarBorrador = useCallback(() => {
    if (!usaBorrador) return;
    if (temporizadorDelBorrador.current) clearTimeout(temporizadorDelBorrador.current);
    temporizadorDelBorrador.current = setTimeout(escribirBorrador, ESPERA_DEL_BORRADOR_MS);
  }, [usaBorrador, escribirBorrador]);

  const olvidarElBorrador = useCallback(() => {
    if (temporizadorDelBorrador.current) {
      clearTimeout(temporizadorDelBorrador.current);
      temporizadorDelBorrador.current = null;
    }
    if (usaBorrador && usuarioId) void borrarBorrador(usuarioId, datos.version);
  }, [usaBorrador, usuarioId, datos.version]);

  /* Al abrir: lo escrito y no mandado le gana a lo del servidor (es más reciente) y fija el paso si iba más adelante. */
  useEffect(() => {
    if (!usaBorrador || !usuarioId) return;
    let vigente = true;
    (async () => {
      const borrador = await leerBorrador(usuarioId, datos.version);
      if (!vigente) return;
      if (borrador) {
        const porId = preguntasPorId(datos.secciones);
        const mezcla: ValoresDelDiagnostico = { ...valoresRef.current };
        for (const r of borrador.respuestas) {
          const pregunta = porId.get(r.preguntaId);
          if (pregunta) mezcla[pregunta.id] = desdeRespuesta(pregunta, r);
        }
        valoresRef.current = mezcla;
        setValores(mezcla);
        const total = armarPasos(datos.secciones, mezcla).length;
        const destino = indiceInicial(Math.max(borrador.paso, datos.paso ?? 0), total);
        setIndice(destino);
        setFase('pasos');
      }
      setCargandoBorrador(false);
    })();
    return () => {
      vigente = false;
    };
    // Solo al abrir: el borrador se lee una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Al pasar la app a segundo plano (donde Android puede matarla) y al salir, lo pendiente se escribe ya. */
  useEffect(() => {
    if (!usaBorrador) return;
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado !== 'active' && temporizadorDelBorrador.current) escribirBorrador();
    });
    return () => {
      suscripcion.remove();
      if (temporizadorDelBorrador.current) escribirBorrador();
    };
  }, [usaBorrador, escribirBorrador]);

  // ───────────── Desplazamiento hasta una pregunta ─────────────

  const desplazarHasta = useCallback((y: number) => {
    setDesplazar(previo => ({ y: Math.max(0, y - AIRE_AL_DESPLAZAR), vez: (previo?.vez ?? 0) + 1 }));
  }, []);

  /** Cada pregunta avisa dónde quedó (su altura dentro del paso). Si estaba esperada, ahí se baja. */
  const alMedir = useCallback(
    (preguntaId: number, y: number) => {
      posiciones.current[preguntaId] = y;
      if (preguntaPendienteDeVer.current === preguntaId) {
        preguntaPendienteDeVer.current = null;
        desplazarHasta(y);
      }
    },
    [desplazarHasta],
  );

  const verPregunta = useCallback(
    (preguntaId: number) => {
      const y = posiciones.current[preguntaId];
      if (y !== undefined) {
        preguntaPendienteDeVer.current = null;
        desplazarHasta(y);
      } else {
        preguntaPendienteDeVer.current = preguntaId;
      }
    },
    [desplazarHasta],
  );

  // ───────────── Navegación ─────────────

  const irAlPaso = useCallback((destino: number, sentido: DireccionDelPaso) => {
    Keyboard.dismiss();
    posiciones.current = {};
    preguntaPendienteDeVer.current = null;
    setErrores({});
    setFallo(null);
    setDireccion(sentido);
    setIndice(destino);
  }, []);

  const marcar = useCallback(
    (nuevos: ErroresDelPaso) => {
      setErrores(nuevos);
      const primera = pasosRef.current[indiceRef.current]?.preguntas.find(q => nuevos[q.id]);
      tacto.error();
      if (primera) verPregunta(primera.id);
    },
    [verPregunta],
  );

  const cambiar = useCallback(
    (preguntaId: number, nuevo: RespuestaEnEdicion) => {
      const siguiente = { ...valoresRef.current, [preguntaId]: nuevo };
      valoresRef.current = siguiente;
      setValores(siguiente);
      setErrores(previos => {
        if (!previos[preguntaId]) return previos;
        const resto = { ...previos };
        delete resto[preguntaId];
        return resto;
      });
      setFallo(null);
      programarBorrador();
    },
    [programarBorrador],
  );

  const terminar = useCallback(async () => {
    if (!onTerminar) return;
    try {
      const r = await onTerminar();
      borradorApagado.current = true;
      olvidarElBorrador();
      setResultado(r);
      setFase('cierre');
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.codigo === 'DIAGNOSTICO_INCOMPLETO') {
        const donde = primeraQueFalta(pasosRef.current, preguntasQueFaltan(e.body));
        if (donde) {
          irAlPaso(donde.indice, 'atras');
          setErrores({ [donde.preguntaId]: 'Responde esta pregunta para continuar.' });
          tacto.error();
          verPregunta(donde.preguntaId);
        } else {
          setFallo({ tipo: 'faltaAlgo', mensaje: FALTA_ALGO_SIN_UBICAR });
          tacto.error();
        }
        return;
      }
      setFallo({ tipo: 'terminar', mensaje: FALLO_AL_TERMINAR });
      tacto.error();
    }
  }, [onTerminar, olvidarElBorrador, irAlPaso, verPregunta]);

  const siguiente = useCallback(async () => {
    if (enVuelo.current || guardando || !paso) return;

    const delPaso = validarPaso(paso, valoresRef.current);
    if (Object.keys(delPaso).length > 0) {
      marcar(delPaso);
      return;
    }

    if (!esPersona) {
      if (esUltimo) onSalir();
      else irAlPaso(indiceEfectivo + 1, 'adelante');
      return;
    }

    /* En el último paso se revisa TODO antes de mandar nada: un borrador restaurado pudo dejar un hueco más atrás. */
    if (esUltimo) {
      const hueco = primerPasoConFalta(pasosRef.current, valoresRef.current);
      if (hueco && hueco.indice !== indiceEfectivo) {
        irAlPaso(hueco.indice, 'atras');
        setErrores({ [hueco.preguntaId]: hueco.mensaje });
        tacto.error();
        verPregunta(hueco.preguntaId);
        return;
      }
    }

    const respuestas = paso.preguntas.map(q => aRespuesta(q, respuestaDe(valoresRef.current, q.id)));
    const aGuardar = esUltimo ? indiceEfectivo : indiceEfectivo + 1;
    enVuelo.current = true;
    setGuardando(true);
    setFallo(null);
    try {
      try {
        await onGuardarPaso?.(respuestas, aGuardar);
      } catch {
        setFallo({ tipo: 'guardar', mensaje: FALLO_AL_GUARDAR });
        tacto.error();
        return;
      }
      olvidarElBorrador();
      if (esUltimo) await terminar();
      else irAlPaso(indiceEfectivo + 1, 'adelante');
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  }, [guardando, paso, esPersona, esUltimo, indiceEfectivo, marcar, irAlPaso, verPregunta, onGuardarPaso, olvidarElBorrador, terminar, onSalir]);

  const empezar = useCallback(() => {
    if (pasos.length === 0) {
      if (esPersona) void terminar();
      else onSalir();
      return;
    }
    setDireccion('adelante');
    setFase('pasos');
  }, [pasos.length, esPersona, terminar, onSalir]);

  const atras = useCallback(() => {
    if (fase === 'portada') {
      onSalir();
    } else if (fase === 'cierre') {
      onContinuar?.();
    } else if (!guardando) {
      if (indiceEfectivo > 0) irAlPaso(indiceEfectivo - 1, 'atras');
      else {
        Keyboard.dismiss();
        setErrores({});
        setFallo(null);
        setFase('portada');
      }
    }
  }, [fase, guardando, indiceEfectivo, irAlPaso, onSalir, onContinuar]);

  return {
    fase,
    paso,
    pasos,
    indice: indiceEfectivo,
    esUltimo,
    direccion,
    valores,
    errores,
    guardando,
    fallo,
    resultado,
    desplazar,
    cargando: cargandoBorrador,
    rellenos: rellenoPorSeccion(pasos, indiceEfectivo),
    empezar,
    siguiente,
    atras,
    cambiar,
    alMedir,
  };
}
