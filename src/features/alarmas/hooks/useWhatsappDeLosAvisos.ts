import { useEffect, useState } from 'react';

import { leerWhatsappDelPerfil } from '../../yo/api/whatsappDelPerfilApi';
import type { LecturaDelWhatsappDeLosAvisos } from '../utils/whatsappDeLosAvisos';

/**
 * El WhatsApp de la ficha, para decir en Yo → Notificaciones a qué número se le escribe (spec 041, FR-041). Se lee UNA vez, solo si la fila se ofrece
 * (`activo`: el servidor la lista), y un fallo no inventa nada: la fila queda sin esa línea. Una respuesta que llega cuando la pantalla ya no está no
 * toca el estado.
 */
export function useWhatsappDeLosAvisos(activo: boolean): { lectura: LecturaDelWhatsappDeLosAvisos; guardado: string | null } {
  const [estado, setEstado] = useState<{ lectura: LecturaDelWhatsappDeLosAvisos; guardado: string | null }>({ lectura: 'cargando', guardado: null });

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    leerWhatsappDelPerfil().then(
      guardado => vigente && setEstado({ lectura: 'listo', guardado }),
      () => vigente && setEstado({ lectura: 'error', guardado: null }),
    );
    return () => {
      vigente = false;
    };
  }, [activo]);

  return estado;
}
