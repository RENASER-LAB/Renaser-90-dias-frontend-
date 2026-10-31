import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';
import { avisoDeHoraPasada } from '../utils/tarjetaDelHabito';
import {
  accionDeLaHoja,
  accionSecundariaDeLaHoja,
  lineaDelCumplido,
  metaDeLaHoja,
  type AccionDeLaHoja,
  type ModoDeLaFila,
} from '../utils/filaDelDia';
import type { ItemDelDia } from '../utils/itemsDelDia';

/**
 * LA hoja de un hábito o una acción (spec 014, «un toque, una hoja»): su nombre, hora y puntos; la guía plegada
 * —solo si el equipo cargó una para ese hábito— y, fijo abajo, el botón del registro de su tipo.
 *
 * El botón hace lo mismo que el de la derecha de la tarjeta de antes: no es un registro nuevo. Quien la monta
 * (`TrainingScreen`) cierra la hoja y abre el registro de siempre —la cámara con «¿Qué sentiste?», la Pastilla, la
 * Clase, el Muro, la hoja de evidencia o la marca de Despertar y Dormir—. Leer la guía no marca nada.
 *
 * Lo ya cumplido muestra lo que registró el servidor («Cumplido a las 06:12 · +8 pts» y lo que escribió), sin botón.
 * Es solo de HOY: en un día anterior no se abre ninguna hoja.
 *
 * Es la `HojaDesdeAbajo` de la app: se cierra arrastrándola, tocando fuera, con la ✕ y con el atrás del sistema.
 */
export function HojaDelHabito({
  visible,
  item,
  modo,
  ahoraMs,
  onCerrar,
  alTerminarDeCerrar,
  onAccion,
}: {
  visible: boolean;
  item: ItemDelDia | null;
  modo: ModoDeLaFila;
  ahoraMs: number;
  onCerrar: () => void;
  /** La hoja ya se fue del todo: ahí se abre el registro, nunca con ella todavía encima. */
  alTerminarDeCerrar?: () => void;
  onAccion: (item: ItemDelDia, accion: AccionDeLaHoja) => void;
}) {
  const { c, t } = useTheme();
  const { height } = useWindowDimensions();
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const clave = item?.clave ?? null;
  // Plegada cada vez que la hoja se abre: la hoja queda montada con el último hábito mientras está cerrada, así que volver
  // a abrir el MISMO hábito (misma `clave`) la encontraba desplegada de la vez anterior.
  useEffect(() => {
    if (visible) setGuiaAbierta(false);
  }, [clave, visible]);

  if (!item) return null;

  const pendiente = (modo === 'hoy' || modo === 'atrasado') && !item.hecho;
  const accion = pendiente ? accionDeLaHoja(item) : null;
  // Solo en los hábitos de evidencia opcional: «Marcar como hecho» cierra sin evidencia, como el ✓ de la fila.
  const secundaria = pendiente ? accionSecundariaDeLaHoja(item) : null;
  const avisoDeLaHora = modo === 'atrasado' && item.habit ? avisoDeHoraPasada(item.habit, ahoraMs) : null;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      alTerminarDeCerrar={alTerminarDeCerrar}
      titulo={item.titulo}
      tamano="contenido"
      pie={
        accion ? (
          <View style={{ gap: 6 }}>
            <GoldButton
              label={accion.etiqueta}
              icon={accion.icono}
              iconPosition="left"
              onPress={() => onAccion(item, accion)}
              textStyle={estilos.textoDelBoton}
            />
            {accion.nota ? <Text style={[t.small, { color: c.textSoft }]}>{accion.nota}</Text> : null}
            {secundaria ? (
              <Presionable
                onPress={() => onAccion(item, secundaria)}
                accessibilityRole="button"
                accessibilityLabel={secundaria.etiqueta}
                style={[estilos.secundario, { borderColor: c.border }]}
              >
                <Icon name={secundaria.icono} size={TAMANO_ICONO.chico} color={c.goldInk} />
                <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.negrita, fontSize: 16 }]}>{secundaria.etiqueta}</Text>
              </Presionable>
            ) : null}
          </View>
        ) : undefined
      }
    >
      <ScrollView
        style={{ maxHeight: Math.round(height * 0.5) }}
        contentContainerStyle={estilos.cuerpo}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {modo === 'atrasado' && !item.hecho ? (
          <Text style={[t.body, { color: c.textSoft }]}>
            <Text style={{ color: c.textStrong, fontFamily: fuentes.negrita }}>Se te pasó la hora: </Text>
            {(avisoDeLaHora ?? 'Todavía puedes cumplir tu compromiso hoy').replace(/^T/, 't')}.
          </Text>
        ) : null}

        {item.hecho && item.cumplido ? (
          <View style={{ gap: 6 }}>
            <View style={estilos.lineaDelEstado}>
              <Icon name="checkCircle" size={TAMANO_ICONO.chico} color={c.success} />
              <Text style={[t.small, { color: c.success, fontFamily: fuentes.media, flexShrink: 1 }]}>
                {lineaDelCumplido(item.cumplido)}
              </Text>
            </View>
            {item.cumplido.escrito ? <Text style={[t.body, { color: c.text }]}>«{item.cumplido.escrito}»</Text> : null}
          </View>
        ) : null}

        {item.guia ? (
          <View style={[estilos.guia, { borderTopColor: c.divider }]}>
            <Presionable
              onPress={() => setGuiaAbierta(abierta => !abierta)}
              accessibilityRole="button"
              accessibilityState={{ expanded: guiaAbierta }}
              accessibilityLabel="Guía de esta práctica"
              style={estilos.cabeceraDeLaGuia}
            >
              <Text style={[t.cardTitle, { color: c.textStrong, fontFamily: fuentes.negrita, fontSize: 16 }]}>
                Guía de esta práctica
              </Text>
              <View style={{ transform: [{ rotate: guiaAbierta ? '90deg' : '0deg' }] }}>
                <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
              </View>
            </Presionable>
            {guiaAbierta ? (
              <View style={{ gap: 12, paddingBottom: 4 }}>
                {item.guia.secciones.map(seccion => (
                  <View key={seccion.titulo} style={{ gap: 4 }}>
                    <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita }]}>{seccion.titulo}</Text>
                    <Text style={[t.body, { color: c.text, lineHeight: 22 }]}>{seccion.texto}</Text>
                  </View>
                ))}
                <Text style={[t.small, { color: c.textSoft }]}>Leer la guía no marca el hábito.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Pedido del dueño (2026-10-29): la dimensión, la hora y los puntos van abajo, no en la fila ni arriba. */}
        <Text style={[t.small, { color: c.textSoft }]}>{metaDeLaHoja(item, modo)}</Text>
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  textoDelBoton: { fontSize: 16, letterSpacing: 0 },
  secundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 26,
  },
  lineaDelEstado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guia: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 2, gap: 8 },
  cabeceraDeLaGuia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
});
