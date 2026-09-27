import React from 'react';

import { AvatarPersona } from '../../../components/ui';
import { fotoDelIntegrante } from '../utils/fotosDelChat';
import { FotoConSesion } from './AvatarDeChat';

/**
 * La foto de una persona en la lista de integrantes de la info de un grupo (D-206, pedido del dueño
 * del 2026-09-27: la info mostraba «RP», «EL», «EL» y tiene que mostrar la tarjeta con el nombre de
 * cada uno). La regla es `fotoDelIntegrante`: si el servidor manda la ruta de su tarjeta, la tarjeta,
 * con las iniciales debajo mientras carga o si falla; si no, su foto subida; si tampoco, las iniciales.
 * Qué personas llevan la ruta lo decide el modo del servidor (`CHAT_FOTO_DE_INTEGRANTES`).
 */
export function AvatarDeIntegrante({
  nombre,
  avatarUrl,
  fotoPath,
  size,
}: {
  /** El nombre completo: dibuja las iniciales. */
  nombre: string;
  avatarUrl: string | null;
  fotoPath: string | null;
  size: number;
}) {
  const foto = fotoDelIntegrante({ fotoPath, avatarUrl });
  if (foto === 'tarjeta-con-nombre' && fotoPath) {
    return (
      <FotoConSesion ruta={fotoPath} size={size} debajo={<AvatarPersona nombre={nombre} avatarUrl={null} size={size} />} />
    );
  }
  return <AvatarPersona nombre={nombre} avatarUrl={foto === 'foto-subida' ? avatarUrl : null} size={size} />;
}
