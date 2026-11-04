import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Interruptor } from '../../../components/Interruptor';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { AccesoDeLaSala } from '../types/eventos.types';
import {
  ACCESOS_DE_LA_SALA,
  AYUDA_CREAR_ENLACE,
  ETIQUETA_CREAR_ENLACE,
  LINEA_CADA_FECHA,
  ROTULO_ACCESO,
} from '../utils/enlaceDeMeet';
import { Parrafo } from './piezas';

/**
 * «Crear enlace de Meet» del formulario de eventos (spec 040, FR-019): un interruptor en el lugar del campo del link y, debajo, cuando está
 * encendido, «Quién puede entrar: Abierta · Con permiso» con una sola frase de ayuda por opción. «Abierta» viene marcada.
 *
 * El formulario decide CUÁNDO se dibuja (solo si el servidor dice que se puede, o si el evento ya lo usaba); esta pieza solo dibuja. Sin
 * animación: se usa poco y cambia al instante (`Interruptor` mueve su pulgar como siempre, `tacto.seleccion()` al elegir).
 */
export function SeccionDelEnlaceDeMeet({
  encendido,
  acceso,
  porQueNo,
  serie = false,
  onEncender,
  onElegirAcceso,
}: {
  encendido: boolean;
  acceso: AccesoDeLaSala;
  /** Si el evento ya lo usaba pero el servidor ya no lo ofrece: una línea que dice por qué (sin esconder el interruptor). */
  porQueNo?: string;
  /** El evento se repite: cada fecha tiene su propio enlace. */
  serie?: boolean;
  onEncender: (valor: boolean) => void;
  onElegirAcceso: (acceso: AccesoDeLaSala) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={[estilos.interruptor, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.titulo, { color: c.textStrong }]}>{ETIQUETA_CREAR_ENLACE}</Text>
          <Parrafo>{AYUDA_CREAR_ENLACE}</Parrafo>
        </View>
        <Interruptor valor={encendido} onCambiar={onEncender} etiqueta={ETIQUETA_CREAR_ENLACE} />
      </View>

      {encendido && porQueNo ? <Parrafo tono="peligro">{porQueNo}</Parrafo> : null}

      {encendido ? (
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          <Text style={[estilos.titulo, { color: c.textStrong }]}>{ROTULO_ACCESO}</Text>
          {ACCESOS_DE_LA_SALA.map(opcion => {
            const elegido = acceso === opcion.clave;
            return (
              <Pressable
                key={opcion.clave}
                onPress={() => {
                  if (!elegido) tacto.seleccion();
                  onElegirAcceso(opcion.clave);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: elegido }}
                accessibilityLabel={`${opcion.nombre}. ${opcion.ayuda}`}
                style={[
                  estilos.opcion,
                  { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.goldWash : c.cardBg },
                ]}
              >
                <Icon name={elegido ? 'checkCircle' : 'dots'} size={18} color={elegido ? c.goldInk : c.chevron} />
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.titulo, { color: c.textStrong }]}>{opcion.nombre}</Text>
                  <Text style={[estilos.ayuda, { color: c.textSoft }]}>{opcion.ayuda}</Text>
                </View>
              </Pressable>
            );
          })}
          {serie ? <Parrafo>{LINEA_CADA_FECHA}</Parrafo> : null}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 64 },
  titulo: { fontFamily: fuentes.media, fontSize: 17, lineHeight: 22 },
  ayuda: { fontFamily: fuentes.regular, fontSize: 16, lineHeight: 22 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
});
