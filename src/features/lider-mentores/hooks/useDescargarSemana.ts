import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { mensajeDeError } from '../../../services/http/apiClient';
import { pedirElDocumento, pedirElReporteDelMes, type DocumentoPedido, type DocumentoQueSeDescarga } from '../api/documentoSemanalApi';

export type { DocumentoQueSeDescarga } from '../api/documentoSemanalApi';

const ENLACE_DE_LA_RED = /^https?:\/\//i;
const SIN_ENLACE = 'El servidor no devolvió el enlace del documento. Inténtalo de nuevo.';
const NO_SE_GENERO = 'No se pudo generar el documento. Inténtalo de nuevo.';

/**
 * «Descargar semana» (spec 056 FR-039, FR-047): pide el documento de la persona al servidor y abre su enlace, que vence a los 10
 * minutos: se abre al recibirlo y no se guarda.
 *
 * - **Un toque, un pedido**: mientras el documento se genera (`descargando`), otro toque no pide otro; un `ref` cubre dos toques en
 *   el mismo cuadro, antes de que el estado alcance a apagar el botón.
 * - **El motivo del servidor se dice tal cual** (`NO_ACOMPANA`, `FUERA_DE_SU_ALCANCE`…), con el `Alert` de la app; sin red, lo propio.
 * - El enlace solo se abre si es de la red (`http` o `https`): lo que el servidor mande con otro esquema no sale del teléfono.
 * - `semanaHasta` (un viernes) pide esa semana; sin él, la que está en curso en la zona de la persona.
 */
export function useDescargarSemana(documento: DocumentoQueSeDescarga) {
  const { tipo, personaId } = documento;
  const pedir = useCallback((semanaHasta?: string | null) => pedirElDocumento({ tipo, personaId }, semanaHasta), [tipo, personaId]);
  return useAbrirDocumento(pedir, 'No se pudo descargar la semana');
}

/** «Exportar el reporte» (spec 056 FR-032): el documento del mes, con la misma regla de un toque, un pedido y el motivo del servidor. */
export function useExportarReporte(mes: string) {
  const pedir = useCallback(() => pedirElReporteDelMes(mes), [mes]);
  const { descargando, descargar } = useAbrirDocumento(pedir, 'No se pudo exportar el reporte');
  return { exportando: descargando, exportar: useCallback(() => descargar(), [descargar]) };
}

/** Lo común: pide el documento, abre su enlace de la red y dice por qué no pudo. `pedir` cambia solo cuando cambia de qué es el documento. */
function useAbrirDocumento(pedir: (semanaHasta?: string | null) => Promise<DocumentoPedido>, tituloDelFallo: string) {
  const [descargando, setDescargando] = useState(false);
  const enCurso = useRef(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const descargar = useCallback(
    async (semanaHasta?: string | null): Promise<void> => {
      if (enCurso.current) return;
      enCurso.current = true;
      setDescargando(true);
      try {
        const pedido = await pedir(semanaHasta);
        /* Si la pantalla ya se cerró mientras se generaba, no se abre un navegador de la nada. */
        if (!vivo.current) return;
        if (!ENLACE_DE_LA_RED.test(pedido.url)) throw new Error(SIN_ENLACE);
        try {
          await Linking.openURL(pedido.url);
        } catch {
          Alert.alert('No se pudo abrir el documento', 'Tu teléfono no pudo abrir el enlace. Inténtalo de nuevo.');
        }
      } catch (e) {
        if (vivo.current) Alert.alert(tituloDelFallo, e instanceof Error && e.message === SIN_ENLACE ? SIN_ENLACE : mensajeDeError(e, NO_SE_GENERO));
      } finally {
        enCurso.current = false;
        if (vivo.current) setDescargando(false);
      }
    },
    [pedir, tituloDelFallo],
  );

  return { descargando, descargar };
}
