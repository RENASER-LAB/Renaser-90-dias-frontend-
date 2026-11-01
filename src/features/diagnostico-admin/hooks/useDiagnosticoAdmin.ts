import { useCallback, useEffect, useRef, useState } from 'react';

import { leerBorradorDelDiagnostico } from '../api/diagnosticoAdminApi';
import type { BorradorDelDiagnostico } from '../types/diagnosticoAdmin.types';
import { otraPersonaPublico } from '../utils/publicar';
import { falloDe, type FalloDeFichas } from '../utils/textos';

/**
 * El borrador del diagnóstico, leído una vez y puesto al día después de cada cambio (spec 026).
 *
 * - `ejecutar(accion)` corre un cambio contra el servidor y, si salió bien, vuelve a leer el borrador ANTES de devolver: así la
 *   pantalla que cierra su hoja ya ve el resultado, y los totales, «hay cambios sin publicar» y «se puede publicar» son los del
 *   servidor, no una cuenta de la app. Si la nueva lectura falla, el cambio ya está hecho: se conserva lo que había (`desactualizado`).
 * - **La versión base no se mueve sola.** Es la versión publicada que había cuando se abrió la pantalla (o cuando se recargó a mano), y
 *   es la que se manda al publicar: si alguien publicó mientras tanto, el servidor lo rechaza con 409. Si las relecturas
 *   silenciosas la fueran actualizando, ese choque nunca se vería. `otraPersona` lo anuncia, y `recargar()` (o `ejecutar(…, { reiniciarBase })`
 *   tras publicar) la pone al día a propósito.
 * - Una respuesta vieja nunca pisa a una nueva (`turno`).
 */
export function useDiagnosticoAdmin(activo = true) {
  const [borrador, setBorrador] = useState<BorradorDelDiagnostico | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [fallo, setFallo] = useState<FalloDeFichas | null>(null);
  const [desactualizado, setDesactualizado] = useState(false);
  const [versionBase, setVersionBase] = useState<number | null>(null);
  const turno = useRef(0);
  const fijarBase = useCallback((v: number | null) => setVersionBase(v), []);

  /** Lectura de todo (con «Cargando…» y error si falla). Pone al día la versión base. */
  const recargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    setFallo(null);
    try {
      const leido = await leerBorradorDelDiagnostico();
      if (mio !== turno.current) return;
      if (!leido) {
        setFallo('error');
        return;
      }
      setBorrador(leido);
      setDesactualizado(false);
      fijarBase(leido.publicada?.version ?? 0);
    } catch (e) {
      if (mio === turno.current) setFallo(falloDe(e));
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, [fijarBase]);

  const releerEnSilencio = useCallback(async (reiniciarBase: boolean) => {
    const mio = ++turno.current;
    try {
      const leido = await leerBorradorDelDiagnostico();
      if (mio !== turno.current) return;
      if (leido) {
        setBorrador(leido);
        setDesactualizado(false);
        if (reiniciarBase) fijarBase(leido.publicada?.version ?? 0);
      } else {
        setDesactualizado(true);
      }
    } catch {
      if (mio === turno.current) setDesactualizado(true);
    }
  }, [fijarBase]);

  useEffect(() => {
    if (activo) void recargar();
  }, [activo, recargar]);

  /**
   * `reiniciarBase`: tras publicar yo mismo, la versión vigente es la nueva y pasa a ser mi base.
   */
  const ejecutar = useCallback(
    async <T,>(accion: () => Promise<T>, opciones: { reiniciarBase?: boolean } = {}): Promise<T> => {
      const resultado = await accion();
      await releerEnSilencio(opciones.reiniciarBase === true);
      return resultado;
    },
    [releerEnSilencio],
  );

  return {
    borrador,
    cargando,
    fallo,
    desactualizado,
    versionBase: versionBase ?? borrador?.publicada?.version ?? 0,
    otraPersona: versionBase !== null && otraPersonaPublico(versionBase, borrador),
    recargar,
    ejecutar,
  };
}

export type EstadoDelDiagnosticoAdmin = ReturnType<typeof useDiagnosticoAdmin>;
