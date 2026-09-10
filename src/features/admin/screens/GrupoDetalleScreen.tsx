import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import {
  agregarAprendiz,
  aprendicesDisponibles,
  asignarMentor,
  mentoresDisponibles,
  obtenerGrupo,
  quitarMentor,
  retirarAprendiz,
} from '../api/adminApi';
import type { AprendizCandidatoApi, GrupoDetalleApi, MentorCandidatoApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { EstadoDeGrupo } from '../components/EstadoDeGrupo';
import { rangoDeFechas } from '../utils/fechas';

const ESPECIALIDADES: Record<string, string> = {
  NEGOCIO: 'Negocio',
  MENTE: 'Mente',
  RELACIONES: 'Relaciones',
};

/**
 * La composición de un grupo: quién lo acompaña y quiénes lo cursan.
 *
 * Cada alta y cada baja es UNA operación del servidor con todos sus efectos —intervalo, punteros,
 * cupo y aviso al chat—; acá no se compone nada a mano ni se manda más de una llamada por acción.
 * Después de cada cambio se recarga el detalle en vez de parchear el estado local: el servidor
 * puede haber hecho más de lo que la pantalla pidió (cerrar la pertenencia anterior, dejar sin
 * mentor a otro grupo) y mostrar una versión optimista escondería justamente eso.
 *
 * Un grupo CERRADO se consulta pero no se compone: administración conserva la historia y no la
 * reescribe (ARF-18).
 */
export function GrupoDetalleScreen({
  grupoId,
  onVolver,
  onEditar,
}: {
  grupoId: string;
  onVolver: () => void;
  onEditar: (grupoId: string) => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [grupo, setGrupo] = useState<GrupoDetalleApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [eligiendo, setEligiendo] = useState<'mentor' | 'aprendiz' | null>(null);
  const [mentores, setMentores] = useState<MentorCandidatoApi[]>([]);
  const [candidatos, setCandidatos] = useState<AprendizCandidatoApi[]>([]);

  useSystemBackHandler(() => {
    // El selector abierto se cierra primero: el gesto sube un nivel, no sale de la pantalla.
    if (eligiendo) {
      setEligiendo(null);
      return true;
    }
    onVolver();
    return true;
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setGrupo(await obtenerGrupo(grupoId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el grupo.');
    } finally {
      setCargando(false);
    }
  }, [grupoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const conAviso = async (accion: () => Promise<unknown>, queFalla: string) => {
    setTrabajando(true);
    try {
      await accion();
      await cargar();
      setEligiendo(null);
    } catch (e) {
      Alert.alert(queFalla, e instanceof Error ? e.message : 'Probá de nuevo en un momento.');
    } finally {
      setTrabajando(false);
    }
  };

  const abrirSelectorDeMentor = async () => {
    setEligiendo('mentor');
    try {
      setMentores(await mentoresDisponibles());
    } catch (e) {
      Alert.alert('No se pudo traer la lista de mentores', e instanceof Error ? e.message : '');
      setEligiendo(null);
    }
  };

  const abrirSelectorDeAprendiz = async () => {
    setEligiendo('aprendiz');
    try {
      setCandidatos(await aprendicesDisponibles());
    } catch (e) {
      Alert.alert('No se pudo traer la lista de aprendices', e instanceof Error ? e.message : '');
      setEligiendo(null);
    }
  };

  const cerrado = grupo?.status === 'CERRADO';
  const cupo = grupo?.capacity ?? null;
  const ocupadas = grupo?.learnerCount ?? grupo?.members.length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo={grupo?.name ?? 'Grupo'}
        subtitulo={grupo ? rangoDeFechas(grupo.periodStart ?? null, grupo.periodEnd ?? null) : null}
        onVolver={onVolver}
        accion={{ etiqueta: 'Editar', onPress: () => onEditar(grupoId) }}
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
          gap: 16,
        }}
      >
        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 24 }} /> : null}

        {error ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <Text style={[t.body, { color: c.danger, fontSize: 14 }]}>{error}</Text>
            <Pressable onPress={cargar} accessibilityRole="button" style={estilos.accionTexto}>
              <Text style={[t.body, { color: c.goldInk, fontSize: 14, fontWeight: '500' }]}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {grupo ? (
          <>
            <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 8 }]}>
              <EstadoDeGrupo estado={grupo.status ?? null} />
              <Text style={[t.body, { color: c.text, fontSize: 14.5 }]}>
                {grupo.type === 'RECEPCION'
                  ? 'Bienvenida · sin tope de plazas'
                  : cupo
                    ? `${ocupadas} de ${cupo} plazas ocupadas`
                    : `${ocupadas} aprendices`}
              </Text>
              {cerrado ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 18 }]}>
                  Este grupo terminó su período. Se conserva para consultarlo; para seguir, creá el
                  grupo siguiente y movés a su gente ahí.
                </Text>
              ) : null}
              {grupo.status === 'PROGRAMADO' ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 18 }]}>
                  Todavía no arrancó. Podés armarlo ahora: sus integrantes no tendrán acceso ni chat
                  hasta el día de comienzo.
                </Text>
              ) : null}
            </View>

            {/* ── Mentor ─────────────────────────────────────────────────── */}
            <View style={{ gap: 10 }}>
              <MicroLabel>MENTOR</MicroLabel>
              {grupo.mentor ? (
                <View style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 15, flex: 1, flexShrink: 1 }]}>
                    {grupo.mentor.fullName ?? 'Sin nombre'}
                  </Text>
                  {!cerrado ? (
                    <Pressable
                      onPress={() =>
                        Alert.alert('Quitar mentor', '¿Dejar el grupo sin mentor asignado?', [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Quitar',
                            style: 'destructive',
                            onPress: () => void conAviso(() => quitarMentor(grupoId), 'No se pudo quitar'),
                          },
                        ])
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Quitar mentor"
                      style={estilos.accionTexto}
                    >
                      <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>Quitar</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>
                  Sin mentor asignado. El grupo sigue siendo un grupo.
                </Text>
              )}
              {!cerrado ? (
                <Pressable
                  onPress={abrirSelectorDeMentor}
                  accessibilityRole="button"
                  accessibilityLabel={grupo.mentor ? 'Cambiar mentor' : 'Asignar mentor'}
                  style={[estilos.boton, { borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '500' }]}>
                    {grupo.mentor ? 'Cambiar mentor' : 'Asignar mentor'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* ── Aprendices ─────────────────────────────────────────────── */}
            <View style={{ gap: 10 }}>
              <MicroLabel>APRENDICES</MicroLabel>
              {grupo.members.length === 0 ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>Todavía no hay nadie.</Text>
              ) : null}
              {grupo.members.map(persona => (
                <View
                  key={persona.id}
                  style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textStrong, fontSize: 15, flex: 1, flexShrink: 1 }]}>
                    {persona.fullName ?? 'Sin nombre'}
                  </Text>
                  {!cerrado ? (
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          'Retirar del grupo',
                          `${persona.fullName ?? 'Esta persona'} dejará de pertenecer a ${grupo.name}. Su historial se conserva.`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Retirar',
                              style: 'destructive',
                              onPress: () =>
                                void conAviso(() => retirarAprendiz(grupoId, persona.id), 'No se pudo retirar'),
                            },
                          ],
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Retirar a ${persona.fullName ?? 'esta persona'}`}
                      style={estilos.accionTexto}
                    >
                      <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>Retirar</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {!cerrado ? (
                <Pressable
                  onPress={abrirSelectorDeAprendiz}
                  accessibilityRole="button"
                  accessibilityLabel="Agregar aprendiz"
                  style={[estilos.boton, { borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '500' }]}>
                    Agregar aprendiz
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* ── Selector ───────────────────────────────────────────────── */}
            {eligiendo ? (
              <View style={{ gap: 10 }}>
                <MicroLabel>
                  {eligiendo === 'mentor' ? 'ELEGÍ UN MENTOR' : 'ELEGÍ UN APRENDIZ'}
                </MicroLabel>
                {eligiendo === 'mentor'
                  ? mentores.map(m => (
                      <Pressable
                        key={m.userId}
                        disabled={trabajando}
                        onPress={() => void conAviso(() => asignarMentor(grupoId, m.userId), 'No se pudo asignar')}
                        accessibilityRole="button"
                        accessibilityLabel={m.fullName ?? 'Mentor'}
                        style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                      >
                        <View style={{ flex: 1, flexShrink: 1 }}>
                          <Text style={[t.body, { color: c.textStrong, fontSize: 15 }]}>
                            {m.fullName ?? 'Sin nombre'}
                          </Text>
                          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]}>
                            {/* Null NO se rellena con ninguna de las tres: el administrador elige
                                por esto, y adivinarla sería decidir por él. */}
                            {m.specialty ? ESPECIALIDADES[m.specialty] ?? m.specialty : 'Sin especialidad definida'}
                            {m.cellId ? ' · ya lidera otro grupo' : ''}
                          </Text>
                        </View>
                        <Icon name="chevron" size={16} color={c.chevron} />
                      </Pressable>
                    ))
                  : candidatos.map(a => (
                      <Pressable
                        key={a.userId}
                        disabled={trabajando}
                        onPress={() => void conAviso(() => agregarAprendiz(grupoId, a.userId), 'No se pudo agregar')}
                        accessibilityRole="button"
                        accessibilityLabel={a.fullName ?? 'Aprendiz'}
                        style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                      >
                        <Text style={[t.body, { color: c.textStrong, fontSize: 15, flex: 1, flexShrink: 1 }]}>
                          {a.fullName ?? 'Sin nombre'}
                        </Text>
                        <Icon name="chevron" size={16} color={c.chevron} />
                      </Pressable>
                    ))}
                {(eligiendo === 'mentor' ? mentores : candidatos).length === 0 ? (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>
                    {eligiendo === 'mentor'
                      ? 'No hay mentores activos con perfil creado.'
                      : 'No hay aprendices activos sin grupo.'}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => setEligiendo(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar la lista"
                  style={[estilos.boton, { borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>Cerrar</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, width: '100%' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    flexWrap: 'wrap',
  },
  boton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  accionTexto: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 },
});
