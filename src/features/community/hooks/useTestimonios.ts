import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import { formacionDeLaLectura } from '../../formaciones/estado/formacionDeLaComunidad';
import { obtenerTestimonios, type Testimonio } from '../api/testimoniosApi';

/** Por qué no hay lista: `no_disponible` es un servidor anterior (404) o sin permiso (403); `otro`, un fallo cualquiera. */
export type FalloDeTestimonios = 'no_disponible' | 'otro';

/**
 * Los testimonios de la Comunidad (spec 024). Se leen la primera vez que se abre la sección Testimonios (`activo`) y quedan leídos:
 * volver a la sección no los repide. Con una formación elegida (solo quien ve todas) se piden los de esa formación; para las demás
 * cuentas el pedido es el de siempre.
 *
 * **Sin lista no se rompe nada**: con un servidor sin la ruta (404), sin permiso (403), sin red o con otra respuesta, la sección
 * sigue diciendo lo de siempre («Próximamente»). Solo una lista con al menos un testimonio la reemplaza.
 */
export function useTestimonios(activo: boolean) {
  const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<FalloDeTestimonios | null>(null);
  const [yaLeido, setYaLeido] = useState(false);
  const pedido = useRef(0);

  const recargar = useCallback(async () => {
    const mio = ++pedido.current;
    setCargando(true);
    try {
      const lista = await obtenerTestimonios(formacionDeLaLectura());
      if (mio !== pedido.current) return;
      setTestimonios(lista);
      setFallo(null);
    } catch (e) {
      if (mio !== pedido.current) return;
      setFallo(e instanceof ApiError && (e.status === 404 || e.status === 403) ? 'no_disponible' : 'otro');
    } finally {
      if (mio === pedido.current) {
        setCargando(false);
        setYaLeido(true);
      }
    }
  }, []);

  const yaPidio = useRef(false);
  useEffect(() => {
    if (!activo || yaPidio.current) return;
    yaPidio.current = true;
    void recargar();
  }, [activo, recargar]);

  return { testimonios, cargando: cargando && !yaLeido, fallo, yaLeido, recargar };
}
