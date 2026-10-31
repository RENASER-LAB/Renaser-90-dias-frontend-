import { useCallback, useRef, useState } from 'react';

import { Alert } from '../../../components/Alerta';
import { mensajeDeError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { avisarMuroModerado } from '../events/muroModerado';
import {
  AVISO_ELIMINADA,
  AVISO_OCULTA,
  BOTON_ELIMINAR,
  MENSAJE_DE_ELIMINAR,
  SIN_PERMISO_PARA_MODERAR,
  TITULO_DE_ELIMINAR,
  eliminarDesdeElMuro,
  ocultarEnElMuro,
  type ResultadoDeModeracion,
} from '../utils/moderacionDelMuro';

/** Sobre qué publicación está abierta la hoja de moderación: lo justo para titularla. */
export type PublicacionAModerar = { id: string; autor: string; resumen: string };

type Accion = 'ocultar' | 'eliminar';

/**
 * El «…» de una publicación del Muro (pedido del dueño, 2026-10-31): la hoja con «Ocultar publicación» y «Eliminar
 * para siempre», solo para ADMIN y ALCHEMIST. Une los pedidos (`utils/moderacionDelMuro`) con lo que ve la persona:
 *
 * - **Al terminar**, la publicación sale de la lista en el acto (`quitarPublicacion`), la hoja se cierra, se dice en
 *   una línea (`anunciar`, la `ConfirmacionEnLinea` de la pantalla) con `tacto.logro()`, y se avisa al resto de la app
 *   (`avisarMuroModerado`: el Muro se relee en silencio y la tarjeta «última evidencia» de Hoy da por vencida su
 *   lectura).
 * - **Eliminar pide confirmación** con el `Alert` de la app y su botón destructivo; la hoja sigue abierta debajo
 *   (si se cancela, no se pierde dónde se estaba).
 * - **Errores**: un 403 dice «No tienes permiso para moderar el Muro.»; un 404 la saca de la lista sin error; lo demás,
 *   en un diálogo con el mensaje del servidor. Si al eliminar el primer paso (ocultar) sí se hizo, la publicación sale
 *   igual de la lista y el diálogo dice dónde terminar de borrarla.
 */
export function useModeracionDelMuro({
  quitarPublicacion,
  anunciar,
}: {
  quitarPublicacion: (postId: string) => void;
  anunciar: (texto: string) => void;
}) {
  const [publicacion, setPublicacion] = useState<PublicacionAModerar | null>(null);
  const [ocupado, setOcupado] = useState<Accion | null>(null);
  /** Un toque doble no manda dos pedidos: el estado de React llega tarde, el `ref` cambia en el acto. */
  const enCurso = useRef(false);

  const abrir = useCallback((destino: PublicacionAModerar) => setPublicacion(destino), []);
  const cerrar = useCallback(() => setPublicacion(null), []);

  const terminar = useCallback(
    (resultado: ResultadoDeModeracion, id: string, accion: Accion) => {
      switch (resultado.tipo) {
        case 'hecho':
          quitarPublicacion(id);
          setPublicacion(null);
          tacto.logro();
          anunciar(accion === 'ocultar' ? AVISO_OCULTA : AVISO_ELIMINADA);
          avisarMuroModerado();
          return;
        case 'ya_no_esta':
          // Un 404: ya no está donde se la buscaba. Sin error y sin anunciar algo que no se hizo.
          quitarPublicacion(id);
          setPublicacion(null);
          avisarMuroModerado();
          return;
        case 'sin_permiso':
          if (resultado.quedoOculta) {
            quitarPublicacion(id);
            avisarMuroModerado();
          }
          setPublicacion(null);
          tacto.error();
          Alert.alert('Moderar el Muro', SIN_PERMISO_PARA_MODERAR);
          return;
        case 'fallo': {
          tacto.error();
          const motivo = mensajeDeError(
            resultado.error,
            accion === 'ocultar' ? 'No se pudo ocultar la publicación. Inténtalo de nuevo.' : 'No se pudo eliminar la publicación. Inténtalo de nuevo.',
          );
          if (resultado.quedoOculta) {
            quitarPublicacion(id);
            setPublicacion(null);
            avisarMuroModerado();
            Alert.alert(
              'No se pudo eliminar',
              `${motivo}\n\nLa publicación quedó oculta. Puedes terminar de eliminarla desde Administración, en Más opciones → Publicaciones ocultas.`,
            );
          } else {
            Alert.alert(accion === 'ocultar' ? 'No se pudo ocultar' : 'No se pudo eliminar', motivo);
          }
          return;
        }
      }
    },
    [anunciar, quitarPublicacion],
  );

  const correr = useCallback(
    async (accion: Accion, pedido: (id: string) => Promise<ResultadoDeModeracion>) => {
      if (!publicacion || enCurso.current) return;
      enCurso.current = true;
      const { id } = publicacion;
      setOcupado(accion);
      try {
        terminar(await pedido(id), id, accion);
      } finally {
        enCurso.current = false;
        setOcupado(null);
      }
    },
    [publicacion, terminar],
  );

  const ocultar = useCallback(() => correr('ocultar', ocultarEnElMuro), [correr]);

  const eliminar = useCallback(() => {
    if (!publicacion || enCurso.current) return;
    Alert.alert(TITULO_DE_ELIMINAR, MENSAJE_DE_ELIMINAR, [
      { text: 'Cancelar', style: 'cancel' },
      { text: BOTON_ELIMINAR, style: 'destructive', onPress: () => void correr('eliminar', eliminarDesdeElMuro) },
    ]);
  }, [correr, publicacion]);

  return { publicacion, ocupado, abrir, cerrar, ocultar, eliminar };
}
