import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { fuentes } from '../../../theme/fuentes';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { confirmar } from '../../admin/utils/dialogo';
import { FiltroDeFormacion } from '../../formaciones/components/FiltroDeFormacion';
import { FORMACION_POR_DEFECTO } from '../../formaciones/types/formaciones.types';
import { nombreCortoDeFormacion } from '../../formaciones/utils/nombreDeFormacion';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import { asignarFicha } from '../api/diagnosticoAdminApi';
import { BotonDeAccion, Tarjeta, TextoDeError } from '../components/piezas';
import { useAprendicesParaAsignar } from '../hooks/useAprendicesParaAsignar';
import type { ResultadoDeAsignar } from '../types/diagnosticoAdmin.types';
import { textoDelLote } from '../utils/resumenDeLaFicha';
import {
  alternarPersona,
  alternarTodas,
  cuantas,
  idsDe,
  nombreDe,
  textoDeConfirmarElLote,
  textoDeLaSeleccion,
  todasMarcadas,
  type SeleccionDePersonas,
} from '../utils/seleccionDePersonas';
import { mensajeDeGuardar } from '../utils/textos';

/**
 * Asignar el diagnóstico a varias personas que ya existen (spec 026-9; Fichas → «Asignar a varias personas»). Se busca igual que en
 * «Personas» (al servidor, con el filtro de formación), se marcan las que van —lo marcado se conserva al cambiar la búsqueda— y una
 * sola confirmación las cambia a todas. El servidor deja afuera a las que no se pueden cambiar y dice por qué: «12 asignadas · 2 omitidas».
 *
 * La barra de la selección va arriba y fija (no abajo, donde flota el botón de SER). El atrás sube un nivel: de aquí a la lista de fichas.
 */
export function AsignarDiagnosticoVariasScreen({ onVolver }: { onVolver: () => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const lista = useAprendicesParaAsignar();
  const [seleccion, setSeleccion] = useState<SeleccionDePersonas>({});
  const [asignando, setAsignando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoDeAsignar | null>(null);

  const atras = useCallback(() => {
    onVolver();
    return true;
  }, [onVolver]);
  useSystemBackHandler(atras);

  const n = cuantas(seleccion);

  const asignar = async () => {
    if (n === 0 || asignando) return;
    const texto = textoDeConfirmarElLote(n);
    if (!(await confirmar(texto.titulo, texto.mensaje, { ok: 'Asignar' }))) return;
    setAsignando(true);
    setError(null);
    try {
      const r = await asignarFicha(idsDe(seleccion), 'CON_DIAGNOSTICO');
      setResultado(r);
      setSeleccion({});
      if (r.asignadas > 0) tacto.logro();
      else tacto.error();
    } catch (e) {
      tacto.error();
      setError(mensajeDeGuardar(e, 'No se pudo asignar el diagnóstico. Vuelve a intentar.'));
    } finally {
      setAsignando(false);
    }
  };

  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];
  const marcadasTodas = todasMarcadas(seleccion, lista.personas);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Asignar a varias personas" subtitulo="Con el diagnóstico inicial" onVolver={onVolver} />

      <View style={{ paddingHorizontal: horizontalPadding, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
        <Tarjeta advertencia={n > 0}>
          <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media }]}>
            {textoDeLaSeleccion(n)}
          </Text>
          {n > 0 ? <BotonPrincipal etiqueta="Asignar el diagnóstico" onPress={() => void asignar()} cargando={asignando} /> : null}
          {error ? <TextoDeError texto={error} /> : null}
        </Tarjeta>
      </View>

      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 12,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 12,
        }}
      >
        {resultado ? (
          <Tarjeta>
            <Text accessibilityRole="alert" style={[t.cardTitle, { color: c.textStrong }]}>
              {textoDelLote(resultado, 'CON_DIAGNOSTICO')}
            </Text>
            {resultado.omitidas.length > 0 ? (
              <View style={{ gap: 8 }}>
                <TituloDeSeccion detalle="No se les cambió la ficha.">Omitidas</TituloDeSeccion>
                {resultado.omitidas.map(o => (
                  <View key={o.id} style={{ gap: 2 }}>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>{o.nombre}</Text>
                    <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{o.motivo}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={estilos.acciones}>
              <BotonDeAccion etiqueta="Entendido" onPress={() => setResultado(null)} />
            </View>
          </Tarjeta>
        ) : null}

        <TextInput
          value={lista.busqueda}
          onChangeText={lista.setBusqueda}
          placeholder="Buscar por nombre o correo"
          placeholderTextColor={c.micro}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar personas"
          style={[t.body, estilos.buscador, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text, fontSize: 16 }]}
        />
        <FiltroDeFormacion valor={lista.formacion} onCambiar={lista.cambiarFormacion} />

        {lista.error ? <TextoDeError texto={lista.error} /> : null}

        {lista.personas.length > 0 ? (
          <View style={estilos.acciones}>
            <BotonDeAccion
              etiqueta={marcadasTodas ? 'Quitar las marcas de esta lista' : 'Marcar las de esta lista'}
              onPress={() => setSeleccion(s => alternarTodas(s, lista.personas))}
            />
          </View>
        ) : null}

        {lista.personas.map(p => {
          const marcada = p.id in seleccion;
          const formacion = p.formation && p.formation !== FORMACION_POR_DEFECTO ? ` · ${nombreCortoDeFormacion(p.formation)}` : '';
          return (
            <Presionable
              key={p.id}
              onPress={() => {
                tacto.seleccion();
                setSeleccion(s => alternarPersona(s, p));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcada }}
              accessibilityLabel={`${nombreDe(p)}. Día ${p.programDay}${formacion}`}
              style={[estilos.fila, { backgroundColor: marcada ? c.goldWash : c.cardBg, borderColor: marcada ? c.gold : c.border }]}
            >
              <View style={[estilos.marca, { borderColor: marcada ? c.gold : c.borderStrong, backgroundColor: marcada ? c.gold : 'transparent' }]}>
                {marcada ? <Text style={[t.body, { color: c.onGold, fontSize: 16, lineHeight: 20, fontFamily: fuentes.negrita }]}>✓</Text> : null}
              </View>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]} numberOfLines={1}>
                  {nombreDe(p)}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]} numberOfLines={1}>
                  {`Día ${p.programDay}${formacion}${p.status === 'SUSPENDED' ? ' · suspendida' : ''}`}
                </Text>
              </View>
            </Presionable>
          );
        })}

        {lista.cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 12 }} /> : null}

        {!lista.cargando && lista.personas.length === 0 && !lista.error ? (
          <Text style={cuerpo}>
            {lista.busquedaAplicada.trim() ? `Nadie coincide con "${lista.busquedaAplicada.trim()}".` : 'No hay personas en este tramo.'}
          </Text>
        ) : null}

        {lista.hayMas && !lista.cargando ? (
          <BotonSecundario etiqueta={`Ver más (${lista.personas.length} de ${lista.total ?? '—'})`} onPress={lista.verMas} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  buscador: { minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, width: '100%' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  marca: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
