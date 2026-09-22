import { useCallback, useEffect, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import * as objetivosApi from '../api/objetivosApi';
import type { EjeObjetivo, ItemPlanDiario, RocaDiariaApi } from '../types/objetivos.types';
import { fechaAPlanificar } from '../utils/ventanasDePlanificacion';

/**
 * Las acciones del día: la parte 3 del plan.
 *
 * **Qué cierra esto.** Las tres acciones críticas de cada roca semanal se quedaban escritas en la
 * pantalla de Plan y no llegaban a ningún lado. Acá se agendan como rocas diarias — con hora, igual
 * que un hábito — y eso es exactamente lo que Training lee para la dimensión **VIDA Y NEGOCIO**,
 * que hoy muestra `0/0 CUMPLIDOS` porque nadie planifica rocas.
 *
 * **La cadena que hay que respetar.** `POST /rocks/plan` exige la roca **semanal** del eje: sin la
 * parte 2 hecha responde `400 NO_WEEKLY_ROCK`. La pantalla no debe ofrecer esta parte antes.
 *
 * **El color no se elige.** Sale de la posición: la primera acción de cada eje es la VERDE, la que
 * más mueve la aguja, y hasta que no tenga evidencia las otras dos de ese eje llegan con
 * `bloqueada: true`. Por eso el orden de la lista importa y no es cosmético.
 */
export function useRocasDiarias() {
  const [hoy, setHoy] = useState<RocaDiariaApi[]>([]);
  const [manana, setManana] = useState<RocaDiariaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // En paralelo: son dos lecturas independientes y en serie se nota en una conexión mala.
      const [deHoy, deManana] = await Promise.all([
        objetivosApi.obtenerRocasDeHoy(),
        objetivosApi.obtenerRocasDeManana(),
      ]);
      setHoy(deHoy);
      setManana(deManana);
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tus acciones del día.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Qué fecha se propone. **Es una propuesta del dispositivo, no la verdad.**
   *
   * > **Corregido 2026-09-09.** Antes esto decidía además si lo agendado era "de hoy" o "de
   * > mañana", y con eso la tarjeta elegía qué mostrar. Probándolo en el desplegado a las 00:41 el
   * > reloj del teléfono decía 9 de septiembre y el backend —que cuenta con **la zona del
   * > participante**— todavía estaba en el 8: las tres acciones se crearon (201) y cayeron en
   * > `/rocks/tomorrow`, mientras la pantalla seguía diciendo "todavía no agendaste tus acciones de
   * > hoy". Se agendó bien y no se veía en ningún lado.
   *
   * La regla que sale de ahí, y que ya costó cara en el backend (E-91): **el día de una persona lo
   * decide su zona horaria, y el dispositivo no la conoce.** Por eso la fecha propuesta sigue
   * saliendo del reloj local —es lo único que hay para armar el POST— pero **el rótulo ya no**: la
   * pantalla muestra los dos cubos que devuelve el servidor, `hoy` y `manana`, y cada acción se ve
   * donde el servidor la puso.
   */
  const { fecha, esManana } = fechaAPlanificar();
  const objetivo = {
    fecha,
    esManana,
    /** Ya hay algo agendado en cualquiera de los dos días: no se ofrece volver a planificar. */
    yaPlanificado: hoy.length > 0 || manana.length > 0,
  };

  /**
   * Agenda las acciones de un día. `items` ya viene con las posiciones puestas por
   * {@link posicionarPorEje}, que es lo que el backend valida.
   */
  const planificar = useCallback(async (fecha: string, items: ItemPlanDiario[]) => {
    setGuardando(true);
    try {
      await objetivosApi.crearPlanDiario(fecha, items);
      await cargar();
      return { ok: true as const };
    } catch (e) {
      if (e instanceof ApiError && e.esConflicto) {
        await cargar();
        /* Solo puede ser HOY: un día que todavía no llegó se reemplaza en el servidor sin
           rechazar (E-208), así que si llega este error es porque se intentó rehacer el día en
           curso — y eso no se reacomoda, igual que los hábitos (D-91). */
        return {
          ok: false as const,
          motivo: 'ya_planificado' as const,
          mensaje: 'El día en curso ya está armado y no se reacomoda. Puedes cambiar los que vienen.',
        };
      }
      // NO_WEEKLY_ROCK llega como 400 con el código en el texto. Se distingue por el código y no por
      // el mensaje completo, que puede cambiar de redacción sin avisar.
      if (e instanceof ApiError && e.message.includes('NO_WEEKLY_ROCK')) {
        return {
          ok: false as const,
          motivo: 'sin_plan_semanal' as const,
          mensaje: 'Primero arma tu plan de la semana: las acciones salen de ahí.',
        };
      }
      if (e instanceof ApiError && e.message.includes('INVALID_DATE')) {
        return {
          ok: false as const,
          motivo: 'fecha_invalida' as const,
          /* Corregido el 2026-09-22 con E-208. Decía "después de las 18:00 solo se planifica el
             día siguiente", que era la regla vieja: el servidor admitía dos fechas y nada más. Hoy
             admite hasta el domingo, y el corte de las 18:00 solo mueve el primer día. */
          mensaje: 'Ese día ya no se puede planificar. Elige uno que quede de la semana.',
        };
      }
      return { ok: false as const, motivo: 'error' as const, mensaje: mensajeDeError(e, 'No pudimos agendar tus acciones.') };
    } finally {
      setGuardando(false);
    }
  }, [cargar]);

  return { hoy, manana, objetivo, cargando, error, guardando, planificar, recargar: cargar };
}

/**
 * Pone las posiciones que el backend exige: 1, 2, 3 **dentro de cada eje**, sin huecos, máximo tres.
 *
 * Se hace acá y no en la pantalla porque es una regla del contrato, no de diseño: mandar solo la
 * posición 2 de un eje da 400 ("las posiciones deben empezar en 1 sin huecos"). La persona ordena
 * su lista; la numeración es consecuencia de ese orden.
 */
export function posicionarPorEje(
  acciones: { eje: EjeObjetivo; titulo: string; descripcion?: string; puntajeImpacto?: number; esDelegable?: boolean; horaInicio?: string; horaFin?: string }[]
): ItemPlanDiario[] {
  const contadoPorEje = new Map<EjeObjetivo, number>();
  return acciones.map(accion => {
    const posicion = (contadoPorEje.get(accion.eje) ?? 0) + 1;
    contadoPorEje.set(accion.eje, posicion);
    return {
      eje: accion.eje,
      posicion,
      titulo: accion.titulo,
      descripcion: accion.descripcion,
      // 5 es el punto medio de la escala 1-10. Se manda un valor válido y no se le pide a alguien de
      // 50-60 años que puntúe el impacto de cada acción antes de poder guardar.
      puntajeImpacto: accion.puntajeImpacto ?? 5,
      esDelegable: accion.esDelegable ?? false,
      horaInicio: accion.horaInicio,
      horaFin: accion.horaFin,
    };
  });
}
