import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import {
  listarCohortes,
  listarGruposDeCohorte,
  listarStaff,
  obtenerGuiasDeRecepcion,
  reemplazarGuiasDeRecepcion,
} from '../api/adminApi';
import type { CohorteAdminApi, GrupoResumenApi, UsuarioStaffApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { avisar, confirmar } from '../utils/dialogo';
import {
  candidatosAGuia,
  filasDeGuias,
  grupoInicialAMostrar,
  gruposDeBienvenida,
  guiasConUnoMas,
  guiasSinUno,
  ROLES_CANDIDATOS_A_GUIA,
  type FilaDeGuia,
} from '../utils/guiasRecepcion';
import { mensajeDeFallo } from '../utils/mensajes';

const MAX_CANDIDATOS = 15;

/**
 * «Guías del grupo inicial»: quién acompaña a los aprendices sus primeros 7 días, por cohorte.
 *
 * No es un rol (por eso no está en «Equipo y roles»): es la designación de
 * `PUT /admin/cohorts/{id}/reception/guides`, que le abre a esa persona el grupo de bienvenida,
 * sus aprendices y su chat. Se lee con el GET que agregó el backend en D-242. Cada «Agregar» o
 * «Quitar» manda la lista entera ya cambiada, porque el PUT es un reemplazo.
 */
export function GuiasRecepcionScreen({ onVolver }: { onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [cohortes, setCohortes] = useState<CohorteAdminApi[]>([]);
  const [cohorteId, setCohorteId] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<GrupoResumenApi[]>([]);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [guias, setGuias] = useState<FilaDeGuia[]>([]);
  const [staff, setStaff] = useState<UsuarioStaffApi[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  /* Las cohortes y el staff activo, una vez. La cohorte activa se elige sola. */
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [lista, paginas] = await Promise.all([
          listarCohortes(),
          Promise.all(ROLES_CANDIDATOS_A_GUIA.map(rol => listarStaff({ rol, estado: 'ACTIVE', tamano: 200 }))),
        ]);
        if (!vivo) return;
        setCohortes(lista);
        setStaff(paginas.flatMap(p => p.content));
        setCohorteId((lista.find(x => x.status === 'ACTIVE') ?? lista[0])?.id ?? null);
        if (lista.length === 0) setCargando(false);
      } catch (e) {
        if (!vivo) return;
        setError(mensajeDeFallo(e, 'No se pudo cargar.'));
        setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  /** Guías de un grupo concreto (o del designado, si `grupo` es null). */
  const leerGuias = useCallback(async (cohorte: string, grupo: string | null) => {
    const respuesta = await obtenerGuiasDeRecepcion(cohorte, grupo);
    setGuias(respuesta.receptionCellId ? filasDeGuias(respuesta) : []);
    return respuesta.receptionCellId;
  }, []);

  /* Al cambiar de cohorte: sus grupos de bienvenida y los guías del designado. */
  useEffect(() => {
    if (!cohorteId) return;
    let vivo = true;
    setCargando(true);
    setError(null);
    (async () => {
      try {
        const [todos, designado] = await Promise.all([listarGruposDeCohorte(cohorteId), leerGuias(cohorteId, null)]);
        if (!vivo) return;
        const abiertos = gruposDeBienvenida(todos);
        setGrupos(abiertos);
        setGrupoId(grupoInicialAMostrar(designado, abiertos));
      } catch (e) {
        if (vivo) setError(mensajeDeFallo(e, 'No se pudieron cargar los guías.'));
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [cohorteId, leerGuias]);

  const elegirGrupo = async (id: string) => {
    if (!cohorteId || id === grupoId) return;
    setGrupoId(id);
    setCargando(true);
    try {
      await leerGuias(cohorteId, id);
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudieron cargar los guías.'));
    } finally {
      setCargando(false);
    }
  };

  const guardar = async (ids: string[], quien: string) => {
    if (!cohorteId || !grupoId) return;
    setGuardando(quien);
    try {
      await reemplazarGuiasDeRecepcion(cohorteId, grupoId, ids);
      await leerGuias(cohorteId, grupoId);
      setBusqueda('');
    } catch (e) {
      avisar('No se pudo guardar', mensajeDeFallo(e, 'Inténtalo de nuevo.'));
    } finally {
      setGuardando(null);
    }
  };

  const idsActuales = useMemo(() => guias.map(g => g.id), [guias]);
  const quitar = async (guia: FilaDeGuia) => {
    const ok = await confirmar(`¿Quitar a ${guia.nombre}?`, 'Deja de ver el grupo inicial y su chat.', {
      ok: 'Quitar',
      destructivo: true,
    });
    if (ok) await guardar(guiasSinUno(idsActuales, guia.id), guia.id);
  };

  const candidatos = useMemo(() => candidatosAGuia(staff, idsActuales, busqueda), [staff, idsActuales, busqueda]);
  /* Sin buscar se ven los primeros: el Líder de Mentores va arriba. El resto, escribiendo. */
  const visibles = candidatos.slice(0, MAX_CANDIDATOS);

  const texto = [t.body, { fontSize: 16 }];
  const sinGrupo = !cargando && !error && cohorteId !== null && grupoId === null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Guías del grupo inicial" subtitulo="Primeros 7 días" onVolver={onVolver} />
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
          gap: 14,
        }}
      >
        <Text style={[...texto, { color: c.textSoft, lineHeight: 23 }]}>
          Acompañan a quien recién entra. No es un rol: ven el grupo de bienvenida y su chat.
        </Text>

        {cohortes.length > 1 ? (
          <View style={estilos.pastillas}>
            {cohortes.map(co => (
              <Pastilla key={co.id} etiqueta={co.name} activa={co.id === cohorteId} onPress={() => setCohorteId(co.id)} />
            ))}
          </View>
        ) : null}

        {grupos.length > 1 ? (
          <View style={estilos.pastillas}>
            {grupos.map(g => (
              <Pastilla key={g.id} etiqueta={g.name} activa={g.id === grupoId} onPress={() => void elegirGrupo(g.id)} />
            ))}
          </View>
        ) : null}

        {error ? <Text style={[...texto, { color: c.danger }]}>{error}</Text> : null}
        {cargando ? <ActivityIndicator color={c.goldInk} /> : null}
        {!cargando && cohortes.length === 0 && !error ? (
          <Text style={[...texto, { color: c.textSoft }]}>Todavía no hay cohortes.</Text>
        ) : null}
        {sinGrupo ? (
          <Text style={[...texto, { color: c.micro, lineHeight: 23 }]}>
            Esta cohorte no tiene grupo de bienvenida. Créalo en Grupos.
          </Text>
        ) : null}

        {!cargando && grupoId ? (
          <>
            <View style={{ gap: 10 }}>
              <TituloDeSeccion>Guías hoy ({guias.length})</TituloDeSeccion>
              {guias.length === 0 ? (
                <Text style={[...texto, { color: c.textSoft }]}>Nadie todavía.</Text>
              ) : null}
              {guias.map(g => (
                <Fila key={g.id} fila={g} accion="Quitar" ocupado={guardando} onPress={() => void quitar(g)} />
              ))}
            </View>

            <View style={{ gap: 10 }}>
              <TituloDeSeccion>Agregar</TituloDeSeccion>
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre o correo"
                placeholderTextColor={c.micro}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Buscar a quién agregar como guía"
                style={[...texto, estilos.buscador, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
              />
              {candidatos.length === 0 ? (
                <Text style={[...texto, { color: c.textSoft }]}>No hay a quién agregar.</Text>
              ) : null}
              {visibles.map(p => (
                <Fila
                  key={p.id}
                  fila={p}
                  accion="Agregar"
                  ocupado={guardando}
                  onPress={() => void guardar(guiasConUnoMas(idsActuales, p.id), p.id)}
                />
              ))}
              {candidatos.length > visibles.length ? (
                <Text style={[...texto, { color: c.micro }]}>Escribe para ver a los demás.</Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/* Fuera del componente para que React no los remonte en cada tecla del buscador. */
function Pastilla({ etiqueta, activa, onPress }: { etiqueta: string; activa: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={etiqueta}
      style={[estilos.pastilla, { borderColor: activa ? c.goldInk : c.border, backgroundColor: activa ? c.goldWash : 'transparent' }]}
    >
      <Text style={[t.body, { fontSize: 16, color: activa ? c.goldInk : c.text }]}>{etiqueta}</Text>
    </Pressable>
  );
}

function Fila({
  fila,
  accion,
  ocupado,
  onPress,
}: {
  fila: FilaDeGuia;
  accion: 'Agregar' | 'Quitar';
  ocupado: string | null;
  onPress: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <View style={{ flex: 1, flexShrink: 1 }}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontWeight: '500' }]} numberOfLines={1}>
          {fila.nombre}
        </Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]} numberOfLines={1}>
          {fila.detalle}
        </Text>
      </View>
      {ocupado === fila.id ? (
        <ActivityIndicator color={c.goldInk} />
      ) : (
        <Pressable
          onPress={onPress}
          disabled={ocupado !== null}
          accessibilityRole="button"
          accessibilityLabel={`${accion} a ${fila.nombre}`}
          style={[estilos.boton, { borderColor: accion === 'Quitar' ? c.border : c.goldInk, opacity: ocupado ? 0.5 : 1 }]}
        >
          <Text style={[t.body, { fontSize: 16, color: accion === 'Quitar' ? c.textStrong : c.goldInk }]}>{accion}</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pastillas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pastilla: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  buscador: { minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, width: '100%' },
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
  boton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
});
