import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import type { useProgramaPersonal } from '../../mentor/hooks/useProgramaPersonal';
import { BotonElegirDiaUno } from './BotonElegirDiaUno';

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
 *
 * D-261 (decisión del dueño del 2026-10-07: «que elija el día como los demás»): el botón ya no es
 * «Empezar» (`POST /mentor/activate-tracking`, que arrancaba HOY). Es «Elegir mi Día 1», que abre el
 * selector del aprendiz (`BotonElegirDiaUno` → `ActivarProgramaScreen`): las mismas fechas que da el
 * servidor, y al confirmar el `POST /onboarding/activate-program` le crea la fila con esa fecha.
 */
export function InvitacionProgramaPropio({
  programa,
  conAhoraNo = false,
  onActivado,
}: {
  programa: ProgramaPersonal;
  conAhoraNo?: boolean;
  /** Después de elegir el Día 1, para que la pantalla que la muestra se relea (Training). */
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
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <BotonElegirDiaUno
          onActivado={() => {
            programa.alEmpezar();
            onActivado?.();
          }}
        />
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
 * «Ahora no» de la invitación al programa personal. 48 px: pulsable con una sola mano.
 *
 * El borde de `secundario` **se conserva a propósito**, aunque viva dentro de una tarjeta que ya
 * tiene el suyo: es un control, no decoración. Sin contorno, "Ahora no" queda como texto suelto
 * al lado de un botón relleno, y para alguien de 40–60 deja de parecer pulsable. La regla de esta
 * pasada es quitar los bordes que sólo adornan, no los que dicen "esto se toca".
 */
const estilos = StyleSheet.create({
  secundario: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: space.radiusSm,
    borderWidth: 1,
  },
});
