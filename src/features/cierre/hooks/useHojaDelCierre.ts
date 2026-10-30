import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { esRechazoPorDiaCerrado } from '../../habits/api/registroVigente';
import { guardarCierreDelDia, obtenerCierreDelDia } from '../api/cierreApi';
import type { CierreDelDia, MotivoDelCierre, PlanDeManana } from '../types/cierre.types';
import {
  borradorInicial,
  conRespuesta,
  cuerpoDelCierre,
  loQueFalta,
  puedeGuardar,
  recortarNota,
  textoDeLoQueFalta,
  type BorradorDelCierre,
} from '../utils/borradorDelCierre';

/**
 * Lo que pasa DENTRO de la hoja «Cierra tu día» (spec 017): leer el día al abrirla, ir armando las respuestas y guardar.
 *
 * - **Se vuelve a leer cada vez que se abre**: pudo cumplirse una acción desde la última vez.
 * - **Guardar solo envía respuestas.** Nunca completa una acción, ni paga puntos, ni emite `habitoCumplido`: este hook
 *   solo habla con `GET/PUT /rocks/day-closure`.
 * - **Antes de enviar compara el día**: la hoja se abrió para `fecha`; si el día de hoy ya es otro (pasó la medianoche
 *   con la hoja abierta) NO envía nada y avisa (`dia-cambio`). Un 409 del servidor por día cerrado es lo mismo
 *   (`dia-cerrado`). Ninguno reasigna el cierre al día nuevo.
 * - `tacto.logro()` una sola vez, al quedar guardado.
 */

export type FaseDeLaHoja = 'cargando' | 'error' | 'formulario' | 'guardando' | 'guardado';

export type ResultadoDeGuardar =
  | { resultado: 'guardado' }
  | { resultado: 'incompleto' }
  | { resultado: 'dia-cambio' }
  | { resultado: 'dia-cerrado' }
  | { resultado: 'fallo'; mensaje: string };

const MENSAJE_SIN_CONEXION = 'No pudimos guardar tu cierre. Revisa tu conexión e inténtalo de nuevo.';

export function useHojaDelCierre({
  visible,
  fecha,
  hoyIso,
  alLeer,
  alGuardar,
  alSalirPorDiaCerrado,
}: {
  visible: boolean;
  /** El día para el que se abrió la hoja (`YYYY-MM-DD`): el «ID original» que se compara antes de enviar. */
  fecha: string;
  /** El día de hoy ahora mismo. */
  hoyIso: string;
  /** Cada vez que se trae o se guarda el día: Training deja la fila al día con eso. */
  alLeer?: (vista: CierreDelDia) => void;
  alGuardar?: (vista: CierreDelDia) => void;
  /** El día ya no es el de hoy (se vio al abrir): Training cierra la hoja y avisa. */
  alSalirPorDiaCerrado?: () => void;
}) {
  const [fase, setFase] = useState<FaseDeLaHoja>('cargando');
  const [vista, setVista] = useState<CierreDelDia | null>(null);
  const [borrador, setBorrador] = useState<BorradorDelCierre>({ porAccion: {}, notaDelDia: '' });
  const [errorDeLectura, setErrorDeLectura] = useState<string | null>(null);
  const hoyActual = useRef(hoyIso);
  hoyActual.current = hoyIso;
  const lectura = useRef(0);
  const callbacks = useRef({ alLeer, alGuardar, alSalirPorDiaCerrado });
  callbacks.current = { alLeer, alGuardar, alSalirPorDiaCerrado };

  const leer = useCallback(async () => {
    const mia = ++lectura.current;
    setFase('cargando');
    setErrorDeLectura(null);
    try {
      const leida = await obtenerCierreDelDia(fecha);
      if (mia !== lectura.current) return;
      if (!leida.puedeCerrar) {
        callbacks.current.alSalirPorDiaCerrado?.();
        return;
      }
      setVista(leida);
      setBorrador(borradorInicial(leida));
      setFase('formulario');
      callbacks.current.alLeer?.(leida);
    } catch (error) {
      if (mia !== lectura.current) return;
      setErrorDeLectura(mensajeDeError(error, 'No pudimos cargar tu día. Revisa tu conexión e inténtalo de nuevo.'));
      setFase('error');
    }
  }, [fecha]);

  /* Al abrirse: lectura nueva y borrador limpio. Al cerrarse, lo que venía en vuelo se descarta. */
  useEffect(() => {
    if (!visible) {
      lectura.current += 1;
      return;
    }
    void leer();
  }, [visible, leer]);

  const elegirMotivo = useCallback(
    (accionId: string, motivo: MotivoDelCierre) => setBorrador(b => conRespuesta(b, accionId, { motivo })),
    [],
  );
  const elegirManana = useCallback(
    (accionId: string, manana: PlanDeManana) => setBorrador(b => conRespuesta(b, accionId, { manana })),
    [],
  );
  const escribirNota = useCallback(
    (accionId: string, nota: string) => setBorrador(b => conRespuesta(b, accionId, { nota: recortarNota(nota) })),
    [],
  );
  const escribirNotaDelDia = useCallback(
    (nota: string) => setBorrador(b => ({ ...b, notaDelDia: recortarNota(nota) })),
    [],
  );

  const faltan = vista ? loQueFalta(vista, borrador) : [];
  const listo = vista !== null && puedeGuardar(vista, borrador);

  const guardar = useCallback(async (): Promise<ResultadoDeGuardar> => {
    if (!vista || fase !== 'formulario' || !puedeGuardar(vista, borrador)) return { resultado: 'incompleto' };
    // El día cambió con la hoja abierta: no se manda nada, ni se reasigna a otro día.
    if (hoyActual.current !== fecha) return { resultado: 'dia-cambio' };
    setFase('guardando');
    try {
      const guardada = await guardarCierreDelDia(cuerpoDelCierre(fecha, vista, borrador));
      setVista(guardada);
      setFase('guardado');
      tacto.logro();
      callbacks.current.alGuardar?.(guardada);
      return { resultado: 'guardado' };
    } catch (error) {
      setFase('formulario');
      if (esRechazoPorDiaCerrado(error) || (error instanceof ApiError && error.status === 409)) {
        return { resultado: 'dia-cerrado' };
      }
      return { resultado: 'fallo', mensaje: mensajeDeError(error, MENSAJE_SIN_CONEXION) };
    }
  }, [vista, fase, borrador, fecha]);

  return {
    fase,
    vista,
    borrador,
    errorDeLectura,
    faltan,
    textoDeLoQueFalta: textoDeLoQueFalta(faltan),
    puedeGuardar: listo,
    elegirMotivo,
    elegirManana,
    escribirNota,
    escribirNotaDelDia,
    guardar,
    reintentar: leer,
  };
}
