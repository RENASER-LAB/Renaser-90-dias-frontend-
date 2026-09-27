import React from 'react';
import { Image, View } from 'react-native';

import { AvatarPersona } from '../../../components/ui';
import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { useFotoDelSoporte } from '../hooks/useFotoDelSoporte';

/** Qué hay del otro lado de la conversación. Mismo vocabulario que `ChatConversation['type']`. */
export type TipoDeAvatar = 'celula' | 'direct' | 'global' | 'soporte';

/*
 * El sello chico en la esquina, que distingue grupo, comunidad y soporte sin leer nada. Un 1 a 1
 * no lleva: su foto o sus iniciales ya dicen que es una persona.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FENIX = require('../../../../assets/imagenes/fenix-renaser.png');
/*
 * La foto de los grupos (2026-09-27): la tarjeta de Canva SIN nombre que pasó el dueño
 * («Fotos de perfil - Formación 2026», `49.png`; es el mismo fondo que usa el backend en
 * `bienvenida/fondo.png`). El soporte de cada persona lleva su tarjeta CON su nombre, que manda el
 * servidor (`FotoDelSoporte`, D-205); esta queda debajo mientras carga y si falla.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TARJETA = require('../../../../assets/imagenes/tarjeta-renaser.jpg');

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
 *   grupo. Desde el 2026-09-27 es la tarjeta de Canva sin nombre (`tarjeta-renaser.jpg`, pedido
 *   del dueño: «esas 2 imágenes van de foto del grupo»). Antes era el fénix recortado de esa misma
 *   tarjeta, que sigue siendo la foto de los MENSAJES del programa (`FotoDelPrograma`): a 28 px la
 *   tarjeta entera no se distingue.
 *
 * `conSello={false}` (2026-09-27) lo deja sin el sello de la esquina: en la info del chat el
 * avatar va grande y la línea de abajo ya dice si es un grupo o el soporte.
 *
 * **Soporte con su foto (decisión del dueño del 2026-09-27, D-205 del backend):** con `fotoPath`, el
 * soporte muestra la tarjeta con el primer nombre de SU aprendiz, en la lista, la cabecera y la info.
 */
export function AvatarDeChat({
  tipo,
  nombre,
  avatarUrl,
  fotoPath,
  size,
  conSello = true,
}: {
  tipo: TipoDeAvatar;
  nombre?: string | null;
  avatarUrl?: string | null;
  /** Solo en un soporte: la ruta de su foto (`ChatConversation.fotoPath`). */
  fotoPath?: string | null;
  size: number;
  conSello?: boolean;
}) {
  const { c } = useTheme();
  if (tipo === 'direct') {
    return <AvatarPersona nombre={nombre} avatarUrl={avatarUrl} size={size} />;
  }
  const sello = conSello ? SELLO[tipo] : undefined;
  const selloTam = Math.round(size * 0.4);
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={nombre ?? 'Renaser'}>
      {tipo === 'soporte' && fotoPath ? <FotoDelSoporte ruta={fotoPath} size={size} /> : <FotoDelGrupo size={size} />}
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

/**
 * El fénix redondo con borde dorado: la foto del PROGRAMA. La usan el avatar de los grupos, el
 * soporte y la comunidad, y desde el 2026-09-27 los mensajes que manda el programa (la bienvenida
 * del soporte), al lado de su burbuja.
 */
export function FotoDelPrograma({ size, accessibilityLabel }: { size: number; accessibilityLabel?: string }) {
  const { c } = useTheme();
  return (
    <Image
      source={FENIX}
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: c.gold }}
      accessibilityIgnoresInvertColors
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/**
 * La foto de un grupo, la comunidad o el soporte: la tarjeta de Canva sin nombre, redonda y con
 * borde dorado para que no se pierda sobre el fondo claro (la tarjeta es casi blanca).
 */
export function FotoDelGrupo({ size }: { size: number }) {
  const { c } = useTheme();
  return (
    <Image
      source={TARJETA}
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: c.gold }}
      accessibilityIgnoresInvertColors
    />
  );
}

/**
 * La foto de un chat de soporte (D-205): la tarjeta con el primer nombre de su aprendiz, pedida con la
 * sesión (`useFotoDelSoporte`). La tarjeta sin nombre queda DEBAJO: se ve mientras carga y queda sola
 * si la foto no llega, así nunca hay un hueco en blanco ni un error a la vista.
 */
function FotoDelSoporte({ ruta, size }: { ruta: string; size: number }) {
  const { c } = useTheme();
  const { fuente, alFallar } = useFotoDelSoporte(ruta);
  return (
    <View style={{ width: size, height: size }}>
      <FotoDelGrupo size={size} />
      {fuente && (
        <Image
          source={fuente}
          onError={alFallar}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: c.gold,
          }}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}
