import { useCallback, useEffect, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import * as objetivosApi from '../api/objetivosApi';
import type { DefinicionRocaMaestra, EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';

/**
 * El objetivo de 90 días del aprendiz, traído del backend y editable.
 *
 * **Por qué esto existe.** Hasta ahora la pantalla de Objetivos del Plan mostraba un objetivo
 * escrito a mano en el código ("Facturar $30.000 USD", "Corporación Delta"), igual para todos los
 * aprendices, y el botón Editar cambiaba un estado de React que se perdía al recargar. Esto lo
 * reemplaza por el dato real de cada persona.
 *
 * **Sobre los errores:** un fallo al cargar NO vacía lo que ya se había traído. Si la persona está
 * mirando su objetivo y el refresco falla por red, es mejor que siga viendo el dato viejo con un
 * aviso que una pantalla en blanco.
 */
export function useRocasMaestras() {
  const [rocas, setRocas] = useState<RocaMaestraApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setRocas(await objetivosApi.obtenerRocasMaestras());
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tu objetivo de 90 días.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Define o corrige el objetivo de un eje. Devuelve `true` si se guardó.
   *
   * La respuesta del servidor reemplaza a la roca de ese eje en memoria, en vez de recargar la
   * lista entera: el backend devuelve la roca ya guardada, con su porcentaje recalculado, así que
   * pedirla de nuevo sería un viaje de más para el mismo dato.
   */
  const definir = useCallback(async (eje: EjeObjetivo, definicion: DefinicionRocaMaestra) => {
    setGuardando(true);
    try {
      const guardada = await objetivosApi.definirRocaMaestra(eje, definicion);
      setRocas(previas => {
        const sinEseEje = previas.filter(r => r.eje !== eje);
        return [...sinEseEje, guardada];
      });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, mensaje: mensajeDeError(e, 'No pudimos guardar tu objetivo.') };
    } finally {
      setGuardando(false);
    }
  }, []);

  const deEje = useCallback(
    (eje: EjeObjetivo) => rocas.find(r => r.eje === eje) ?? null,
    [rocas]
  );

  return { rocas, deEje, cargando, error, guardando, definir, recargar: cargar };
}
