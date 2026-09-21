import { useCallback, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import * as claseDiariaApi from '../api/claseDiariaApi';
import type { ClaseDiariaApi } from '../types/academy.types';

/**
 * Estado del flujo "completar la Clase Diaria".
 *
 * Se pide BAJO DEMANDA (`abrir()`), no al montar la pantalla: Training se abre muchas veces por
 * día y la clase del día solo hace falta cuando la persona toca ese hábito puntual. Mismo criterio
 * que `useLeccionDetalle`, que tampoco precarga el detalle de todas las lecciones del árbol.
 *
 * Lo que este hook NO hace, a propósito: marcar nada como completado por su cuenta. Devuelve el
 * resultado del POST y deja que la pantalla recargue desde el backend, que es la única fuente de
 * verdad de si el registro quedó `COMPLETADO`. Sin esto, un fallo de red dejaría la tarjeta
 * marcada como hecha y el hábito abierto en el servidor.
 */
export function useClaseDiaria() {
  const [clase, setClase] = useState<ClaseDiariaApi | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  /** Pide la clase de hoy. Se llama al abrir el modal. */
  /**
   * Devuelve la clase ADEMÁS de guardarla en el estado.
   *
   * El estado sirve para pintar el modal; el valor devuelto sirve para DECIDIR. Quien abre el
   * hábito necesita saber, en ese mismo instante, si la lección ya se vio — para llevar a la clase
   * en vez de pedir un resumen de algo que la persona no miró. Leerlo del estado no sirve: en el
   * render siguiente todavía es el valor viejo.
   */
  const abrir = useCallback(async (): Promise<ClaseDiariaApi | null> => {
    setCargando(true);
    setError(null);
    setErrorEnvio(null);
    try {
      const recibida = await claseDiariaApi.obtenerClaseDiaria();
      setClase(recibida);
      return recibida;
    } catch (e) {
      setClase(null);
      setError(mensajeDeError(e, 'No pudimos encontrar tu clase de hoy'));
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  /**
   * Envía el resumen. Devuelve `true` solo si el backend confirmó: la pantalla recién entonces
   * cierra el modal y recarga. Si devuelve `false`, el modal SIGUE ABIERTO con el texto escrito —
   * perder lo que la persona acaba de redactar por un error de red sería el peor final posible.
   */
  const enviarResumen = useCallback(async (leccionId: string, resumen: string): Promise<boolean> => {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await claseDiariaApi.completarClaseDiaria(leccionId, resumen);
      return true;
    } catch (e) {
      setErrorEnvio(mensajeDeError(e, 'No pudimos enviar tu resumen. Intenta de nuevo.'));
      return false;
    } finally {
      setEnviando(false);
    }
  }, []);

  /** Limpia los errores al cerrar, para que la próxima apertura no arranque con el error viejo. */
  const limpiar = useCallback(() => {
    setError(null);
    setErrorEnvio(null);
  }, []);

  return { clase, cargando, error, enviando, errorEnvio, abrir, enviarResumen, limpiar };
}
