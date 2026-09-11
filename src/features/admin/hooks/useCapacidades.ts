import { useCallback, useEffect, useState } from 'react';

import { capacidadesDePrograma } from '../../mentor/api/mentorApi';

export type Capacidades = {
  /** Muestra la entrada a Administración. */
  administrar: boolean;
  /** Tiene rol para iniciar su programa de 90 días y todavía no lo hizo. */
  puedeIniciarPrograma: boolean;
  /** Acompaña al menos un grupo vigente. */
  acompana: boolean;
};

const NINGUNA: Capacidades = { administrar: false, puedeIniciarPrograma: false, acompana: false };

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
 */
export function useCapacidades() {
  const [capacidades, setCapacidades] = useState<Capacidades>(NINGUNA);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const respuesta = await capacidadesDePrograma();
    setCapacidades(
      respuesta
        ? {
            administrar: respuesta.canAdminister === true,
            puedeIniciarPrograma: respuesta.canStartProgram === true,
            acompana: respuesta.canAccompany === true,
          }
        : NINGUNA,
    );
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { capacidades, cargando, recargar: cargar };
}
