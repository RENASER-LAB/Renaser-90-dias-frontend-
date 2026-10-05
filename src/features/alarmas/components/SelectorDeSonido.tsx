import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { GRUPOS_DE_SONIDOS, SONIDOS, type OpcionDeSonido, type SonidoDeAlarma } from '../sonidoDeAlarma';

/**
 * La lista de sonidos de Yo → Alarmas (2026-09-27): los de siempre arriba, y debajo dos grupos con
 * los sonidos que eligió el dueño, «Para alertar» y «Para relajar».
 *
 * Cada opción es una fila con dos toques distintos, uno al lado del otro (no uno dentro del otro):
 * tocar el nombre la ELIGE; el círculo con ▶ la hace sonar sin elegirla («escucharlo antes de
 * elegir»). El círculo es de 48 px (el mínimo cómodo de AGENTS.md) y sin texto, para que el detalle
 * tenga ancho en un teléfono angosto; la pantalla lo explica una vez arriba de la lista y el lector
 * de pantalla lo anuncia como «Escuchar <nombre>».
 */
interface Props {
  elegido: SonidoDeAlarma;
  ocupado: boolean;
  onElegir: (sonido: SonidoDeAlarma) => void;
  onEscuchar: (sonido: SonidoDeAlarma) => void;
}

export function SelectorDeSonido({ elegido, ocupado, onElegir, onEscuchar }: Props) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      {GRUPOS_DE_SONIDOS.map(grupo => (
        <View key={grupo.clave} style={{ gap: 8 }}>
          {grupo.titulo ? (
            <View style={estilos.cabecera}>
              <Text style={[estilos.subtitulo, { color: c.textStrong }]} accessibilityRole="header">{grupo.titulo}</Text>
              {grupo.detalle ? <Text style={[estilos.cuerpo, { color: c.textSoft }]}>{grupo.detalle}</Text> : null}
            </View>
          ) : null}
          {SONIDOS.filter(s => s.grupo === grupo.clave).map(s => (
            <FilaDeSonido
              key={s.clave}
              opcion={s}
              elegida={elegido === s.clave}
              ocupado={ocupado}
              onElegir={onElegir}
              onEscuchar={onEscuchar}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function FilaDeSonido({ opcion, elegida, ocupado, onElegir, onEscuchar }: {
  opcion: OpcionDeSonido;
  elegida: boolean;
  ocupado: boolean;
  onElegir: (sonido: SonidoDeAlarma) => void;
  onEscuchar: (sonido: SonidoDeAlarma) => void;
}) {
  const { c } = useTheme();
  // «Solo vibrar» no se escucha: se prueba.
  const accion = opcion.clave === 'vibrar' ? 'Probar' : 'Escuchar';
  return (
    <View style={[estilos.opcion, { borderColor: elegida ? c.gold : c.border, backgroundColor: elegida ? c.goldWash : c.cardBg }]}>
      <Pressable
        onPress={() => onElegir(opcion.clave)}
        disabled={ocupado}
        accessibilityRole="radio"
        accessibilityState={{ checked: elegida, disabled: ocupado }}
        accessibilityLabel={`${opcion.nombre}. ${opcion.detalle}`}
        style={estilos.eleccion}
      >
        {/* Un radio: vacío o con ✓ (2026-10-05). Antes el no elegido era el parlante, que se lee
            «escuchar», y escuchar es el botón de al lado. */}
        {elegida ? (
          <Icon name="checkCircle" size={20} color={c.goldInk} />
        ) : (
          <View testID="radio-vacio" style={[estilos.radioVacio, { borderColor: c.chevron }]} />
        )}
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={[estilos.nombre, { color: c.textStrong }]}>{opcion.nombre}</Text>
          <Text style={[estilos.cuerpo, { color: c.textSoft }]}>{opcion.detalle}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => onEscuchar(opcion.clave)}
        accessibilityRole="button"
        accessibilityLabel={`${accion} ${opcion.nombre}`}
        hitSlop={6}
        style={[estilos.escuchar, { borderColor: c.borderStrong }]}
      >
        <Icon name="play" size={18} color={c.textStrong} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { marginTop: 10, gap: 2 },
  subtitulo: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 23 },
  nombre: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, borderWidth: 1.5, borderRadius: 14, paddingRight: 10 },
  eleccion: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingLeft: 14, paddingVertical: 10 },
  escuchar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  /* El mismo círculo que el de `checkCircle` (radio 8 en la caja de 20) y el mismo grosor de trazo. */
  radioVacio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.75, margin: 2 },
});
