import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { TituloDeSeccion } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { DestinoDeLaPregunta, TipoDePregunta } from '../../diagnostico/types/diagnostico.types';
import type { SeccionAdmin } from '../types/diagnosticoAdmin.types';
import { quienAlimenta, recortarTexto } from '../utils/condiciones';
import { DESTINOS_EN_ORDEN, destinoCuadraConElTipo } from '../utils/tiposDePregunta';
import { TextoDeError } from './piezas';

/**
 * «Alimenta»: qué prepara la respuesta para la persona (un objetivo de Plan, su prioridad principal, su primera acción o cómo le habla
 * SER). Solo se ofrecen los destinos que cuadran con el tipo de la pregunta, y cada destino admite una sola pregunta: el que ya tiene
 * otra se ve apagado y dice cuál (el servidor responde 409 si se intenta igual).
 *
 * Si el tipo no cuadra con ningún destino y no hay ninguno elegido, el bloque no se dibuja.
 */
export function SelectorDeDestino({
  tipo,
  valor,
  secciones,
  preguntaId,
  onCambiar,
  error,
}: {
  tipo: TipoDePregunta;
  valor: DestinoDeLaPregunta | null;
  secciones: readonly SeccionAdmin[];
  preguntaId: number | null;
  onCambiar: (destino: DestinoDeLaPregunta | null) => void;
  error?: string | null;
}) {
  const { c, t } = useTheme();
  const compatibles = DESTINOS_EN_ORDEN.filter(d => destinoCuadraConElTipo(d.valor, tipo) || d.valor === valor);
  if (compatibles.length === 0) return null;

  const filas: Array<{ valor: DestinoDeLaPregunta | null; etiqueta: string; detalle: string; ocupadaPor: string | null }> = [
    { valor: null, etiqueta: 'Nada', detalle: 'Solo se guarda lo que responda.', ocupadaPor: null },
    ...compatibles.map(d => {
      const otra = quienAlimenta(d.valor, secciones, preguntaId);
      return { valor: d.valor, etiqueta: d.etiqueta, detalle: d.detalle, ocupadaPor: otra ? recortarTexto(otra.texto, 50) : null };
    }),
  ];

  return (
    <View style={{ gap: 10 }}>
      <TituloDeSeccion detalle="Lo que esta respuesta prepara para la persona.">Alimenta</TituloDeSeccion>
      <View accessibilityRole="radiogroup" accessibilityLabel="Qué alimenta esta pregunta" style={{ gap: 8 }}>
        {filas.map(f => {
          const marcada = f.valor === valor;
          const apagada = f.ocupadaPor !== null && !marcada;
          return (
            <Presionable
              key={f.valor ?? 'nada'}
              onPress={() => {
                if (apagada) return;
                tacto.seleccion();
                onCambiar(f.valor);
              }}
              disabled={apagada}
              accessibilityRole="radio"
              accessibilityState={{ selected: marcada, disabled: apagada }}
              accessibilityLabel={apagada ? `${f.etiqueta}. Ya lo alimenta otra pregunta` : f.etiqueta}
              style={[
                estilos.fila,
                { borderColor: marcada ? c.gold : c.border, backgroundColor: marcada ? c.goldWash : c.cardBg, opacity: apagada ? 0.55 : 1 },
              ]}
            >
              <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>{f.etiqueta}</Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
                {apagada ? `Ya lo alimenta «${f.ocupadaPor}».` : f.detalle}
              </Text>
            </Presionable>
          );
        })}
      </View>
      {error ? <TextoDeError texto={error} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { minHeight: 56, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2, justifyContent: 'center' },
});
