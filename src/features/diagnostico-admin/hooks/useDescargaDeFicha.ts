import { useCallback, useState } from 'react';

import { getTokenSesion } from '../../../services/http/apiClient';
import { descargarConSesion, type ArchivoParaDescargar } from '../../caja/utils/archivosConSesion';
import { avisar } from '../../admin/utils/dialogo';
import { RUTA_DE_LA_EXPORTACION, RUTA_DE_LA_PLANTILLA } from '../api/diagnosticoAdminApi';

/** La plantilla vacía, con las columnas y los ejemplos que el importador entiende (CSV con tabuladores y BOM). */
export const ARCHIVO_DE_LA_PLANTILLA: ArchivoParaDescargar = {
  ruta: RUTA_DE_LA_PLANTILLA,
  nombre: 'plantilla-del-diagnostico.csv',
  tipo: 'text/csv',
  titulo: 'Plantilla del diagnóstico',
};

/** La ficha tal como está (el borrador), en el mismo formato de la plantilla: se puede editar en una hoja de cálculo y volver a importar. */
export const ARCHIVO_DE_LA_FICHA: ArchivoParaDescargar = {
  ruta: RUTA_DE_LA_EXPORTACION,
  nombre: 'diagnostico-inicial.csv',
  tipo: 'text/csv',
  titulo: 'Diagnóstico inicial',
};

/**
 * Baja un archivo de texto del servidor con la sesión (`apiFetch` solo entiende JSON). En web lo guarda el navegador; en el teléfono se
 * abre la hoja de compartir del sistema (WhatsApp, Drive, correo…), como la planilla de la Caja Renaser. Un fallo se dice con palabras.
 */
export function useDescargaDeFicha() {
  const [descargando, setDescargando] = useState(false);
  const descargar = useCallback(async (archivo: ArchivoParaDescargar) => {
    setDescargando(true);
    try {
      const resultado = await descargarConSesion(archivo, getTokenSesion());
      if (!resultado.ok) avisar('No se pudo descargar', resultado.mensaje);
    } finally {
      setDescargando(false);
    }
  }, []);
  return { descargando, descargar };
}
