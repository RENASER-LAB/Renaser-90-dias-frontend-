import React from 'react';
import { Image, View } from 'react-native';

import { AvatarPersona } from '../../../components/ui';
import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { useFotoConSesion } from '../hooks/useFotoConSesion';
import { fotoDeLaConversacion } from '../utils/fotosDelChat';

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
 * servidor (D-205); esta queda debajo mientras carga y si falla.
 *
 * > **Corregido 2026-09-27 (D-206).** Esta tarjeta también era la foto de la comunidad (8971acf). El
 * > dueño pidió que el chat global vuelva al fénix («de la plantilla que te pasé los 2 png […] solo
 * > afecta esos 2 primeros»: el grupo y el soporte).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TARJETA = require('../../../../assets/imagenes/tarjeta-renaser.jpg');

const SELLO: Partial<Record<TipoDeAvatar, IconName>> = {
  celula: 'users',
  global: 'users',
  soporte: 'chat',
};

/**
 * El avatar redondo de una conversación (chat estilo WhatsApp, 2026-09-26). Qué foto lleva cada una
 * lo decide `fotoDeLaConversacion` (`utils/fotosDelChat.ts`):
 *
 * - **1 a 1:** la foto de la persona o sus iniciales (`AvatarPersona`, el de toda la app).
 * - **Grupo:** la tarjeta de Canva sin nombre (`tarjeta-renaser.jpg`, pedido del dueño del
 *   2026-09-27: «esas 2 imágenes van de foto del grupo»). El procedimiento de Operaciones dice que los
 *   grupos usan la foto de perfil oficial de Renaser, y el backend no manda imagen de grupo.
 * - **Soporte:** con `fotoPath`, la tarjeta con el primer nombre de SU aprendiz (decisión del dueño
 *   del 2026-09-27, D-205 del backend), en la lista, la cabecera y la info; sin ella, la sin nombre.
 * - **Comunidad:** el fénix del programa (`FotoDelPrograma`), que también es la foto de los MENSAJES
 *   del programa.
 *
 * > **Corregido 2026-09-27 (D-206).** Decía «Grupo, comunidad y soporte: el avatar del PROGRAMA …
 * > desde el 2026-09-27 es la tarjeta de Canva sin nombre». La comunidad volvió al fénix: el dueño
 * > aclaró que la plantilla era para el grupo y el soporte.
 *
 * `conSello={false}` (2026-09-27) lo deja sin el sello de la esquina: en la info del chat el
 * avatar va grande y la línea de abajo ya dice si es un grupo o el soporte.
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
  const foto = fotoDeLaConversacion(tipo, fotoPath);
  if (foto === 'persona') {
    return <AvatarPersona nombre={nombre} avatarUrl={avatarUrl} size={size} />;
  }
  const sello = conSello ? SELLO[tipo] : undefined;
  const selloTam = Math.round(size * 0.4);
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={nombre ?? 'Renaser'}>
      {foto === 'fenix' ? (
        <FotoDelPrograma size={size} />
      ) : foto === 'tarjeta-con-nombre' && fotoPath ? (
        <FotoConSesion ruta={fotoPath} size={size} debajo={<FotoDelGrupo size={size} />} />
      ) : (
        <FotoDelGrupo size={size} />
      )}
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
 * El fénix redondo con borde dorado: la foto del PROGRAMA. La usan el avatar de la comunidad y, desde
 * el 2026-09-27, los mensajes que manda el programa (las bienvenidas), al lado de su burbuja.
 *
 * > **Corregido 2026-09-27 (D-206).** Decía que la usaban «el avatar de los grupos, el soporte y la
 * > comunidad»: los grupos y el soporte llevan la tarjeta de Canva desde 8971acf y D-205.
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
 * La foto de un grupo (y la del soporte mientras carga la suya): la tarjeta de Canva sin nombre,
 * redonda y con borde dorado para que no se pierda sobre el fondo claro (la tarjeta es casi blanca).
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
 * Una foto que el servidor sirve con la sesión (`useFotoConSesion`), redonda y con borde dorado, ENCIMA
 * de `debajo`: lo de debajo se ve mientras carga y queda solo si la foto no llega, así nunca hay un
 * hueco en blanco ni un error a la vista. La usan el soporte (debajo, la tarjeta sin nombre; D-205) y
 * cada integrante de la info de un grupo (debajo, sus iniciales; D-206).
 */
export function FotoConSesion({ ruta, size, debajo }: { ruta: string; size: number; debajo: React.ReactNode }) {
  const { c } = useTheme();
  const { fuente, alFallar } = useFotoConSesion(ruta);
  return (
    <View style={{ width: size, height: size }}>
      {debajo}
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
