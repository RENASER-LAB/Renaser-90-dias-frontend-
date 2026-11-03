import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { Presionable } from '../../../components/Presionable';
import { TituloDeSeccion } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import type { CondicionDeLaPregunta } from '../../diagnostico/types/diagnostico.types';
import type { PreguntaAdmin } from '../types/diagnosticoAdmin.types';
import { recortarTexto } from '../utils/condiciones';
import { TextoDeError } from './piezas';

type Modo = 'siempre' | 'si';

/**
 * «Se muestra solo si…»: una pregunta se muestra siempre, o solo cuando la persona respondió una opción concreta de una pregunta ANTERIOR
 * de opción única o casillas (la condición no puede mirar hacia adelante). `candidatas` ya viene filtrada (`preguntasQuePuedenSerCondicion`).
 *
 * Movimiento: el control cambia al instante (`sinAnimacion`); lo de abajo aparece sin transición, que se toca poco y mueve el resto.
 */
export function SelectorDeCondicion({
  activa,
  condicion,
  candidatas,
  onCambiar,
  error,
}: {
  activa: boolean;
  condicion: CondicionDeLaPregunta | null;
  candidatas: PreguntaAdmin[];
  onCambiar: (parcial: { condicionActiva: boolean; condicion: CondicionDeLaPregunta | null }) => void;
  error?: string | null;
}) {
  const { c, t } = useTheme();
  const [elegidaId, setElegidaId] = useState<number | null>(condicion?.preguntaId ?? null);
  const elegida = candidatas.find(p => p.id === elegidaId) ?? null;

  return (
    <View style={{ gap: 10 }}>
      <TituloDeSeccion detalle="Una pregunta puede mostrarse solo a quien respondió algo antes.">Se muestra solo si</TituloDeSeccion>
      <ControlSegmentado<Modo>
        rol="radio"
        accessibilityLabel="Cuándo se muestra esta pregunta"
        sinAnimacion
        opciones={[
          { valor: 'siempre', etiqueta: 'Siempre' },
          { valor: 'si', etiqueta: 'Solo si…' },
        ]}
        valor={activa ? 'si' : 'siempre'}
        onCambiar={modo => onCambiar({ condicionActiva: modo === 'si', condicion })}
      />
      {activa ? (
        candidatas.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
            Todavía no hay una pregunta anterior de opción única o casillas de la que pueda depender esta.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>Depende de la pregunta</Text>
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {candidatas.map(p => {
                const marcada = p.id === elegidaId;
                return (
                  <Presionable
                    key={p.id}
                    onPress={() => {
                      tacto.seleccion();
                      setElegidaId(p.id);
                      // Cambiar de pregunta suelta la respuesta elegida: las opciones son otras.
                      if (p.id !== condicion?.preguntaId) onCambiar({ condicionActiva: true, condicion: null });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: marcada }}
                    accessibilityLabel={p.texto}
                    style={[estilos.fila, { borderColor: marcada ? c.gold : c.border, backgroundColor: marcada ? c.goldWash : c.cardBg }]}
                  >
                    <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, flexShrink: 1 }]} numberOfLines={3}>
                      {recortarTexto(p.texto, 140)}
                    </Text>
                  </Presionable>
                );
              })}
            </View>
            {elegida ? (
              <View style={{ gap: 8 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>Se muestra cuando responda</Text>
                <View style={estilos.chips} accessibilityRole="radiogroup">
                  {elegida.opciones.map(o => (
                    <ChipDeOpcion
                      key={o.valor}
                      etiqueta={o.etiqueta}
                      activo={condicion?.preguntaId === elegida.id && condicion.valor === o.valor}
                      onPress={() => onCambiar({ condicionActiva: true, condicion: { preguntaId: elegida.id, valor: o.valor } })}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )
      ) : null}
      {error ? <TextoDeError texto={error} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
