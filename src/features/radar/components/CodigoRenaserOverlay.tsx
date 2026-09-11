import React from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useRadar } from '../RadarContext';
import { CodigoRenaserModal } from './CodigoRenaserModal';

/**
 * El Código Renaser por ENCIMA del navegador, como RENASIA y el arranque guiado.
 *
 * Vive en `App.tsx` y no dentro de una pantalla por una razón concreta: para el aprendiz el
 * formulario es innegociable, y algo montado dentro de Hoy se esquiva tocando otra pestaña. Acá
 * cubre la app entera —barra de pestañas incluida— y el retroceso del sistema no lo descarta.
 *
 * Para los demás roles el mismo componente es una invitación que se puede cerrar. La diferencia
 * la decide `RadarContext` a partir de `rolesObligados`; este archivo sólo pinta.
 *
 * Se quita borrando su línea en `App.tsx`, igual que los otros dos overlays.
 */
export function CodigoRenaserOverlay() {
  const radar = useRadar();
  const { user } = useAuth();

  return (
    <CodigoRenaserModal
      visible={radar.abierto && radar.slot !== null}
      slot={radar.slot}
      obligatorio={radar.obligatorio}
      usuarioId={user?.id ?? null}
      enviando={radar.enviando}
      error={radar.error}
      onEnviar={radar.enviar}
      onCerrar={radar.cerrar}
      onLimpiarError={radar.limpiarError}
    />
  );
}
