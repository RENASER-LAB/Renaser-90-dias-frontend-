import React from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { fuentes } from '../../../theme/fuentes';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ListaDeFilas } from '../../paneles-de-rol/components/FilaDeLista';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { FilaDePersonaEnHabito } from '../components/FilaDePersonaEnHabito';
import { BarraDelLider } from '../components/MarcoDelLider';
import { usePersonasDeUnHabito } from '../hooks/usePersonasDeUnHabito';
import type { FiltrosDeLosHabitos, HabitoDeTodos, PersonaEnUnHabito } from '../types/habitosDeTodos.types';
import {
  dimensionDelHabito,
  lineaDelHabito,
  nombreDelHabito,
  seccionesDeLasPersonas,
  tituloDelDia,
  type SeccionDePersonas,
} from '../utils/habitosDeTodos';

interface SeccionParaLaLista extends SeccionDePersonas {
  data: PersonaEnUnHabito[];
}

/**
 * Las personas de UN hábito en un día (spec 029): quién lo cumplió y quién no, en secciones («Sin cumplir» / «Pendientes», «Cumplieron» y,
 * plegada, «No les tocaba o en pausa»), con un buscador por nombre que le pregunta al servidor 300 ms después de la última tecla y la
 * lista de a 30 (la página siguiente al acercarse al final, sin repetir a nadie). Tocar una fila abre la ficha de esa persona en el mismo día.
 *
 * - **El orden es el del servidor** (los que más hay que atender primero); la app solo reparte por estado.
 * - **Un único scroll**: la lista. Plegar o desplegar la sección de «sin nada que medir» es instantáneo (sin animación).
 * - **Lo que se ve no cambia de día** mientras la pantalla vive: el día y los filtros llegan fijos de quien la abrió.
 * - **El atrás** (sistema y flecha) sube a la lista de hábitos. Mientras la ficha de una persona está abierta (`activa` = falso) esta pantalla
 *   sigue montada, oculta, y conserva la búsqueda y el lugar; el retroceso es el de la ficha.
 */
export function PersonasDeUnHabitoScreen({
  habito,
  filtros,
  esHoy,
  masReciente,
  activa,
  onVolver,
  onAbrirPersona,
}: {
  habito: HabitoDeTodos;
  /** Con el día ya concreto (`fecha` nunca `null`). */
  filtros: FiltrosDeLosHabitos;
  esHoy: boolean;
  masReciente: string | null;
  /** Es la pantalla a la vista (no la oculta detrás de la ficha de una persona). */
  activa: boolean;
  onVolver: () => void;
  onAbrirPersona: (persona: PersonaEnUnHabito) => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const lista = usePersonasDeUnHabito(habito.habitoId, filtros);
  const [sinDatosAbierta, setSinDatosAbierta] = React.useState(false);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  }, activa);

  const nombre = nombreDelHabito(habito);
  const secciones = React.useMemo<SeccionParaLaLista[]>(
    () =>
      seccionesDeLasPersonas(lista.personas).map(s => ({
        ...s,
        data: s.plegadaAlAbrir && !sinDatosAbierta ? [] : s.personas,
      })),
    [lista.personas, sinDatosAbierta],
  );

  const dimension = dimensionDelHabito(habito);
  const cabecera = (
    <View style={{ gap: 10, paddingBottom: 6 }}>
      <View style={{ gap: 2 }}>
        <Text style={[t.cardTitle, { color: c.textStrong }]}>
          {filtros.fecha ? tituloDelDia(filtros.fecha, masReciente, esHoy) : 'Hoy'}
        </Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
          {[dimension, lineaDelHabito(habito, esHoy)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={[estilos.buscador, { backgroundColor: c.cardBg, borderColor: c.border }]}>
        <Icon name="search" size={TAMANO_ICONO.normal} color={c.textSoft} />
        <TextInput
          value={lista.texto}
          onChangeText={lista.setTexto}
          placeholder="Buscar por nombre"
          placeholderTextColor={c.micro}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Buscar un alumno por nombre"
          style={[t.body, estilos.campo, { color: c.text }]}
        />
        {lista.texto.length > 0 ? (
          <Pressable
            onPress={() => lista.setTexto('')}
            accessibilityRole="button"
            accessibilityLabel="Borrar la búsqueda"
            style={estilos.borrar}
          >
            <Icon name="close" size={TAMANO_ICONO.chico} color={c.textSoft} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <BarraDelLider titulo={nombre} onVolver={onVolver} />
      <SectionList<PersonaEnUnHabito, SeccionParaLaLista>
        {...barraAlDesplazar}
        sections={secciones}
        keyExtractor={persona => persona.personaId}
        stickySectionHeadersEnabled={false}
        /* Una página entera (30 personas más los títulos de sección) se dibuja de una vez: abrir «No les tocaba o en pausa» no espera a otra medida. */
        initialNumToRender={40}
        renderItem={({ item }) => (
          <View style={estilos.fila}>
            <ListaDeFilas>
              <FilaDePersonaEnHabito persona={item} tituloDelHabito={nombre} primera onAbrir={() => onAbrirPersona(item)} />
            </ListaDeFilas>
          </View>
        )}
        renderSectionHeader={({ section }) => {
          const plegable = section.plegadaAlAbrir;
          if (plegable) {
            return (
              <Presionable
                onPress={() => setSinDatosAbierta(abierta => !abierta)}
                accessibilityRole="button"
                accessibilityState={{ expanded: sinDatosAbierta }}
                accessibilityLabel={`${section.titulo}. ${sinDatosAbierta ? 'Plegar' : 'Ver'} la lista`}
                style={estilos.seccionPlegable}
              >
                <Text style={[t.body, estilos.seccionTitulo, { color: c.textSoft, flex: 1 }]}>{section.titulo}</Text>
                {/* El chevron apunta abajo plegada y arriba abierta: la forma dice el estado. */}
                <View style={{ transform: [{ rotate: sinDatosAbierta ? '270deg' : '90deg' }] }}>
                  <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
                </View>
              </Presionable>
            );
          }
          return (
            <Text accessibilityRole="header" style={[t.body, estilos.seccionTitulo, estilos.seccion, { color: c.textStrong }]}>
              {section.titulo}
            </Text>
          );
        }}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={<SinPersonas lista={lista} />}
        ListFooterComponent={<PieDeLaLista lista={lista} />}
        onEndReached={() => void lista.pedirMas()}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 8,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      />
    </SafeAreaView>
  );
}

function SinPersonas({ lista }: { lista: ReturnType<typeof usePersonasDeUnHabito> }) {
  const { c, t } = useTheme();
  if (lista.cargando) return <CargandoLectura texto="Cargando los alumnos…" />;
  if (lista.fallo) {
    return (
      <FalloDeLectura
        fallo={lista.fallo}
        detalle={lista.detalleDelFallo}
        que="los alumnos de este hábito"
        onReintentar={() => void lista.recargar()}
      />
    );
  }
  const texto = lista.buscando ? `Sin resultados para «${lista.texto.trim()}».` : 'Nadie tenía este hábito ese día.';
  return <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{texto}</Text>;
}

/** Al final: «Cargando más…» mientras llega la página siguiente, o «Reintentar» si esa página falló. */
function PieDeLaLista({ lista }: { lista: ReturnType<typeof usePersonasDeUnHabito> }) {
  const { c, t } = useTheme();
  if (lista.cargandoMas) {
    return (
      <View style={estilos.pie} accessible accessibilityLabel="Cargando más alumnos">
        <ActivityIndicator color={c.goldInk} />
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Cargando más…</Text>
      </View>
    );
  }
  if (lista.falloAlPedirMas) {
    return (
      <Pressable
        onPress={() => void lista.pedirMas()}
        accessibilityRole="button"
        accessibilityLabel="No pudimos cargar más alumnos. Reintentar"
        style={[estilos.reintentar, { borderColor: c.borderStrong }]}
      >
        <Text style={[t.body, { fontSize: 16, color: c.textStrong, fontFamily: fuentes.negrita }]}>No pudimos cargar más. Reintentar</Text>
      </Pressable>
    );
  }
  return null;
}

const estilos = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 4,
  },
  campo: { flex: 1, fontSize: 16, minHeight: 50 },
  /* 48 de lado: se toca con el pulgar sin apuntar (AGENTS.md §4). */
  borrar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  fila: { marginBottom: 10 },
  seccion: { paddingTop: 10, paddingBottom: 8 },
  seccionTitulo: { fontSize: 16, lineHeight: 22, fontFamily: fuentes.negrita },
  /* La sección plegable es un botón de 48: dice si está plegada con la forma del chevron, no solo con el color. */
  seccionPlegable: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingTop: 4 },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56 },
  reintentar: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
