import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { FilaDeLista, ListaDeFilas } from '../../hoy-por-papel/components/FilaDeLista';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { AvatarDeLaLista } from '../components/AvatarDeLaLista';
import { BarraDelLider } from '../components/MarcoDelLider';
import { useAprendicesDelLider } from '../hooks/useAprendicesDelLider';
import type { AprendizDeLaLista } from '../types/aprendicesDelLider.types';
import {
  dichoDelAprendiz,
  grupoEnPalabras,
  lineaDelAprendiz,
  textoSinFilas,
  urlDeLaFoto,
} from '../utils/aprendicesDelLider';
import { PersonaDelLiderScreen } from './PersonaDelLiderScreen';

/** Lo que dice la ficha si el servidor no abre a la persona (404): ya no se muestra, o el servidor es anterior a la ruta. */
export const AVISO_SI_NO_SE_ABRE = 'Esta persona ya no está disponible para ver.';

/**
 * «Todos los aprendices» (2026-10-31, pedido del dueño: «el líder de mentores puede ver la ficha de todos los aprendices
 * sin necesidad de estar en grupo, solo para este rol»). Estado de Hoy, como las otras pantallas del líder: sin pestaña
 * nueva. Se abre desde Hoy → «Mis mentores» → «Todos los aprendices» (la fila solo existe si el servidor ofrece la lista).
 *
 * - **El buscador** pide al servidor (`GET /leadership/people?q=`, sin tildes) 300 ms después de la última tecla, y la
 *   lista se lee de a 30: la página siguiente se pide al acercarse al final.
 * - **Cada fila** lleva la foto o las iniciales, el nombre y una línea con su grupo o «Sin grupo» y su día del programa.
 * - **Tocar a una persona abre su ficha de siempre** (`PersonaDelLiderScreen`, con sus días, evidencias, Radar, tiempo
 *   libre y cierres) leyendo por `/leadership/people/{p}/…`, con grupo o sin él.
 * - **El atrás del sistema y la flecha** suben un nivel: persona → lista → Hoy. La lista sigue montada (oculta) mientras se
 *   mira a una persona, así que al volver conserva lo buscado, lo leído y la posición, sin releerse.
 * - Un único scroll: la lista. Sin animaciones propias; las filas responden al dedo con `Presionable`.
 */
export function AprendicesDelLiderScreen({ onSalir }: { onSalir: () => void }) {
  const lista = useAprendicesDelLider();
  const [persona, setPersona] = React.useState<AprendizDeLaLista | null>(null);

  /* La lista sube a Hoy; mientras hay una persona abierta, el retroceso es el de su ficha. */
  useSystemBackHandler(() => {
    onSalir();
    return true;
  }, persona === null);

  return (
    <>
      <View style={persona ? estilos.oculta : estilos.visible}>
        <ListaDeAprendices lista={lista} onVolver={onSalir} onAbrir={setPersona} />
      </View>
      {persona ? (
        /* `key`: otra persona es otra ficha, desde cero. */
        <PersonaDelLiderScreen
          key={persona.personaId}
          grupoId={persona.grupoId}
          grupoNombre={grupoEnPalabras(persona)}
          personaId={persona.personaId}
          nombre={persona.nombre}
          avatarUrl={urlDeLaFoto(persona.fotoPath)}
          desdeTodos
          avisoSiNoSeAbre={AVISO_SI_NO_SE_ABRE}
          onVolver={() => setPersona(null)}
        />
      ) : null}
    </>
  );
}

function ListaDeAprendices({
  lista,
  onVolver,
  onAbrir,
}: {
  lista: ReturnType<typeof useAprendicesDelLider>;
  onVolver: () => void;
  onAbrir: (fila: AprendizDeLaLista) => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const barraAlDesplazar = useOcultarBarraAlDesplazar();

  const buscador = (
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
        accessibilityLabel="Buscar un aprendiz por nombre"
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
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <BarraDelLider titulo="Todos los aprendices" onVolver={onVolver} />
      <FlatList
        {...barraAlDesplazar}
        data={lista.filas}
        keyExtractor={fila => fila.personaId}
        renderItem={({ item }) => <FilaDelAprendiz fila={item} onAbrir={onAbrir} />}
        ListHeaderComponent={buscador}
        ListEmptyComponent={<SinFilas lista={lista} />}
        ListFooterComponent={<PieDeLaLista lista={lista} />}
        onEndReached={() => void lista.pedirMas()}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          gap: 10,
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

function FilaDelAprendiz({ fila, onAbrir }: { fila: AprendizDeLaLista; onAbrir: (fila: AprendizDeLaLista) => void }) {
  return (
    <ListaDeFilas>
      <FilaDeLista
        primera
        izquierda={<AvatarDeLaLista fila={fila} size={44} />}
        titulo={fila.nombre}
        subtitulo={lineaDelAprendiz(fila)}
        onPress={() => onAbrir(fila)}
        etiquetaAccesible={dichoDelAprendiz(fila)}
      />
    </ListaDeFilas>
  );
}

/** Lo que va cuando no hay filas: cargando, un fallo con «Reintentar», o que no hay nadie (o nadie con ese nombre). */
function SinFilas({ lista }: { lista: ReturnType<typeof useAprendicesDelLider> }) {
  const { c, t } = useTheme();
  if (lista.cargando) return <CargandoLectura texto="Cargando los aprendices…" />;
  if (lista.fallo) {
    return (
      <FalloDeLectura
        fallo={lista.fallo}
        detalle={lista.detalleDelFallo}
        que="la lista de aprendices"
        onReintentar={() => void lista.recargar()}
      />
    );
  }
  return (
    <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{textoSinFilas(lista.texto)}</Text>
  );
}

/** Al final: «Cargando más…» mientras llega la página siguiente, o «Reintentar» si esa página falló. */
function PieDeLaLista({ lista }: { lista: ReturnType<typeof useAprendicesDelLider> }) {
  const { c, t } = useTheme();
  if (lista.cargandoMas) {
    return (
      <View style={estilos.pie} accessible accessibilityLabel="Cargando más aprendices">
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
        accessibilityLabel="No pudimos cargar más aprendices. Reintentar"
        style={[estilos.reintentar, { borderColor: c.borderStrong }]}
      >
        <Text style={[t.body, { fontSize: 16, color: c.textStrong, fontFamily: 'Jost_700Bold' }]}>
          No pudimos cargar más. Reintentar
        </Text>
      </Pressable>
    );
  }
  return null;
}

const estilos = StyleSheet.create({
  visible: { flex: 1 },
  /* Montada pero fuera de la vista: volver de la ficha es instantáneo y conserva la búsqueda y el lugar. */
  oculta: { display: 'none' },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 4,
    marginBottom: 4,
  },
  campo: { flex: 1, fontSize: 16, minHeight: 50 },
  /* 48 de lado: se toca con el pulgar sin apuntar (AGENTS.md §4). */
  borrar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
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
