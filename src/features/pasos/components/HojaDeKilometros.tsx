import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { formatoKm } from '../../habits/utils/formatoKm';
import {
  kmConUnidad,
  TEXTOS_DE_PASOS,
  textoDelBotonRegistrar,
  textoDesdeCuando,
  textoDeLosPasos,
} from '../utils/textosDePasos';
import { porcentajeDeLaBarra, type AvanceDeKilometros, type VistaDeKilometros } from '../utils/vistaDeKilometros';

/**
 * La hoja de «Kilómetros diarios» cuando los pasos están conectados (spec 037, D-310; maqueta 2.4, 3.1, 3.2 y 3.3).
 *
 * - **Con los pasos**: el número grande, los pasos («aprox.» si salen de la zancada), la barra y la meta, la fuente y la hora de
 *   la última lectura, «Registrar 5,4 km» fijo abajo cuando se llegó a la meta, y «Actualizar» / «Desconectar». Con dos fuentes a la
 *   vez dice cuál se usa y cuál no se suma (Health Connect cuenta una sola vez la que la persona puso primero).
 * - **Sin permiso** (lo quitó en Health Connect): «Abrir Health Connect» y la captura de siempre.
 * - **Sin pasos hoy**: qué revisar, «Actualizar» y la captura. Si había pasos escritos a mano, dice que no cuentan.
 *
 * No registra nada por sí sola: «Registrar» llama a `onRegistrar` (quien monta comprueba el día y manda al servidor). Lo que
 * sigue a la hoja —la captura— espera a que se vaya del todo (`alTerminarDeCerrar`), como las demás hojas de Training.
 */
export function HojaDeKilometros({
  visible,
  titulo,
  subtitulo,
  vista,
  registrando,
  onRegistrar,
  onActualizar,
  onDesconectar,
  onAbrirHealthConnect,
  onSubirCaptura,
  onCerrar,
  alTerminarDeCerrar,
}: {
  visible: boolean;
  titulo: string;
  subtitulo?: string;
  vista: VistaDeKilometros;
  registrando: boolean;
  onRegistrar: () => void;
  onActualizar: () => void;
  onDesconectar: () => void;
  onAbrirHealthConnect: () => void;
  onSubirCaptura: () => void;
  onCerrar: () => void;
  alTerminarDeCerrar?: () => void;
}) {
  const { c, t } = useTheme();
  const { height } = useWindowDimensions();
  const despues = useRef<(() => void) | null>(null);
  const textos = TEXTOS_DE_PASOS;

  const irALaCaptura = () => {
    despues.current = onSubirCaptura;
    onCerrar();
  };
  const alIrse = () => {
    const pendiente = despues.current;
    despues.current = null;
    pendiente?.();
    alTerminarDeCerrar?.();
  };

  const secundario = (etiqueta: string, alTocar: () => void, icono?: 'camera') => (
    <Presionable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={[estilos.secundario, { borderColor: c.border }]}
    >
      {icono ? <Icon name={icono} size={TAMANO_ICONO.chico} color={c.goldInk} /> : null}
      <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.negrita, fontSize: 16 }]}>{etiqueta}</Text>
    </Presionable>
  );

  let pie: React.ReactNode;
  let cuerpo: React.ReactNode;

  if (vista.modo === 'sin-permiso') {
    pie = (
      <View style={{ gap: 6 }}>
        <GoldButton label={textos.abrirHealthConnect} onPress={onAbrirHealthConnect} textStyle={estilos.textoDelBoton} />
        {secundario(textos.subirCaptura, irALaCaptura, 'camera')}
      </View>
    );
    cuerpo = (
      <>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18 }]}>{textos.perdimosTusPasos}</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{textos.sinPermiso.texto}</Text>
      </>
    );
  } else if (vista.modo === 'sin-datos') {
    pie = (
      <View style={{ gap: 6 }}>
        <GoldButton label={textos.actualizar} onPress={onActualizar} textStyle={estilos.textoDelBoton} />
        {secundario(textos.subirCaptura, irALaCaptura, 'camera')}
      </View>
    );
    cuerpo = (
      <>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18 }]}>{textos.sinDatos.titulo}</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          {vista.hayManuales ? textos.sinDatos.manuales : textos.sinDatos.texto}
        </Text>
      </>
    );
  } else if (vista.modo === 'avance') {
    pie = vista.metaLista ? (
      <GoldButton
        label={textoDelBotonRegistrar(vista.km)}
        onPress={onRegistrar}
        loading={registrando}
        textStyle={estilos.textoDelBoton}
      />
    ) : undefined;
    cuerpo = <CuerpoConPasos vista={vista} onActualizar={onActualizar} onDesconectar={onDesconectar} onAbrirHealthConnect={onAbrirHealthConnect} />;
  } else {
    // 'captura', 'ofrecer' y 'cumplido' no abren esta hoja.
    return null;
  }

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      alTerminarDeCerrar={alIrse}
      titulo={titulo}
      subtitulo={subtitulo}
      tamano="contenido"
      pie={pie}
    >
      <ScrollView
        style={{ maxHeight: Math.round(height * 0.55) }}
        contentContainerStyle={estilos.cuerpo}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {cuerpo}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

function horaDeLaLectura(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

function CuerpoConPasos({
  vista,
  onActualizar,
  onDesconectar,
  onAbrirHealthConnect,
}: {
  vista: AvanceDeKilometros;
  onActualizar: () => void;
  onDesconectar: () => void;
  onAbrirHealthConnect: () => void;
}) {
  const { c, t } = useTheme();
  const textos = TEXTOS_DE_PASOS;
  const pasos = textoDeLosPasos(vista.pasos, vista.aproximado);
  const dosFuentes = vista.noSumadas.length > 0;
  return (
    <>
      <View style={{ gap: 2 }}>
        <Text style={[t.small, { color: c.textSoft }]}>{textos.hoja.hoy}</Text>
        <View style={estilos.numeroGrande} accessible accessibilityLabel={`Hoy, ${kmConUnidad(vista.km)}`}>
          <Text style={[t.hero, { color: c.textStrong, fontSize: 44, lineHeight: 50, fontVariant: ['tabular-nums'] }]}>{formatoKm(vista.km)}</Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 18 }]}>km</Text>
        </View>
        {pasos ? <Text style={[t.body, { color: c.textSoft, fontVariant: ['tabular-nums'] }]}>{pasos}</Text> : null}
      </View>

      <View style={{ gap: 6 }}>
        <View style={[estilos.pista, { backgroundColor: c.border }]}>
          <View style={[estilos.relleno, { width: `${porcentajeDeLaBarra(vista)}%`, backgroundColor: c.goldInk }]} />
        </View>
        <Text style={[t.small, { color: c.textSoft }]}>{`Meta: ${kmConUnidad(vista.meta)}`}</Text>
      </View>

      {dosFuentes ? (
        <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <Text style={[t.small, { color: c.textSoft }]}>{textos.hoja.fuentesDeHoy}</Text>
          {vista.fuentes.map(fuente => (
            <View key={fuente.paquete || fuente.etiqueta} style={estilos.filaDeFuente}>
              <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.seminegrita, flexShrink: 1 }]}>{fuente.etiqueta}</Text>
              <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.seminegrita }]}>{textos.hoja.laUsamos}</Text>
            </View>
          ))}
          {vista.noSumadas.map(fuente => (
            <View key={fuente.paquete || fuente.etiqueta} style={estilos.filaDeFuente}>
              <Text style={[t.body, { color: c.textSoft, flexShrink: 1 }]}>{fuente.etiqueta}</Text>
              <Text style={[t.small, { color: c.textSoft }]}>{textos.hoja.noSeSuma}</Text>
            </View>
          ))}
          <Text style={[t.small, { color: c.textSoft }]}>{textos.hoja.unaSolaVez}</Text>
          <Presionable onPress={onAbrirHealthConnect} accessibilityRole="button" accessibilityLabel={textos.cambiarPrioridad} style={estilos.enlace}>
            <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.seminegrita }]}>{textos.cambiarPrioridad}</Text>
          </Presionable>
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <Linea etiqueta={textos.hoja.fuente} valor={vista.fuente.etiqueta} />
          <Linea etiqueta={textos.hoja.ultimaLectura} valor={horaDeLaLectura(vista.leidoEn)} />
        </View>
      )}
      {vista.conectadoHoyA ? <Text style={[t.small, { color: c.textSoft }]}>{textoDesdeCuando(vista.conectadoHoyA)}</Text> : null}

      <View style={estilos.acciones}>
        <Presionable onPress={onActualizar} accessibilityRole="button" accessibilityLabel={textos.actualizar} style={estilos.enlace}>
          <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.seminegrita }]}>{textos.actualizar}</Text>
        </Presionable>
        <Presionable onPress={onDesconectar} accessibilityRole="button" accessibilityLabel={textos.desconectar} style={estilos.enlace}>
          <Text style={[t.body, { color: c.textSoft, fontFamily: fuentes.seminegrita }]}>{textos.desconectar}</Text>
        </Presionable>
      </View>
    </>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.filaDeFuente}>
      <Text style={[t.body, { color: c.textSoft }]}>{etiqueta}</Text>
      <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.seminegrita, fontVariant: ['tabular-nums'] }]}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },
  numeroGrande: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  pista: { height: 8, borderRadius: 4, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  filaDeFuente: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 28 },
  acciones: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  enlace: { minHeight: 48, justifyContent: 'center' },
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
});
