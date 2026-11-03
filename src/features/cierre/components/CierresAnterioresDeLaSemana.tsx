import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { LecturaDelCierre } from '../utils/lecturaDeCierres';
import { textoDeLaLectura, textoDeUnDia, type DiaDeLaTarjeta } from '../utils/semanaDelCierre';

export const TITULO_DE_LA_SEMANA = 'Tus cierres de la semana';
export const AYUDA_DE_LA_SEMANA = 'Toca un día que ya pasó para ver cómo quedó. Un día que terminó no se puede cerrar.';

/**
 * La semana de la tarjeta «Cierra tu día» (spec 033, decisión del dueño 033-1 A: los días anteriores se ven **solo en Plan, en
 * la misma tarjeta**). Siete días de lunes a domingo: los que ya pasaron (desde el Día 1) se tocan; hoy y los que vienen no.
 * Tocar uno **solo lo lee** —«Cerrado a las 21:40» con lo que respondió, o «Sin cerrar»—, nunca ofrece cerrarlo: un día que
 * terminó no se cierra tarde (D-259). Lo que cada día dice es de `semanaDelCierre` (puro).
 *
 * Elegir un día es una acción frecuente y de solo lectura: cambio instantáneo y el «tic» de selección, sin animación. El
 * detalle es una región viva (`accessibilityLiveRegion`) para que el lector de pantalla anuncie lo que apareció.
 */
export function CierresAnterioresDeLaSemana({
  dias,
  elegido,
  lectura,
  onElegir,
  onReintentar,
}: {
  dias: readonly DiaDeLaTarjeta[];
  /** `YYYY-MM-DD` del día tocado, o `null`. */
  elegido: string | null;
  /** Lo que se sabe del día tocado. */
  lectura: LecturaDelCierre | undefined;
  onElegir: (iso: string) => void;
  onReintentar: (iso: string) => void;
}) {
  const { c, t } = useTheme();
  const sinDatos = elegido ? textoDeLaLectura(lectura, elegido) : null;
  const dicho = lectura?.estado === 'datos' ? textoDeUnDia(lectura.cierre) : null;

  return (
    <View style={estilos.contenedor}>
      <MicroLabel>{TITULO_DE_LA_SEMANA}</MicroLabel>
      <View style={estilos.fila} accessibilityRole="radiogroup" accessibilityLabel="Días de la semana">
        {dias.map(dia => {
          const activo = dia.iso === elegido;
          const esHoy = dia.relacion === 'hoy';
          const futuro = dia.relacion === 'futuro';
          // Hoy es lo más visible de la fila (issue #115, 4): pleno (nunca atenuado, aunque no se pueda tocar), con el número en negrita y un
          // punto debajo. Los días pasados van normales; los que vienen, apagados; y uno anterior al Día 1 (que tampoco se puede ver), también.
          const apagado = !esHoy && !dia.leible;
          const colorDelNumero = activo ? c.onGold : esHoy ? c.textStrong : futuro || apagado ? c.textSoft : c.textStrong;
          return (
            <Presionable
              key={dia.iso}
              disabled={!dia.leible}
              onPress={() => {
                if (!activo) tacto.seleccion();
                onElegir(dia.iso);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo, disabled: !dia.leible }}
              accessibilityLabel={`${dia.nombre} ${dia.numero}${esHoy ? ', hoy' : ''}${dia.leible ? '' : ', no se puede ver'}`}
              contenedorStyle={{ flex: 1, opacity: apagado ? 0.45 : 1 }}
              style={[estilos.pastilla, activo && { backgroundColor: c.gold }]}
            >
              <Text style={[t.small, estilos.letra, { color: activo ? c.onGold : esHoy ? c.goldInk : c.textSoft }, esHoy && estilos.letraDeHoy]}>
                {dia.letra}
              </Text>
              <Text style={[t.body, estilos.numero, { color: colorDelNumero }, esHoy ? estilos.numeroDeHoy : estilos.numeroNormal]}>{dia.numero}</Text>
              {esHoy ? <View style={[estilos.puntoDeHoy, { backgroundColor: activo ? c.onGold : c.goldInk }]} accessible={false} /> : null}
            </Presionable>
          );
        })}
      </View>

      {elegido === null ? (
        <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>{AYUDA_DE_LA_SEMANA}</Text>
      ) : (
        <View style={estilos.detalle} accessibilityLiveRegion="polite">
          {dicho ? (
            <>
              <Text style={[t.body, estilos.titulo, { color: c.textStrong }]}>{dicho.titulo}</Text>
              {dicho.respuestas.map(linea => (
                <Text key={linea} style={[t.small, { color: c.textSoft, fontSize: 15 }]}>
                  {linea}
                </Text>
              ))}
              {dicho.nota ? <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>Tu nota: {dicho.nota}</Text> : null}
            </>
          ) : (
            <Text style={[t.body, { color: c.textSoft }]}>{sinDatos}</Text>
          )}
          {lectura?.estado === 'error' ? (
            <Presionable onPress={() => onReintentar(elegido)} accessibilityRole="button" accessibilityLabel="Reintentar" style={estilos.enlace}>
              <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.negrita, fontSize: 16 }]}>Reintentar</Text>
            </Presionable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 10 },
  fila: { flexDirection: 'row', gap: 4 },
  pastilla: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  letra: { fontFamily: fuentes.media, fontSize: 13 },
  letraDeHoy: { fontFamily: fuentes.negrita },
  numero: { fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  numeroNormal: { fontFamily: fuentes.media },
  numeroDeHoy: { fontFamily: fuentes.negrita, fontSize: 17 },
  /* Fuera del flujo: el punto no corre el número de hoy respecto de los demás días. */
  puntoDeHoy: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 3 },
  detalle: { gap: 4 },
  titulo: { fontFamily: fuentes.negrita, fontSize: 16 },
  enlace: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
});
