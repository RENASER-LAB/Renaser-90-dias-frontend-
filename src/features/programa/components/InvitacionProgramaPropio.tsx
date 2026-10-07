import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import type { useProgramaPersonal } from '../../mentor/hooks/useProgramaPersonal';

type ProgramaPersonal = ReturnType<typeof useProgramaPersonal>;

/**
 * «Hacer mi programa de 90 días» para quien no es aprendiz y todavía no tiene programa.
 *
 * Era una tarjeta escrita dentro de Hoy. Salió a su propio archivo (D-260) para que Training —que
 * a esa persona le mostraba «No pudimos cargar tu entrenamiento» con «Participante no encontrado:
 * <uuid>»— y Yo —la entrada que queda después de «Ahora no»— ofrezcan lo mismo, con el mismo texto
 * y el mismo botón, en vez de una copia por pantalla.
 *
 * Invitación secundaria, no un bloqueo. Acompañar no exige cursar (D-07), así que es una oferta:
 * «Ahora no» (solo en Hoy) no llama a nada, y menos al DELETE, que borraría la participación entera.
 */
export function InvitacionProgramaPropio({
  programa,
  conAhoraNo = false,
  onActivado,
}: {
  programa: ProgramaPersonal;
  conAhoraNo?: boolean;
  /** Después de empezar, para que la pantalla que la muestra se relea (Training). */
  onActivado?: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Card>
      <MicroLabel>Tu programa</MicroLabel>
      <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 8 }]}>Hacer mi programa de 90 días</Text>
      {/* Era `fontSize: 13`, por debajo del mínimo de párrafo de AGENTS.md §4 (14–15.5). */}
      <Text style={[t.body, { color: c.textSoft, marginTop: 8 }]}>
        Puedes recorrerlo tú también: tus hábitos, tus objetivos y tu Mapa, con tu propio día. No cambia
        nada de lo que ves como acompañante.
      </Text>
      {programa.error ? (
        <Text style={[t.small, { color: c.danger, marginTop: 10 }]}>{programa.error}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <Pressable
          onPress={async () => {
            if (await programa.activar()) onActivado?.();
          }}
          disabled={programa.activando}
          accessibilityRole="button"
          accessibilityState={{ disabled: programa.activando }}
          style={[estilos.principal, { backgroundColor: c.gold, opacity: programa.activando ? 0.6 : 1 }]}
        >
          <Text style={[t.body, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>
            {programa.activando ? 'Activando…' : 'Empezar'}
          </Text>
        </Pressable>
        {conAhoraNo ? (
          <Pressable
            onPress={() => void programa.posponer()}
            accessibilityRole="button"
            accessibilityLabel="Ahora no. No se borra nada."
            style={[estilos.secundario, { borderColor: c.border }]}
          >
            <Text style={[t.body, { color: c.textSoft }]}>Ahora no</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

/**
 * Botones de la invitación al programa personal. 48 px: pulsables con una sola mano.
 *
 * El borde de `secundario` **se conserva a propósito**, aunque viva dentro de una tarjeta que ya
 * tiene el suyo: es un control, no decoración. Sin contorno, "Ahora no" queda como texto suelto
 * al lado de un botón relleno, y para alguien de 40–60 deja de parecer pulsable. La regla de esta
 * pasada es quitar los bordes que sólo adornan, no los que dicen "esto se toca".
 */
const estilos = StyleSheet.create({
  principal: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: space.radiusSm,
  },
  secundario: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: space.radiusSm,
    borderWidth: 1,
  },
});
