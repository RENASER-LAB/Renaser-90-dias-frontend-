import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { BotonSecundario } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';
import { horaLocalDelRegistro } from '../../mentor/utils/agruparRegistrosRadar';
import { ENERGIA_MAXIMA, PREGUNTAS_RADAR } from '../config/configRadar';
import type { RegistroRadarApi } from '../types/radar.types';
import { registroDeEstaHora, type MitadDelRadar } from '../utils/mitadDelRadar';

/**
 * «Ya lo registraste» (spec 016): lo que la persona respondió en la hora en curso y cuándo es el siguiente. Se abre al tocar
 * la mitad del Radar de Hoy cuando esta hora ya está registrada, los días 1 a 7 y desde el día 8.
 *
 * Es solo para leer: una hora se registra una sola vez y no se cambia (el servidor lo rechaza con un 409), así que no hay
 * nada que editar. Las respuestas vienen de `GET /radar/history`, el mismo historial de Yo → Mi Radar; mientras llegan se
 * dice, y si no llegan se ofrece volver a intentar. Lo que escribió es suyo: se muestra sin adornos.
 *
 * Es la `HojaDesdeAbajo` de la app: se cierra arrastrándola, tocando fuera, con la ✕ y con el atrás del sistema.
 */
export function HojaDelRegistroDeEstaHora({
  visible,
  mitad,
  ahora,
  registros,
  leyendo,
  fallo,
  onReintentar,
  onCerrar,
  alTerminarDeCerrar,
}: {
  visible: boolean;
  mitad: MitadDelRadar | null;
  ahora: Date;
  registros: readonly RegistroRadarApi[];
  leyendo: boolean;
  fallo: boolean;
  onReintentar: () => void;
  onCerrar: () => void;
  alTerminarDeCerrar?: () => void;
}) {
  const { c, t } = useTheme();
  const { height } = useWindowDimensions();
  if (!mitad) return null;

  const registro = registroDeEstaHora(registros, ahora);
  const hora = registro ? horaLocalDelRegistro(registro.createdAt) : null;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      alTerminarDeCerrar={alTerminarDeCerrar}
      titulo="Ya lo registraste"
      subtitulo={`${mitad.nombre}${mitad.hora ? ` · ${mitad.hora}` : ''}`}
      tamano="contenido"
      pie={<BotonSecundario etiqueta="Entendido" onPress={onCerrar} />}
    >
      <ScrollView
        style={{ maxHeight: Math.round(height * 0.55) }}
        contentContainerStyle={estilos.cuerpo}
        showsVerticalScrollIndicator
      >
        {registro ? (
          <>
            <View style={estilos.fila}>
              <Icon name="checkCircle" size={TAMANO_ICONO.normal} color={c.success} />
              <Text style={[t.body, estilos.texto, { color: c.text, flex: 1 }]}>
                Registrado{hora ? ` a las ${hora}` : ''} · energía {registro.energyLevel} de {ENERGIA_MAXIMA}
              </Text>
            </View>
            {PREGUNTAS_RADAR.map(pregunta => (
              <View key={pregunta.campo} style={{ gap: 2 }}>
                <Text style={[t.small, estilos.texto, { color: c.textSoft, fontFamily: fuentes.negrita }]}>{pregunta.titulo}</Text>
                <Text style={[t.body, estilos.texto, { color: c.text }]}>{registro[pregunta.campo]?.trim() || '—'}</Text>
              </View>
            ))}
          </>
        ) : leyendo ? (
          <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>Cargando tus respuestas…</Text>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>
              {fallo ? 'No pudimos cargar tus respuestas.' : 'No encontramos tus respuestas de esta hora.'}
            </Text>
            <BotonSecundario etiqueta="Reintentar" onPress={onReintentar} />
          </View>
        )}
        <Text style={[t.small, estilos.texto, { color: c.textSoft }]}>
          Una vez por hora: ya no se puede cambiar.{mitad.siguiente ? ` ${mitad.siguiente}` : ''}
        </Text>
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  /* Un padding mínimo en todo texto: el reciclado de vistas de Android con Fabric arrastra el de otro (E-419, `Legible`). */
  texto: { paddingHorizontal: 1 },
});
