import { fuentes } from '../../../theme/fuentes';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import type { FuncionalidadConsola, ParteDelCircuito } from '../api/soporteTiSchemas';
import type { EstadoDeLaConsola } from '../hooks/useConsolaSoporteTi';
import {
  agruparPorArea,
  cuantasApagadas,
  estaApagada,
  estadoEnLaConsola,
  nombreDe,
  nombreDeLaParte,
  textoDelCircuito,
  textoDelEstado,
  type FiltroDeLaConsola,
} from '../utils/consola';
import { textoDeDespliegueEnLaLista } from '../utils/despliegue';

const FILTROS: readonly { valor: FiltroDeLaConsola; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'apagadas', etiqueta: 'Apagadas' },
  { valor: 'criticas', etiqueta: 'Críticas' },
  /* Fase 2: lo que está llegando de a poco (despliegue progresivo). */
  { valor: 'despliegue', etiqueta: 'Despliegue' },
];

/**
 * La consola Soporte TI (spec 002, US3): todas las funcionalidades de todos los roles, una por una, agrupadas por área,
 * con su estado (prendida, apagada para todos, apagada para algunos roles), si es crítica, y el circuito automático de
 * la IA arriba. Buscador sin tildes y filtro. El filtro se toca seguido: cambia al instante, sin animación; las filas
 * solo responden al apretar (`Presionable`).
 */
export function FuncionalidadesConsolaScreen({
  estado,
  onAbrir,
  onAuditoria,
  onRoles,
  onVerComo,
  onSalir,
}: {
  estado: EstadoDeLaConsola;
  onAbrir: (clave: string) => void;
  onAuditoria: () => void;
  /** Fase 2: los roles personalizados. */
  onRoles?: () => void;
  /** Fase 2: ver la app como otro rol, en solo lectura. */
  onVerComo?: () => void;
  onSalir: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { funcionalidades, circuito, cargando, fallo, recargar } = estado;
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroDeLaConsola>('todas');

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const grupos = useMemo(() => agruparPorArea(funcionalidades ?? [], busqueda, filtro), [funcionalidades, busqueda, filtro]);
  const apagadas = useMemo(
    () => (funcionalidades ?? []).filter(f => estaApagada(estadoEnLaConsola(f, funcionalidades ?? []))).length,
    [funcionalidades],
  );
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Soporte TI"
        subtitulo={funcionalidades ? cuantasApagadas(apagadas) : 'Interruptores de la app'}
        onVolver={onSalir}
        accion={{ etiqueta: 'Auditoría', onPress: onAuditoria }}
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={cargando && funcionalidades !== null} onRefresh={() => void recargar()} tintColor={c.goldInk} colors={[c.goldInk]} />}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 14,
        }}
      >
        {onRoles || onVerComo ? (
          <View style={{ gap: 8 }}>
            {onRoles ? <FilaDeHerramienta titulo="Roles" detalle="Roles que heredan de uno base, con sus funcionalidades" onPress={onRoles} /> : null}
            {onVerComo ? <FilaDeHerramienta titulo="Ver como" detalle="La app como la ve otro rol, sin cambiar nada" onPress={onVerComo} /> : null}
          </View>
        ) : null}

        {circuito && circuito.length > 0 ? <TarjetaDelCircuito partes={circuito} /> : null}

        <View style={[estilos.buscador, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
          <Icon name="search" size={TAMANO_ICONO.normal} color={c.textSoft} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre o clave"
            placeholderTextColor={c.textSoft}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar una funcionalidad"
            testID="buscador-consola"
            style={[t.body, estilos.campo, { color: c.text }]}
          />
        </View>
        <ControlSegmentado rol="radio" accessibilityLabel="Qué funcionalidades ver" opciones={FILTROS} valor={filtro} onCambiar={setFiltro} achicarTexto />

        {cargando && !funcionalidades ? <Text style={cuerpo}>Cargando las funcionalidades…</Text> : null}
        {!cargando && fallo && !funcionalidades ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {fallo}
            </Text>
            <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />
          </View>
        ) : null}

        {funcionalidades && grupos.length === 0 ? (
          <Text style={cuerpo}>
            {busqueda.trim()
              ? `Ninguna funcionalidad coincide con «${busqueda.trim()}».`
              : filtro === 'apagadas'
                ? 'No hay nada apagado.'
                : filtro === 'despliegue'
                  ? 'Nada está en despliegue.'
                  : 'No hay funcionalidades.'}
          </Text>
        ) : null}

        {grupos.map(grupo => (
          <View key={grupo.area} style={{ gap: 8, marginTop: 4 }}>
            <TituloDeSeccion>{grupo.area}</TituloDeSeccion>
            {grupo.funcionalidades.map(f => (
              <FilaDeFuncionalidad key={f.clave} funcionalidad={f} todas={funcionalidades ?? []} onPress={() => onAbrir(f.clave)} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaDeFuncionalidad({
  funcionalidad,
  todas,
  onPress,
}: {
  funcionalidad: FuncionalidadConsola;
  todas: readonly FuncionalidadConsola[];
  onPress: () => void;
}) {
  const { c, t } = useTheme();
  const estado = estadoEnLaConsola(funcionalidad, todas);
  const apagada = estaApagada(estado);
  const texto = textoDelEstado(estado);
  const enDespliegue = textoDeDespliegueEnLaLista(funcionalidad);
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nombreDe(funcionalidad)}. ${texto}${funcionalidad.critica ? '. Crítica' : ''}${enDespliegue ? `. ${enDespliegue}` : ''}`}
      style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: apagada ? c.danger : c.border }]}
    >
      <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
        <View style={estilos.titulo}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media, flexShrink: 1 }]}>
            {nombreDe(funcionalidad)}
          </Text>
          {funcionalidad.critica ? <Insignia texto="Crítica" /> : null}
        </View>
        <Text style={[t.body, { color: apagada ? c.danger : c.textSoft, fontSize: 16, lineHeight: 22 }]}>{texto}</Text>
        {enDespliegue ? <Text style={[t.body, { color: c.goldInk, fontSize: 16, lineHeight: 22 }]}>{enDespliegue}</Text> : null}
        <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>{funcionalidad.clave}</Text>
      </View>
      <Icon name="chevron" size={16} color={c.chevron} />
    </Presionable>
  );
}

/** Una entrada de la consola que no es una funcionalidad (fase 2: «Roles», «Ver como»). Se hunde al apretar. */
function FilaDeHerramienta({ titulo, detalle, onPress }: { titulo: string; detalle: string; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${detalle}`}
      style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
    >
      <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>{titulo}</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{detalle}</Text>
      </View>
      <Icon name="chevron" size={16} color={c.chevron} />
    </Presionable>
  );
}

export function Insignia({ texto }: { texto: string }) {
  const { c } = useTheme();
  return (
    <View style={[estilos.insignia, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
      <Text style={{ color: c.goldInk, fontFamily: fuentes.negrita, fontSize: 11.5 }}>{texto}</Text>
    </View>
  );
}

/** El circuito automático de la IA (spec 002, US2): si SER se apagó sola por fallas del proveedor y cuándo prueba. */
function TarjetaDelCircuito({ partes }: { partes: readonly ParteDelCircuito[] }) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <Text accessibilityRole="header" style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>
        SER · apagado automático
      </Text>
      {partes.map(p => {
        const { titulo, detalle, apagada } = textoDelCircuito(p);
        return (
          <View key={p.parte} style={{ gap: 2 }} accessible accessibilityLabel={`${nombreDeLaParte(p.parte)}: ${titulo}${detalle ? `, ${detalle}` : ''}`}>
            <Text style={[t.body, { color: apagada ? c.danger : c.text, fontSize: 16 }]}>
              {nombreDeLaParte(p.parte)}: {titulo}
            </Text>
            {detalle ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{detalle}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 48 },
  campo: { flex: 1, fontSize: 16, paddingVertical: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 56 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  insignia: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
});
