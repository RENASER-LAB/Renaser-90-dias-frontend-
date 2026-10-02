import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { getTokenSesion } from '../../../services/http/apiClient';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { avisar } from '../../admin/utils/dialogo';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { RUTA_DEL_CSV } from '../api/cajaApi';
import type { FilaDeCaja } from '../api/cajaSchemas';
import { useCajasAdmin } from '../hooks/useCajasAdmin';
import { descargarConSesion } from '../utils/archivosConSesion';
import { ESTADOS_DE_LA_LISTA, PESTANA_INICIAL, etiquetaDelEstado } from '../utils/estadosDeCaja';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * Administración → Caja Renaser (spec §7): pestañas por estado con su conteo, buscador y
 * «Descargar» (la planilla con todos los datos de envío). Tocar a alguien abre su caja.
 */
export function CajaListaScreen({
  onVolver,
  onAbrirCaja,
  onEditarContenido,
}: {
  onVolver: () => void;
  onAbrirCaja: (aprendizId: string) => void;
  onEditarContenido: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [estado, setEstado] = useState<string>(PESTANA_INICIAL);
  const [busqueda, setBusqueda] = useState('');
  const [descargando, setDescargando] = useState(false);
  const lista = useCajasAdmin(estado, busqueda);
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const descargar = async () => {
    setDescargando(true);
    const resultado = await descargarConSesion(
      { ruta: RUTA_DEL_CSV, nombre: 'caja-renaser.csv', tipo: 'text/csv', titulo: 'Caja Renaser' },
      getTokenSesion(),
    );
    setDescargando(false);
    if (!resultado.ok) avisar('No se pudo descargar', resultado.mensaje);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Caja Renaser"
        onVolver={onVolver}
        accion={{ etiqueta: descargando ? '…' : 'Descargar', onPress: () => void descargar() }}
      />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 14,
        }}
      >
        <View style={estilos.pestanas} accessibilityRole="tablist">
          {ESTADOS_DE_LA_LISTA.map(e => {
            const activa = e === estado;
            const conteo = lista.conteos?.[e];
            return (
              <Pressable
                key={e}
                onPress={() => setEstado(e)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                accessibilityLabel={`${etiquetaDelEstado(e)}${conteo !== undefined ? `: ${conteo}` : ''}`}
                style={[
                  estilos.pestana,
                  { borderColor: activa ? c.gold : c.border, backgroundColor: activa ? c.gold : c.cardBg },
                ]}
              >
                <Text style={[estilos.textoPestana, { color: activa ? c.onGold : c.textStrong }]}>
                  {etiquetaDelEstado(e)}
                  {conteo !== undefined ? ` · ${conteo}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre"
          placeholderTextColor={c.micro}
          autoCorrect={false}
          accessibilityLabel="Buscar por nombre"
          style={[t.body, estilos.buscador, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
        />

        {lista.fallo ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
              {lista.fallo === 'sin_permiso'
                ? 'Solo Administración puede ver la Caja Renaser.'
                : lista.fallo === 'sin_red'
                  ? 'Sin conexión con el servidor.'
                  : 'No se pudo cargar la lista.'}
            </Text>
            {lista.fallo !== 'sin_permiso' ? <BotonSecundario etiqueta="Reintentar" onPress={lista.recargar} /> : null}
          </View>
        ) : null}

        {!lista.fallo && !lista.cargando && lista.filas.length === 0 ? <Text style={cuerpo}>Nadie acá.</Text> : null}
        {lista.cargando && lista.filas.length === 0 ? <Text style={cuerpo}>Cargando…</Text> : null}

        {lista.filas.length > 0 ? (
          <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {lista.filas.map((fila, i) => (
              <FilaDeLaLista key={fila.aprendizId} fila={fila} primera={i === 0} onPress={() => onAbrirCaja(fila.aprendizId)} />
            ))}
          </View>
        ) : null}

        {lista.hayMas ? (
          <BotonSecundario etiqueta="Ver más" onPress={lista.cargarMas} cargando={lista.cargando} />
        ) : null}

        <BotonSecundario etiqueta="Contenido y carta" icono="stack" onPress={onEditarContenido} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaDeLaLista({ fila, primera, onPress }: { fila: FilaDeCaja; primera: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  const nombre = fila.nombre?.trim() || 'Sin nombre';
  const detalle = [
    fila.grupo?.trim() || null,
    fila.diaPrograma != null ? `Día ${fila.diaPrograma}` : null,
    fila.cumplimientoFase1 != null ? `Fase 1: ${Math.round(fila.cumplimientoFase1)} %` : null,
    fila.envio && fila.envio > 1 ? `Envío ${fila.envio}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}. ${detalle}`}
      style={({ pressed }) => [
        estilos.fila,
        { borderTopColor: c.divider, borderTopWidth: primera ? 0 : 1, backgroundColor: pressed ? c.goldWash : 'transparent' },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]} numberOfLines={2}>
          {nombre}
        </Text>
        {detalle ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{detalle}</Text> : null}
      </View>
      <Icon name="chevron" size={16} color={c.chevron} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pestanas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pestana: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  textoPestana: { fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22 },
  buscador: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 17 },
  lista: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12 },
});
