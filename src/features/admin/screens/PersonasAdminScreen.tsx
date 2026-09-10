import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { listarAprendices } from '../api/adminApi';
import type { AprendizAdminApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { mensajeDeFallo } from '../utils/mensajes';

const POR_PAGINA = 20;

/**
 * El padrón de aprendices, con búsqueda y la cola de "sin grupo".
 *
 * **La búsqueda va al servidor.** Filtrar sobre las veinte filas ya descargadas escondería a
 * quien está en la página cuatro y le diría al administrador que esa persona no existe. Por eso
 * cada tecleo relanza la consulta —con un respiro de 350 ms para no mandar una por letra— y el
 * total que se muestra viene del servidor con el mismo filtro aplicado.
 *
 * Las páginas se acumulan con "Ver más" en vez de paginador numérico: en un teléfono, mantener
 * el pulgar en un botón fijo es más cómodo que acertarle a un número (AGENTS.md §4).
 */
export function PersonasAdminScreen({
  onVolver,
  onAbrirFicha,
  soloSinGrupoAlEntrar = false,
}: {
  onVolver: () => void;
  onAbrirFicha: (aprendiz: AprendizAdminApi) => void;
  soloSinGrupoAlEntrar?: boolean;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [soloSinGrupo, setSoloSinGrupo] = useState(soloSinGrupoAlEntrar);
  const [personas, setPersonas] = useState<AprendizAdminApi[]>([]);
  /**
   * `null` mientras no haya una lectura REAL, y no 0.
   *
   * <blockquote>Con la consulta caída, la cabecera decía "0 en total": afirmaba que el padrón
   * está vacío cuando lo cierto es que no se pudo leer. Es justo lo que ARF-02 prohíbe —un error
   * convertido en cero—, y lo peor es que suena creíble: nadie sospecha de un contador.</blockquote>
   */
  const [total, setTotal] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  /* El respiro evita una consulta por tecla. 350 ms es lo que tarda una pausa natural al
     escribir: por debajo se manda de más, por encima se siente trabado. */
  useEffect(() => {
    const id = setTimeout(() => {
      setBusquedaAplicada(busqueda);
      setPagina(0);
    }, 350);
    return () => clearTimeout(id);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarAprendices({
        pagina,
        tamano: POR_PAGINA,
        busqueda: busquedaAplicada,
        soloSinGrupo,
      });
      // La página 0 reemplaza; las siguientes acumulan. Reemplazar siempre haría que "Ver más"
      // pareciera no hacer nada.
      setPersonas(previas => (pagina === 0 ? respuesta.content : [...previas, ...respuesta.content]));
      setTotal(respuesta.total);
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudo cargar el padrón.'));
    } finally {
      setCargando(false);
    }
  }, [pagina, busquedaAplicada, soloSinGrupo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hayMas = total !== null && personas.length < total;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Personas"
        subtitulo={total === null ? 'Sin datos todavía' : `${total} en total`}
        onVolver={onVolver}
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 12,
        }}
      >
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre o correo"
          placeholderTextColor={c.micro}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar personas"
          style={[
            estilos.buscador,
            { backgroundColor: c.cardBg, borderColor: c.border, color: c.text },
            t.body,
          ]}
        />

        <Pressable
          onPress={() => {
            setSoloSinGrupo(v => !v);
            setPagina(0);
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: soloSinGrupo }}
          accessibilityLabel="Mostrar solo personas sin grupo"
          style={[
            estilos.pastilla,
            {
              borderColor: soloSinGrupo ? c.goldInk : c.border,
              backgroundColor: soloSinGrupo ? c.goldWash : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              t.body,
              { color: soloSinGrupo ? c.goldInk : c.textSoft, fontSize: 13.5, fontWeight: soloSinGrupo ? '700' : '400' },
            ]}
          >
            {soloSinGrupo ? '✓ Solo sin grupo' : 'Solo sin grupo'}
          </Text>
        </Pressable>

        {error ? <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>{error}</Text> : null}

        {personas.map(persona => (
          <Pressable
            key={persona.id}
            onPress={() => onAbrirFicha(persona)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ficha de ${persona.fullName ?? 'esta persona'}`}
            style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
          >
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={[t.body, { color: c.textStrong, fontSize: 15, fontWeight: '500' }]} numberOfLines={1}>
                {persona.fullName ?? 'Sin nombre'}
              </Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]} numberOfLines={1}>
                {persona.cellId ? `Día ${persona.programDay}` : `Sin grupo · día ${persona.programDay}`}
                {persona.status === 'SUSPENDED' ? ' · suspendida' : ''}
              </Text>
            </View>
            <Icon name="chevron" size={18} color={c.chevron} />
          </Pressable>
        ))}

        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 12 }} /> : null}

        {!cargando && personas.length === 0 && !error ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 14, marginTop: 8 }]}>
            {busquedaAplicada.trim()
              ? `Nadie coincide con "${busquedaAplicada.trim()}".`
              : 'No hay personas en este tramo.'}
          </Text>
        ) : null}

        {hayMas && !cargando ? (
          <Pressable
            onPress={() => setPagina(p => p + 1)}
            accessibilityRole="button"
            accessibilityLabel="Ver más personas"
            style={[estilos.boton, { borderColor: c.border }]}
          >
            <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '500' }]}>
              Ver más ({personas.length} de {total ?? '—'})
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  buscador: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    width: '100%',
  },
  pastilla: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  boton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
});
