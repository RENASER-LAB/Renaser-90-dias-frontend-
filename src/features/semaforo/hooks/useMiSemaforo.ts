import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { mensajeDeError } from '../../../services/http/apiClient';
import {
  SEMANAS_POR_DEFECTO,
  esDeRed,
  esNoDisponible,
  esProhibido,
  obtenerMiSemaforo,
  pausarSemaforo,
  reanudarSemaforo,
} from '../api/semaforoApi';
import type { DetalleDelSemaforo } from '../types/semaforo.types';

/**
 * Por qué no hay semáforo. Cada motivo se dice distinto porque se arregla distinto:
 *
 * - `no_disponible` — 404: el endpoint todavía no está desplegado. No es culpa de nadie y
 *   reintentar no sirve. La tarjeta de Hoy no dibuja barras y el detalle lo dice sin alarma.
 * - `sin_permiso` — 403 (p. ej. cuenta suspendida).
 * - `sin_red` — no hubo respuesta. Reintentar sí sirve.
 * - `error` — cualquier otra cosa, incluida una respuesta con forma inesperada.
 */
export type FalloSemaforo = 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

export type EstadoMiSemaforo = ReturnType<typeof useMiSemaforo>;

/**
 * El semáforo propio: UNA lectura de `GET /api/v1/me/semaforo`, repartida a la tarjeta de Hoy (las
 * siete barras) y al detalle. Si cada una llamara por su cuenta habría dos peticiones y dos
 * verdades — el mismo motivo por el que `useCelulaQueAcompano` vive en Hoy.
 *
 * `activo` lo decide Hoy: solo se pregunta cuando `/home` dice que la persona se mide (su campo
 * `semaforo` no es `null`) o cuando el detalle está abierto. Así un backend que todavía no tiene el
 * semáforo nunca recibe esta llamada, y quien no se mide no paga una petición de más.
 *
 * Pausar y volver a medir devuelven el detalle ya actualizado: no hay una segunda lectura.
 */
export function useMiSemaforo(activo: boolean, semanas: number = SEMANAS_POR_DEFECTO) {
  const [detalle, setDetalle] = useState<DetalleDelSemaforo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<FalloSemaforo | null>(null);
  /** El texto técnico del último fallo: le ahorra media hora a quien mantiene la app. */
  const [detalleDelFallo, setDetalleDelFallo] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorDeAccion, setErrorDeAccion] = useState<string | null>(null);

  /* Un 404 no cambia entre un cambio de pestaña y el siguiente: sin este corte, cada vuelta a Hoy
     repreguntaría a un endpoint que no existe (se midió en `useCelulaQueAcompano`: cinco 404 en
     cinco minutos). `recargar()` explícito sí vuelve a intentarlo. */
  const noDesplegado = useRef(false);
  /* Cada lectura o acción toma un turno; solo la última escribe. Sin esto, una lectura lenta que
     llega DESPUÉS de pausar pisaría la pausa con datos viejos. */
  const turno = useRef(0);

  const cargar = useCallback(async () => {
    if (!activo) return;
    const miTurno = ++turno.current;
    setCargando(true);
    try {
      const nuevo = await obtenerMiSemaforo(semanas);
      if (miTurno !== turno.current) return;
      setDetalle(nuevo);
      setFallo(null);
      setDetalleDelFallo(null);
    } catch (e) {
      if (miTurno !== turno.current) return;
      noDesplegado.current = esNoDisponible(e);
      setFallo(
        esNoDisponible(e) ? 'no_disponible'
        : esProhibido(e) ? 'sin_permiso'
        : esDeRed(e) ? 'sin_red'
        : 'error',
      );
      setDetalleDelFallo(e instanceof Error ? e.message : null);
    } finally {
      if (miTurno === turno.current) setCargando(false);
    }
  }, [activo, semanas]);

  /* Se recarga al volver a la pantalla: el barrido corre cada hora, y quien vuelve a Hoy después de
     un rato espera ver lo de ahora. Mismo criterio que el resumen de Hoy. */
  useFocusEffect(
    useCallback(() => {
      if (noDesplegado.current) return;
      void cargar();
    }, [cargar]),
  );

  /** Reintento explícito: ignora el corte del 404, por si el endpoint ya se desplegó. */
  const recargar = useCallback(() => {
    noDesplegado.current = false;
    void cargar();
  }, [cargar]);

  /** Aplica una acción que devuelve el detalle. `true` si salió bien. */
  const ejecutar = useCallback(
    async (accion: () => Promise<DetalleDelSemaforo>, porDefecto: string): Promise<boolean> => {
      const miTurno = ++turno.current;
      setGuardando(true);
      setErrorDeAccion(null);
      try {
        const nuevo = await accion();
        if (miTurno === turno.current) {
          setDetalle(nuevo);
          setFallo(null);
        }
        return true;
      } catch (e) {
        setErrorDeAccion(
          esNoDisponible(e) ? 'Esto todavía no está disponible.' : mensajeDeError(e, porDefecto),
        );
        return false;
      } finally {
        setGuardando(false);
        if (miTurno === turno.current) setCargando(false);
      }
    },
    [],
  );

  /** Pausa desde hoy hasta `hasta` inclusive (`yyyy-MM-dd`). Solo el staff con programa propio. */
  const pausar = useCallback(
    (hasta: string) =>
      ejecutar(() => pausarSemaforo(hasta), 'No pudimos pausar tu semáforo. Revisa tu conexión e inténtalo de nuevo.'),
    [ejecutar],
  );

  /** Termina la pausa: se vuelve a medir desde hoy. */
  const reanudar = useCallback(
    () =>
      ejecutar(() => reanudarSemaforo(), 'No pudimos volver a medir tu semáforo. Revisa tu conexión e inténtalo de nuevo.'),
    [ejecutar],
  );

  return { detalle, cargando, fallo, detalleDelFallo, recargar, pausar, reanudar, guardando, errorDeAccion };
}
