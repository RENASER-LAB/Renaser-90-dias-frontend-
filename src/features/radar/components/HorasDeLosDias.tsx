import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InterruptorGrande } from '../../../components/InterruptorGrande';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { VistaDeLosDias } from '../utils/diasDeMiRadar';
import { HorariosDeMiRadar } from './HorariosDeMiRadar';

/**
 * Las horas de los días marcados en Mi Radar (spec 012, cuarta ronda): primero «Sin Radar ese día» (un interruptor grande,
 * como el de «Mi Radar») y, si ese día sí tiene Radar, las horas en punto de siempre.
 *
 * - **Si los días marcados no coinciden** el interruptor dice «Varía» y no se marca ninguna hora; una línea lo dice («Estos
 *   días tienen horas distintas») y lo que se elija se pone a todos los marcados.
 * - **«Sin Radar»** esconde las horas: ese día no suena nada y no se registra. Volver a apagarlo muestra las que seguirían.
 * - **«Dejar sáb como los demás días»** solo aparece si alguno de los marcados tiene horas propias.
 *
 * Presentacional: no guarda ni valida nada; lo hace la pantalla.
 */
export function HorasDeLosDias({
  vista,
  cuantosDias,
  frase,
  alCambiarSinRadar,
  alAlternarHora,
  deshabilitado = false,
  ofreceDejarComoLosDemas,
  alDejarComoLosDemas,
}: {
  vista: VistaDeLosDias;
  cuantosDias: number;
  /** Los marcados dichos en una línea: `sáb, dom`. */
  frase: string;
  alCambiarSinRadar: (nuevo: boolean) => void;
  alAlternarHora: (hora: number) => void;
  deshabilitado?: boolean;
  ofreceDejarComoLosDemas: boolean;
  alDejarComoLosDemas: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <InterruptorGrande
        etiqueta={cuantosDias === 1 ? 'Sin Radar ese día' : 'Sin Radar estos días'}
        descripcion="No suena ningún aviso y no se registra."
        valor={vista.sin}
        onCambiar={alCambiarSinRadar}
        deshabilitado={deshabilitado}
      />
      {vista.sin === true ? null : (
        <>
          {vista.distintas ? (
            <Text accessibilityLiveRegion="polite" style={[estilos.distintas, { color: c.text }]}>
              Estos días tienen horas distintas
            </Text>
          ) : null}
          <HorariosDeMiRadar elegidas={vista.horas} alAlternar={alAlternarHora} deshabilitado={deshabilitado} />
        </>
      )}
      {ofreceDejarComoLosDemas ? (
        <Presionable
          onPress={alDejarComoLosDemas}
          disabled={deshabilitado}
          accessibilityRole="button"
          hitSlop={8}
          style={estilos.enlaceQuitar}
        >
          <Text style={[estilos.textoDelEnlace, { color: c.textSoft }]}>Dejar {frase} como los demás días</Text>
        </Presionable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // «Estos días tienen horas distintas»: a 16 px y con el color del texto, nunca el gris tenue (como en Planificar).
  distintas: { fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22 },
  enlaceQuitar: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  textoDelEnlace: { fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22, textDecorationLine: 'underline' },
});
