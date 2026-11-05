import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ETIQUETA_OTRO_ENLACE, LINEA_CADA_FECHA, OPCION_LUGAR, OPCION_MEET, ROTULO_DONDE } from '../utils/enlaceDeMeet';
import type { DondeEs } from '../utils/formularioDeEvento';
import { Parrafo } from './piezas';

/**
 * «Dónde es» del formulario de eventos (spec 040, FR-019; decisión del dueño del 2026-11-05: «el Meet se crea solo… mucha configuración
 * arruina la experiencia»). Dos opciones grandes: «Por Meet (se crea solo)», que viene marcada, y «En un lugar». Debajo, discreto, «Pegar
 * otro enlace» para Zoom, Drive o un Meet que ya existe. No hay nada que elegir sobre quién entra: la sala siempre es abierta.
 *
 * Solo dibuja; el formulario decide cuándo (si el servidor puede crear la sala) y muestra el campo de la dirección o del link. Sin animación:
 * cambia al instante, con `tacto.seleccion()` al elegir.
 */
export function DondeEsElEvento({
  donde,
  porQueNo,
  serie = false,
  onCambiar,
}: {
  donde: DondeEs;
  /** Si el evento ya usaba el Meet automático pero el servidor ya no lo ofrece: una línea que dice por qué. */
  porQueNo?: string;
  /** El evento se repite: cada fecha tiene su propio enlace. */
  serie?: boolean;
  onCambiar: (donde: DondeEs) => void;
}) {
  const { c } = useTheme();
  const elegir = (valor: DondeEs) => {
    if (valor !== donde) tacto.seleccion();
    onCambiar(valor);
  };
  const opciones: ReadonlyArray<{ clave: DondeEs; nombre: string }> = [
    { clave: 'meet', nombre: OPCION_MEET },
    { clave: 'lugar', nombre: OPCION_LUGAR },
  ];
  return (
    <View style={{ gap: 8 }}>
      <Text style={[estilos.rotulo, { color: c.textStrong }]}>{ROTULO_DONDE}</Text>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        {opciones.map(opcion => {
          const elegido = donde === opcion.clave;
          return (
            <Pressable
              key={opcion.clave}
              onPress={() => elegir(opcion.clave)}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegido }}
              accessibilityLabel={opcion.nombre}
              style={[estilos.opcion, { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.goldWash : c.cardBg }]}
            >
              <Icon name={elegido ? 'checkCircle' : 'dots'} size={18} color={elegido ? c.goldInk : c.chevron} />
              <Text style={[estilos.texto, { color: c.textStrong }]}>{opcion.nombre}</Text>
            </Pressable>
          );
        })}
      </View>

      {donde === 'meet' && porQueNo ? <Parrafo tono="peligro">{porQueNo}</Parrafo> : null}
      {donde === 'meet' && serie ? <Parrafo>{LINEA_CADA_FECHA}</Parrafo> : null}

      {donde !== 'enlace' ? (
        <Pressable
          onPress={() => elegir('enlace')}
          accessibilityRole="button"
          accessibilityLabel={ETIQUETA_OTRO_ENLACE}
          hitSlop={4}
          style={estilos.discreto}
        >
          <Text style={[estilos.discretoTexto, { color: c.textSoft }]}>{ETIQUETA_OTRO_ENLACE}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  rotulo: { fontFamily: fuentes.media, fontSize: 17, lineHeight: 22 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 },
  texto: { fontFamily: fuentes.media, fontSize: 17, lineHeight: 22, flexShrink: 1 },
  discreto: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  discretoTexto: { fontFamily: fuentes.regular, fontSize: 16, lineHeight: 22, textDecorationLine: 'underline' },
});
