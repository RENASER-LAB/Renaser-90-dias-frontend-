import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../../components/Icon';
import { fuentes } from '../../../../theme/fuentes';
import { useTheme } from '../../../../theme/ThemeContext';
import type { ParteDelResumen, ResumenDeAudiencia } from '../../types/audiencia.types';
import { COLORES, NOMBRE_DE_LA_PARTE, lineaDeLaFoto, textoLlegaA } from '../../utils/audienciaDelFormulario';
import { ICONO_DEL_COLOR, colorDelSemaforo } from './ParaQuienEs';

/**
 * «Para quién es» en el detalle de un evento (spec 044, FR-035): cada parte con su cifra y, al final, a cuántos llega. Solo existe si el servidor la
 * mandó, es decir para quien lo creó o lo gestiona (FR-018). Quieta: es de lectura.
 */
export function ParaQuienEsDelEvento({ resumen, zona }: { resumen: ResumenDeAudiencia; zona: string | null }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={estilos.cabecera}>
        <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
          Para quién es
        </Text>
        <View style={estilos.solo}>
          <Icon name="eyeOff" size={14} color={c.textSoft} />
          <Text style={[estilos.soloTexto, { color: c.textSoft }]}>Solo lo ves tú</Text>
        </View>
      </View>
      <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        {resumen.partes.map((parte, i) => (
          <FilaDeLaParte key={`${parte.tipo}-${parte.id ?? parte.color ?? i}`} parte={parte} zona={zona} primera={i === 0} />
        ))}
        <View style={[estilos.fila, resumen.partes.length > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : null]}>
          <Text style={[estilos.total, { color: c.textStrong }]}>{textoLlegaA(resumen.total, false)}</Text>
        </View>
      </View>
    </View>
  );
}

function FilaDeLaParte({ parte, zona, primera }: { parte: ParteDelResumen; zona: string | null; primera: boolean }) {
  const { c } = useTheme();
  const color = parte.color ? COLORES.find(x => x.clave === parte.color) : null;
  const titulo = color
    ? color.nombre
    : parte.tipo === 'PERSON' || (parte.tipo === 'STAFF' && parte.personas.length > 0)
      ? `${parte.cuantos} ${parte.cuantos === 1 ? 'persona' : 'personas'}`
      : parte.tipo === 'STAFF'
        ? 'Todo el personal'
        : (parte.nombre ?? NOMBRE_DE_LA_PARTE[parte.tipo]);
  const sub = color ? lineaDeLaFoto(parte.resueltoEn, zona) : parte.personas.map(p => p.nombre).join(', ') || null;
  return (
    <View style={[estilos.fila, !primera ? { borderTopWidth: 1, borderTopColor: c.border } : null]} accessible accessibilityLabel={`${titulo}, ${parte.cuantos}`}>
      {parte.color ? <Icon name={ICONO_DEL_COLOR[parte.color]} size={20} color={colorDelSemaforo(c, parte.color)} /> : <Icon name="user" size={20} color={c.goldInk} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[estilos.filaTitulo, { color: c.textStrong }]}>{titulo}</Text>
        {sub ? <Text style={[estilos.filaSub, { color: c.textSoft }]}>{sub}</Text> : null}
      </View>
      <Text style={[estilos.cifra, { color: c.textSoft }]}>{parte.cuantos}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titulo: { fontFamily: fuentes.media, fontSize: 18, lineHeight: 24 },
  solo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  soloTexto: { fontFamily: fuentes.regular, fontSize: 13 },
  tarjeta: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  fila: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 6 },
  filaTitulo: { fontFamily: fuentes.seminegrita, fontSize: 16, lineHeight: 22 },
  filaSub: { fontFamily: fuentes.regular, fontSize: 14, lineHeight: 19 },
  cifra: { fontFamily: fuentes.seminegrita, fontSize: 15, fontVariant: ['tabular-nums'] },
  total: { fontFamily: fuentes.seminegrita, fontSize: 16 },
});
