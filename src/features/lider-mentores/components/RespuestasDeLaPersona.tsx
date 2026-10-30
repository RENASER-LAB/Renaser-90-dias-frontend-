import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { SemanaDePersona } from '../types/cumplimientoDelLider.types';
import {
  respuestaDeEvidencias,
  respuestaDeProgramacion,
  type RespuestaDeLaFicha,
} from '../utils/respuestasDeLaPersona';

/**
 * Las dos respuestas que el equipo pidió ver primero al tocar a una persona (spec 018): «¿Programó?» y «¿Subió
 * evidencias?», en dos tarjetas iguales arriba de sus días. Las comparte la ficha del líder y la de Administración (es la
 * misma `PersonaDelLiderScreen`).
 *
 * - **«¿Programó?»** es el «Sí» / «No» que dice el servidor, con las cuentas debajo (hábitos con su hora y acciones
 *   agendadas). Sin la programación —un servidor anterior, o nada que programar hoy— esa tarjeta no se dibuja.
 * - **«¿Subió evidencias?»** es «4 de 12»: de los hábitos de estos 7 días que pedían evidencia, cuántos la tienen. Se
 *   cuenta de los días que la ficha ya trajo; sin hábitos que pidan evidencia no se dibuja.
 * - Una sola tarjeta ocupa todo el ancho; ninguna, no deja un hueco. El «Sí» y el «No» llevan su ícono además del color.
 */
export function RespuestasDeLaPersona({ datos }: { datos: SemanaDePersona }) {
  const respuestas = [respuestaDeProgramacion(datos.programacion), respuestaDeEvidencias(datos.dias)].filter(
    (respuesta): respuesta is RespuestaDeLaFicha => respuesta !== null,
  );
  if (respuestas.length === 0) return null;

  return (
    <View style={estilos.fila}>
      {respuestas.map(respuesta => (
        <TarjetaDeRespuesta key={respuesta.pregunta} respuesta={respuesta} />
      ))}
    </View>
  );
}

function TarjetaDeRespuesta({ respuesta }: { respuesta: RespuestaDeLaFicha }) {
  const { c, t } = useTheme();
  const color = respuesta.tono === 'bien' ? c.success : respuesta.tono === 'mal' ? c.danger : c.textStrong;
  const fondo = respuesta.tono === 'bien' ? c.successWash : respuesta.tono === 'mal' ? c.dangerWash : c.cardBg;

  return (
    <View
      accessible
      accessibilityLabel={respuesta.dicho}
      style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: fondo }]}
    >
      <Text style={[t.small, estilos.pregunta, { color: c.textSoft }]}>{respuesta.pregunta}</Text>
      <View style={estilos.valor}>
        {respuesta.tono === 'neutro' ? null : (
          <Icon name={respuesta.tono === 'bien' ? 'checkCircle' : 'close'} size={20} color={color} />
        )}
        <Text style={[estilos.cifra, { color }]}>{respuesta.valor}</Text>
      </View>
      <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 20 }]}>{respuesta.detalle}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  /* Dos tarjetas iguales; en un teléfono angosto la segunda baja en vez de apretarse. */
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tarjeta: { flexGrow: 1, flexBasis: 150, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  pregunta: { fontFamily: 'Jost_700Bold', fontSize: 14, lineHeight: 19 },
  valor: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  /* Cifras tabulares: «4 de 12» y «10 de 12» no bailan de ancho de una ficha a otra. */
  cifra: { fontFamily: 'Jost_700Bold', fontSize: 26, lineHeight: 32, fontVariant: ['tabular-nums'] },
});
