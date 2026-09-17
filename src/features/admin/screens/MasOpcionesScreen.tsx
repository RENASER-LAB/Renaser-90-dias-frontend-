import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { irAPestana } from '../../../navigation/navegacionRef';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { avisar } from '../utils/dialogo';
import { CabeceraAdmin } from '../components/CabeceraAdmin';

/**
 * Lo institucional que se usa de vez en cuando.
 *
 * Acá está lo que HOY se puede hacer desde el teléfono y, con la misma claridad, lo que no. Los
 * paneles de catálogo, alta manual y soporte existen en el backend pero su edición es un
 * formulario largo, pensado para pantalla grande: prometer una entrada que lleva a una pantalla a
 * medias es peor que decir dónde está. El acceso a cursos no se duplica: sigue en Comunidad, que
 * es donde ya vive (ARF-14).
 */
export function MasOpcionesScreen({
  onVolver,
  onAbrirStaff,
}: {
  onVolver: () => void;
  onAbrirStaff: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const enLaApp: Array<{ titulo: string; detalle: string; onPress: () => void }> = [
    {
      titulo: 'Staff y roles',
      detalle: 'Cambiar el rol de una cuenta: aprendiz, mentor, líder, administrador o alquimista',
      onPress: onAbrirStaff,
    },
    {
      titulo: 'Cursos y comunidad',
      detalle: 'El catálogo vive en Comunidad, con el reproductor y el muro',
      onPress: () => {
        if (!irAPestana('Comunidad')) {
          avisar('Comunidad', 'Abre la pestaña Comunidad desde la barra de abajo.');
        }
      },
    },
  ];

  /**
   * Lo que NO se abre desde acá.
   *
   * Cada fila lleva su propio `motivo`: la explicación general de arriba se lee una vez y
   * después el ojo salta a las filas, así que el motivo tiene que viajar con la fila. Antes
   * estas cuatro se veían igual que las dos de arriba —misma tarjeta, mismo borde, solo
   * `opacity: 0.85`— y se tocaban esperando que abrieran algo.
   */
  const enLaWeb = [
    {
      titulo: 'Catálogo de hábitos',
      detalle: 'Crear, editar, guías, horarios y audioterapias',
      motivo: 'El formulario de un hábito son más de veinte campos y un audio por subir.',
    },
    {
      titulo: 'Invitar y editar cuentas',
      detalle: 'Dar de alta a mano y editar los datos de una persona',
      motivo: 'Necesita el alta completa con contraseña temporal y envío de correo.',
    },
    {
      titulo: 'Soporte y tickets',
      detalle: 'Bandeja de soporte y tickets de mentoría',
      motivo: 'Es una bandeja de trabajo con respuestas largas: pide teclado y pantalla.',
    },
    {
      titulo: 'Categorías del muro y conocimiento',
      detalle: 'Moderación y base de conocimiento',
      motivo: 'Moderar exige ver la publicación entera con sus adjuntos.',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Más opciones" onVolver={onVolver} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 16,
        }}
      >
        <View style={{ gap: 10 }}>
          <MicroLabel>Desde acá</MicroLabel>
          {enLaApp.map(item => (
            <Pressable
              key={item.titulo}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.titulo}
              style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
            >
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 15, fontWeight: '500' }]}>
                  {item.titulo}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]}>
                  {item.detalle}
                </Text>
              </View>
              {/* La flecha es la mitad visual del contraste: lo que se abre la tiene, lo que no
                  se abre lleva un candado. Sin ella la única diferencia sería el borde. */}
              <Icon name="chevron" size={18} color={c.chevron} />
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <MicroLabel>Desde el panel web</MicroLabel>
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
            Estas son operaciones con formularios largos. Existen y funcionan, pero desde una
            pantalla grande: acá se listan para que sepas dónde están, no para abrirlas a medias.
          </Text>
          {enLaWeb.map(item => (
            <View
              key={item.titulo}
              accessible
              accessibilityLabel={`${item.titulo}. No se abre desde el teléfono. ${item.motivo}`}
              /* Sin fondo de tarjeta y con el borde punteado: la diferencia se ve de lejos y sin
                 depender del color, que es lo que pedía AGENTS.md §4. `opacity: 0.85` no era una
                 diferencia, era la misma fila un poco más pálida. */
              style={[estilos.fila, estilos.filaInerte, { borderColor: c.border }]}
            >
              <View style={{ paddingTop: 3 }}>
                <Icon name="lock" size={16} color={c.chevron} />
              </View>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{item.titulo}</Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]}>
                  {item.detalle}
                </Text>
                {/* `c.chevron` y no `c.micro`: el dorado de `micro` es el acento de lo que se
                    puede tocar, y acá diría justo lo contrario de lo que la fila significa. */}
                <Text style={[t.body, { color: c.chevron, fontSize: 12.5, marginTop: 6, lineHeight: 18 }]}>
                  No se abre desde el teléfono. {item.motivo}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  /** Lo que no se abre: sin fondo de tarjeta, borde punteado y alineado arriba (lleva tres
      líneas de texto, así que centrar dejaba el candado flotando en el medio). */
  filaInerte: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    alignItems: 'flex-start',
  },
});
