import React from 'react';
import { Image, View } from 'react-native';

import { AvatarPersona } from '../../../components/ui';
import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';

/** Qué hay del otro lado de la conversación. Mismo vocabulario que `ChatConversation['type']`. */
export type TipoDeAvatar = 'celula' | 'direct' | 'global' | 'soporte';

/*
 * El sello chico en la esquina, que distingue grupo, comunidad y soporte sin leer nada. Un 1 a 1
 * no lleva: su foto o sus iniciales ya dicen que es una persona.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FENIX = require('../../../../assets/imagenes/fenix-renaser.png');

const SELLO: Partial<Record<TipoDeAvatar, IconName>> = {
  celula: 'users',
  global: 'users',
  soporte: 'chat',
};

/**
 * El avatar redondo de una conversación (chat estilo WhatsApp, 2026-09-26).
 *
 * - **1 a 1:** la foto de la persona o sus iniciales (`AvatarPersona`, el de toda la app).
 * - **Grupo, comunidad y soporte:** el avatar del PROGRAMA. El procedimiento de Operaciones dice
 *   que los grupos usan la foto de perfil oficial de Renaser, y el backend no manda imagen de
 *   grupo. Es el fénix de la tarjeta de bienvenida de Canva de Operaciones
 *   (`assets/imagenes/fenix-renaser.png`, recortado del mismo fondo que usa el backend en
 *   `bienvenida/fondo.png`). La exportación «Fotos de perfil - Formación 2026.png» salió en blanco
 *   (26/09); cuando Operaciones la vuelva a exportar, se reemplaza ese PNG con el mismo nombre.
 */
export function AvatarDeChat({
  tipo,
  nombre,
  avatarUrl,
  size,
}: {
  tipo: TipoDeAvatar;
  nombre?: string | null;
  avatarUrl?: string | null;
  size: number;
}) {
  const { c } = useTheme();
  if (tipo === 'direct') {
    return <AvatarPersona nombre={nombre} avatarUrl={avatarUrl} size={size} />;
  }
  const sello = SELLO[tipo];
  const selloTam = Math.round(size * 0.4);
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={nombre ?? 'Renaser'}>
      <Image
        source={FENIX}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: c.gold }}
        accessibilityIgnoresInvertColors
      />
      {sello && (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: selloTam,
            height: selloTam,
            borderRadius: selloTam / 2,
            backgroundColor: c.cardBgAlt,
            borderWidth: 1.5,
            borderColor: c.gold,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={sello} size={Math.round(selloTam * 0.58)} color={c.goldInk} />
        </View>
      )}
    </View>
  );
}
