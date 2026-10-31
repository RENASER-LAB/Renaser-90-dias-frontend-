import { useCallback, useEffect, useRef, useState } from 'react';

import { capacidadesDePrograma } from '../../mentor/api/mentorApi';
import { escucharDiaUnoElegido } from '../../programa/events/avisoDiaUnoElegido';

export type Capacidades = {
  /** Muestra la entrada a Administración. */
  administrar: boolean;
  /** Tiene rol para iniciar su programa de 90 días y todavía no lo hizo. */
  puedeIniciarPrograma: boolean;
  /** Acompaña al menos un grupo vigente. */
  acompana: boolean;
  /** Ofrece «Descargar» la imagen del podio en Comunidad → Ranking (spec 006; permiso del servidor). */
  exportarRanking: boolean;
};

const NINGUNA: Capacidades = { administrar: false, puedeIniciarPrograma: false, acompana: false, exportarRanking: false };

/**
 * Qué puede hacer esta cuenta, según el servidor.
 *
 * Se pregunta y no se deduce del rol. Deducirlo en el cliente es como se termina mostrando una
 * pantalla a quien no le corresponde —o, peor, escondiéndola a quien sí—, y el rol que llega en
 * `/auth/me` es un `string` que mañana puede tener un valor nuevo.
 *
 * **Esto decide qué se MUESTRA, nunca qué se puede hacer.** Cada endpoint vuelve a autorizar: una
 * capacidad falseada en el teléfono enseña pantallas vacías, no datos de nadie.
 *
 * Un fallo de la consulta se trata como "no puede": `capacidadesDePrograma` devuelve `null` ante
 * cualquier error, y un error de red no es un permiso.
 *
 * `activo: false` (2026-10-31) no pregunta nada y deja "ninguna capacidad": para quien solo necesita saber esto si ya
 * se sabe de antemano que podría (el «…» de moderación del Muro, que solo puede ser de ADMIN o ALCHEMIST, no le suma un
 * pedido a cada aprendiz que abre Comunidad). Sin la opción, el hook es el de siempre.
 */
export function useCapacidades({ activo = true }: { activo?: boolean } = {}) {
  const [capacidades, setCapacidades] = useState<Capacidades>(NINGUNA);
  const [cargando, setCargando] = useState(activo);
  const [error, setError] = useState(false);
  const consultaActual = useRef(0);

  const cargar = useCallback(async () => {
    if (!activo) return;
    const consulta = ++consultaActual.current;
    setCargando(true);
    const respuesta = await capacidadesDePrograma();
    if (consulta !== consultaActual.current) return;
    setError(respuesta === null);
    setCapacidades(
      respuesta
        ? {
            administrar: respuesta.canAdminister === true,
            puedeIniciarPrograma: respuesta.canStartProgram === true,
            acompana: respuesta.canAccompany === true,
            /* Solo un `true` explícito: un backend anterior no manda el campo y entonces no hay botón. */
            exportarRanking: respuesta.canExportRanking === true,
          }
        : NINGUNA,
    );
    setCargando(false);
  }, [activo]);

  useEffect(() => {
    void cargar();
    return () => { consultaActual.current += 1; };
  }, [cargar]);
  useEffect(() => escucharDiaUnoElegido(() => { void cargar(); }), [cargar]);

  return { capacidades, cargando, error, recargar: cargar };
}
