import { useCallback, useEffect, useMemo, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import * as spiritApi from '../api/spiritApi';
import type { SpiritDayApi, SpiritStatusApi } from '../types/spirit.types';

/**
 * Estado del hábito "Pastilla Renacer" (módulo Espíritu del backend).
 *
 * ## Se pide al MONTAR, no al abrir el modal — y esa es la decisión de rendimiento
 *
 * Es lo contrario de `useClaseDiaria`, que pide bajo demanda, y el motivo es el requisito
 * explícito del dueño: *"el audio debe estar reproduciéndose correctamente, sin delay, menos de 3
 * segundos"*.
 *
 * La respuesta de `/spirit-audio/status` ya trae la **URL firmada del audio del día**. Si se
 * pidiera recién al tocar el hábito, el presupuesto de 3 segundos tendría que cubrir dos cosas
 * seguidas: la llamada a la API y después la descarga del mp3. Pidiéndola al abrir Training, para
 * cuando la persona toca la tarjeta la URL ya está en memoria y lo único que queda por hacer es
 * bajar audio.
 *
 * Además esta lectura tiene un efecto necesario en el servidor: **avanza la máquina de estados**
 * (desbloquea el audio del día si corresponde, cierra el que venció). Es la llamada que hace que
 * la Pastilla de hoy exista.
 *
 * ## Lo que este hook NO hace, a propósito
 *
 * No marca nada como completado por su cuenta. Devuelve el resultado del POST y deja que Training
 * recargue desde el backend, la única fuente de verdad de si el registro quedó `COMPLETADO`. Sin
 * esto, un fallo de red dejaría la tarjeta marcada como hecha y el hábito abierto en el servidor.
 */
export function useEspiritu() {
  const [estado, setEstado] = useState<SpiritStatusApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEstado(await spiritApi.obtenerEstadoEspiritu());
    } catch (e) {
      setEstado(null);
      // Degradación deliberada: Espíritu es UN hábito de Training. Que su estado falle no puede
      // tumbar la pantalla — se guarda el mensaje y el resto de las dimensiones sigue viva.
      setError(mensajeDeError(e, 'No pudimos cargar tu Pastilla de hoy'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /**
   * El día en curso: el único que se puede escuchar y entregar. `null` cuando la persona todavía
   * no llegó al día 8 del programa, o cuando el catálogo no tiene audio para su día.
   */
  const diaEnCurso = useMemo<SpiritDayApi | null>(() => {
    if (!estado) return null;
    return estado.days.find(d => d.state === 'current') ?? null;
  }, [estado]);

  /** El día ya entregado de hoy, si entregó — para poder mostrar en lectura lo que escribió. */
  const diaEntregadoHoy = useMemo<SpiritDayApi | null>(() => {
    if (!estado || estado.currentDay === null) return null;
    const dia = estado.days.find(d => d.day === estado.currentDay);
    return dia && dia.state === 'submitted' ? dia : null;
  }, [estado]);

  /**
   * Entrega la respuesta. Devuelve `true` solo si el backend confirmó: recién entonces la pantalla
   * cierra el modal, borra el borrador y recarga. Si devuelve `false`, el modal SIGUE ABIERTO con
   * lo escrito — perder lo que la persona acaba de redactar sería el peor final posible.
   *
   * Entregar pasado el mediodía NO es un error: el backend guarda igual y responde `onTime:false`.
   */
  const entregar = useCallback(async (dia: number, texto: string): Promise<boolean> => {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await spiritApi.entregarResumenEspiritu(dia, texto);
      return true;
    } catch (e) {
      setErrorEnvio(mensajeDeError(e, 'No pudimos enviar tu respuesta. Intenta de nuevo.'));
      return false;
    } finally {
      setEnviando(false);
    }
  }, []);

  const limpiarError = useCallback(() => setErrorEnvio(null), []);

  return {
    estado,
    diaEnCurso,
    diaEntregadoHoy,
    cargando,
    error,
    enviando,
    errorEnvio,
    recargar,
    entregar,
    limpiarError,
  };
}
