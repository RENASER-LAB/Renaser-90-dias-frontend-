import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { OrigenPorElegir } from '../hooks/useRegistroConFoto';
import type { OrigenDeLaFoto } from '../utils/registroConFoto';

/**
 * «De dónde sale la foto»: la hoja que se abre al tocar KILÓMETROS DIARIOS (#41, pedido del dueño,
 * 2026-10-29). El hábito pide la captura de la app de actividad (Strava, Google Fit, el reloj), y esa
 * captura vive en la galería: con la cámara del mismo teléfono no se puede sacar. Los demás hábitos
 * con evidencia obligatoria no pasan por acá: abren la cámara directo.
 *
 * Una hoja desde abajo (`HojaDesdeAbajo`, la de todas las opciones de la app) con dos filas grandes
 * (48 o más de alto, texto de 17 y 16 px). Elegir vibra con el «tic» de selección y cierra la hoja;
 * el gesto, el fondo, la ✕ y el atrás de Android la cierran sin sacar ninguna foto. Entra y sale
 * como el resto de las hojas: no suma movimiento propio.
 */
export const OPCIONES_DE_ORIGEN: readonly {
  origen: OrigenDeLaFoto;
  icono: IconName;
  titulo: string;
  detalle: string;
}[] = [
  { origen: 'camara', icono: 'camera', titulo: 'Tomar foto', detalle: 'Con la cámara del teléfono' },
  {
    origen: 'galeria',
    icono: 'image',
    titulo: 'Elegir de la galería',
    detalle: 'Para la captura de tu app de actividad',
  },
];

export function HojaDeOrigenDeLaFoto({ origen }: { origen: OrigenPorElegir | null }) {
  const { c, t } = useTheme();
  // Mientras baja se sigue viendo lo último que mostró: `HojaDesdeAbajo` guarda su propio árbol.
  return (
    <HojaDesdeAbajo
      visible={origen !== null}
      alCerrar={() => origen?.onCancelar()}
      titulo="Sube tu foto"
      subtitulo={origen ? `Para registrar «${origen.titulo}»` : undefined}
      etiquetaCerrar="Cerrar sin elegir la foto"
    >
      <View style={styles.cuerpo}>
        {OPCIONES_DE_ORIGEN.map(opcion => (
          <Presionable
            key={opcion.origen}
            onPress={() => {
              tacto.seleccion();
              origen?.onElegir(opcion.origen);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${opcion.titulo}. ${opcion.detalle}`}
            style={[styles.fila, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
          >
            <Icon name={opcion.icono} size={TAMANO_ICONO.grande} color={c.goldInk} />
            <View style={styles.textos}>
              <Text style={[t.cardTitle, styles.titulo, { color: c.textStrong }]}>{opcion.titulo}</Text>
              <Text style={[t.small, styles.detalle, { color: c.textSoft }]}>{opcion.detalle}</Text>
            </View>
          </Presionable>
        ))}
      </View>
    </HojaDesdeAbajo>
  );
}

const styles = StyleSheet.create({
  cuerpo: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: 17 },
  detalle: { fontSize: 16, lineHeight: 22 },
});
