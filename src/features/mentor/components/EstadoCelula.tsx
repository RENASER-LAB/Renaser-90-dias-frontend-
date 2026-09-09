import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { FalloCelula } from '../hooks/useMiCelula';

/**
 * Los estados en los que la pantalla NO tiene una célula que mostrar.
 *
 * Cada uno se dice distinto porque cada uno se arregla distinto. Meterlos todos en un "algo
 * salió mal" deja al mentor sin saber si tiene que esperar, reintentar, o avisar a alguien —
 * y a quien mantiene la app, sin saber qué se rompió.
 *
 * Ninguno rellena la pantalla con datos de muestra.
 */

type Props = {
  fallo: FalloCelula | null;
  /** Hubo respuesta y la célula no tiene aprendices. */
  vacia?: boolean;
  detalle?: string | null;
  onReintentar: () => void;
};

const POR_FALLO: Record<FalloCelula, { icono: IconName; titulo: string; texto: string; reintentar: boolean }> = {
  no_disponible: {
    icono: 'clock',
    titulo: 'El seguimiento de células todavía no está disponible',
    texto:
      'La pantalla está lista y el modelo de datos existe, pero el servidor aún no expone el ' +
      'listado del grupo. Aparecerá aquí en cuanto se publique, sin que tengas que hacer nada.',
    reintentar: false,
  },
  sin_permiso: {
    icono: 'lock',
    titulo: 'Tu cuenta no figura como mentora de esta célula',
    texto: 'Si crees que es un error, escríbelo por soporte indicando el nombre de tu célula.',
    reintentar: false,
  },
  sin_red: {
    icono: 'info',
    titulo: 'No pudimos conectar',
    texto: 'Revisa tu conexión y vuelve a intentarlo. Tus datos no se han perdido.',
    reintentar: true,
  },
  error: {
    icono: 'info',
    titulo: 'No pudimos cargar tu célula',
    texto: 'Vuelve a intentarlo. Si sigue pasando, avísanos por soporte.',
    reintentar: true,
  },
};

export function EstadoCelula({ fallo, vacia, detalle, onReintentar }: Props) {
  const { c, t } = useTheme();

  if (vacia && !fallo) {
    return (
      <View style={estilos.caja}>
        <Icon name="users" size={26} color={c.chevron} />
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15, marginTop: 10, textAlign: 'center' }]}>
          Tu célula todavía no tiene aprendices
        </Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 13, textAlign: 'center', marginTop: 6 }]}>
          Cuando se asignen, los verás aquí con su día de programa y qué necesita cada uno.
        </Text>
      </View>
    );
  }

  if (!fallo) return null;
  const info = POR_FALLO[fallo];

  return (
    <View style={estilos.caja}>
      <Icon name={info.icono} size={26} color={fallo === 'no_disponible' ? c.goldInk : c.chevron} />
      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15, marginTop: 10, textAlign: 'center' }]}>
        {info.titulo}
      </Text>
      <Text style={[t.body, { color: c.textSoft, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 }]}>
        {info.texto}
      </Text>
      {/* El detalle tecnico solo cuando aporta: un mensaje de esquema dice que cambio el
          backend, y eso ahorra media hora a quien lo mantiene. */}
      {detalle && fallo === 'error' ? (
        <Text style={[t.micro, { color: c.chevron, fontSize: 10.5, textAlign: 'center', marginTop: 8 }]}>
          {detalle}
        </Text>
      ) : null}
      {info.reintentar ? (
        <View style={{ marginTop: 16, width: '100%' }}>
          <GoldButton label="REINTENTAR" variant="outline" onPress={onReintentar} />
        </View>
      ) : null}
    </View>
  );
}

/** Mientras se sabe. No pinta esqueletos con formas falsas de datos que quizá no lleguen. */
export function CargandoCelula() {
  const { c, t } = useTheme();
  return (
    <View style={estilos.caja}>
      <ActivityIndicator color={c.goldInk} />
      <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 12 }]}>
        Cargando tu célula…
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, paddingHorizontal: 18 },
});
