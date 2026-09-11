import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { cambiarRolDeUsuario, listarAprendices, mentoresDisponibles } from '../api/adminApi';
import type { RolAsignable } from '../api/adminApi';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { confirmar, avisar } from '../utils/dialogo';
import { mensajeDeFallo } from '../utils/mensajes';

const POR_PAGINA = 20;

/** Los cinco, con el nombre que usa la gente y no el del enum. */
const ROLES: Array<{ clave: RolAsignable; etiqueta: string }> = [
  { clave: 'TRAINEE', etiqueta: 'Aprendiz' },
  { clave: 'MENTOR', etiqueta: 'Mentor' },
  { clave: 'MENTOR_LEAD', etiqueta: 'Líder de mentores' },
  { clave: 'ADMIN', etiqueta: 'Administrador' },
  { clave: 'ALCHEMIST', etiqueta: 'Alquimista' },
];

/**
 * Los roles que el PANEL sabe volver a encontrar. Aprendices y mentores tienen cada uno su
 * listado; los otros tres no se listan en ningún lado, así que promover a uno de ellos saca a la
 * persona de la vista.
 */
const LISTABLES: ReadonlySet<RolAsignable> = new Set<RolAsignable>(['TRAINEE', 'MENTOR']);

const ETIQUETA = new Map(ROLES.map(r => [r.clave, r.etiqueta]));

type Persona = { id: string; nombre: string; detalle: string; rol: RolAsignable };

/**
 * Una persona con su rol desplegable.
 *
 * Vive FUERA de `StaffRolesScreen` a propósito. Declarada adentro, React la trata como un tipo de
 * componente nuevo en cada render y REMONTA el subárbol: la fila abierta se cerraría sola y el
 * buscador perdería el foco a cada tecla, que es el peor sitio donde puede pasar.
 */
function FilaDePersona({
  persona,
  desplegada,
  guardando,
  onAlternar,
  onElegir,
}: {
  persona: Persona;
  desplegada: boolean;
  guardando: string | null;
  onAlternar: () => void;
  onElegir: (rol: RolAsignable) => void;
}) {
  const { c, t } = useTheme();
  const rotuloActual = ETIQUETA.get(persona.rol) ?? persona.rol;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: desplegada ? c.goldInk : c.border }]}>
      <Pressable
        onPress={onAlternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: desplegada }}
        accessibilityLabel={`Cambiar el rol de ${persona.nombre}, hoy ${rotuloActual}`}
        style={estilos.cabeceraFila}
      >
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 15, fontWeight: '500' }]} numberOfLines={1}>
            {persona.nombre}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]} numberOfLines={1}>
            {rotuloActual} · {persona.detalle}
          </Text>
        </View>
        {guardando === persona.id ? <ActivityIndicator color={c.goldInk} /> : null}
      </Pressable>

      {desplegada ? (
        <View style={{ gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5 }]}>Elegí el rol nuevo:</Text>
          {ROLES.map(rol => {
            const actual = rol.clave === persona.rol;
            return (
              <Pressable
                key={rol.clave}
                disabled={actual || guardando !== null}
                onPress={() => onElegir(rol.clave)}
                accessibilityRole="button"
                accessibilityLabel={actual ? `${rol.etiqueta}, es el rol actual` : `Hacer ${rol.etiqueta}`}
                style={[
                  estilos.opcionRol,
                  {
                    borderColor: actual ? c.goldInk : c.border,
                    backgroundColor: actual ? c.goldWash : 'transparent',
                    opacity: guardando !== null && !actual ? 0.5 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    t.body,
                    { color: actual ? c.goldInk : c.textStrong, fontSize: 14.5, fontWeight: actual ? '700' : '400' },
                  ]}
                >
                  {actual ? `✓ ${rol.etiqueta} (rol actual)` : rol.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Cambiar el rol de una cuenta.
 *
 * **El cambio tiene que poder deshacerse desde acá mismo**, y esa es la restricción que da forma a
 * la pantalla. El panel solo sabe listar dos roles: los aprendices salen de
 * `GET /admin/trainees` y los mentores de `GET /admin/cells/mentores`. No hay listado de
 * administradores, alquimistas ni líderes — promover a uno de esos tres hace desaparecer a la
 * persona de las dos listas, y sin nada más sería una puerta de un solo sentido: un toque mal dado
 * y recuperar esa cuenta exige entrar a la base de datos.
 *
 * Por eso hay dos defensas, y ninguna es decorativa:
 *
 * 1. La confirmación dice **dónde va a quedar la persona después**, no solo qué rol se le pone.
 *    Un administrador de 40 o 60 años no tiene por qué deducir que "Administrador" significa
 *    "desaparece de esta pantalla" (AGENTS.md §5).
 * 2. Lo cambiado en esta visita queda fijado arriba, en «Cambios de esta sesión», con su rol nuevo
 *    y pudiendo cambiarse otra vez. Así el arrepentimiento se resuelve con un toque en vez de con
 *    un psql.
 *
 * No se ofrece `ASSISTANT`: está en el enum de la base pero la API lo rechaza con 400 —comprobado
 * el 2026-09-11—, y una opción que siempre falla es peor que no tenerla.
 */
export function StaffRolesScreen({ onVolver }: { onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(0);
  const [aprendices, setAprendices] = useState<Persona[]>([]);
  const [mentores, setMentores] = useState<Persona[]>([]);
  const [totalAprendices, setTotalAprendices] = useState<number | null>(null);
  const [cambiados, setCambiados] = useState<Persona[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSystemBackHandler(() => {
    if (abierta) {
      setAbierta(null);
      return true;
    }
    onVolver();
    return true;
  });

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
      const [pagAprendices, listaMentores] = await Promise.all([
        listarAprendices({ pagina, tamano: POR_PAGINA, busqueda: busquedaAplicada }),
        mentoresDisponibles(),
      ]);
      const nuevos: Persona[] = pagAprendices.content.map(a => ({
        id: a.id,
        nombre: a.fullName ?? 'Sin nombre',
        detalle: a.email ?? `Día ${a.programDay}`,
        rol: 'TRAINEE',
      }));
      setAprendices(previos => (pagina === 0 ? nuevos : [...previos, ...nuevos]));
      setTotalAprendices(pagAprendices.total);
      setMentores(
        listaMentores.map(m => ({
          id: m.userId,
          nombre: m.fullName ?? 'Sin nombre',
          detalle: m.cellId ? 'Acompaña un grupo' : 'Sin grupo asignado',
          rol: 'MENTOR',
        })),
      );
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudo cargar el padrón.'));
    } finally {
      setCargando(false);
    }
  }, [pagina, busquedaAplicada]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* Quien ya se cambió en esta visita se muestra ARRIBA y no repetido abajo: la lista de origen
     todavía puede traerlo mientras no se recargue, y verlo dos veces con roles distintos es la
     forma más rápida de perder la confianza en la pantalla. */
  const idsCambiados = useMemo(() => new Set(cambiados.map(p => p.id)), [cambiados]);
  const aprendicesVisibles = aprendices.filter(p => !idsCambiados.has(p.id));
  const mentoresVisibles = mentores.filter(p => !idsCambiados.has(p.id));

  const aplicar = async (persona: Persona, nuevo: RolAsignable) => {
    if (nuevo === persona.rol) {
      setAbierta(null);
      return;
    }
    const etiqueta = ETIQUETA.get(nuevo) ?? nuevo;
    const donde = LISTABLES.has(nuevo)
      ? nuevo === 'TRAINEE'
        ? 'Va a aparecer en la lista de aprendices.'
        : 'Va a aparecer en la lista de mentores.'
      : 'El panel no lista ese rol, así que va a salir de estas listas. Mientras no salgas de esta '
        + 'pantalla la vas a seguir viendo arriba, en «Cambios de esta sesión», por si te arrepentís.';

    const acepto = await confirmar(
      `¿Hacer ${etiqueta} a ${persona.nombre}?`,
      `${persona.nombre} pasa de ${ETIQUETA.get(persona.rol) ?? persona.rol} a ${etiqueta}.\n\n${donde}`,
      { ok: `Sí, hacer ${etiqueta}` },
    );
    if (!acepto) return;

    setGuardando(persona.id);
    try {
      await cambiarRolDeUsuario(persona.id, nuevo);
      setCambiados(previos => [
        { ...persona, rol: nuevo },
        ...previos.filter(p => p.id !== persona.id),
      ]);
      setAbierta(null);
    } catch (e) {
      avisar('No se pudo cambiar el rol', mensajeDeFallo(e, 'Probá de nuevo.'));
    } finally {
      setGuardando(null);
    }
  };

  const hayMas = totalAprendices !== null && aprendices.length < totalAprendices;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Staff y roles" subtitulo="Quién es qué" onVolver={onVolver} />
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
        <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
          Al aprobar una solicitud la persona entra siempre como aprendiz. Acá se le cambia el rol.
        </Text>

        {error ? <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>{error}</Text> : null}

        {cambiados.length > 0 ? (
          <View style={{ gap: 10 }}>
            <MicroLabel>CAMBIOS DE ESTA SESIÓN</MicroLabel>
            {cambiados.map(persona => (
              <FilaDePersona
                key={`cambiado-${persona.id}`}
                persona={persona}
                desplegada={abierta === persona.id}
                guardando={guardando}
                onAlternar={() => setAbierta(abierta === persona.id ? null : persona.id)}
                onElegir={rol => aplicar(persona, rol)}
              />
            ))}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <MicroLabel>MENTORES ({mentoresVisibles.length})</MicroLabel>
          {mentoresVisibles.length === 0 && !cargando ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 13.5 }]}>
              Todavía no hay mentores. Hacé mentor a alguien de la lista de abajo.
            </Text>
          ) : null}
          {mentoresVisibles.map(persona => (
            <FilaDePersona
                key={`mentor-${persona.id}`}
                persona={persona}
                desplegada={abierta === persona.id}
                guardando={guardando}
                onAlternar={() => setAbierta(abierta === persona.id ? null : persona.id)}
                onElegir={rol => aplicar(persona, rol)}
              />
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <MicroLabel>
            APRENDICES {totalAprendices === null ? '' : `(${totalAprendices} en total)`}
          </MicroLabel>
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre o correo"
            placeholderTextColor={c.micro}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar aprendices"
            style={[estilos.buscador, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }, t.body]}
          />
          {aprendicesVisibles.map(persona => (
            <FilaDePersona
                key={`aprendiz-${persona.id}`}
                persona={persona}
                desplegada={abierta === persona.id}
                guardando={guardando}
                onAlternar={() => setAbierta(abierta === persona.id ? null : persona.id)}
                onElegir={rol => aplicar(persona, rol)}
              />
          ))}
        </View>

        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 12 }} /> : null}

        {hayMas && !cargando ? (
          <Pressable
            onPress={() => setPagina(p => p + 1)}
            accessibilityRole="button"
            accessibilityLabel="Ver más aprendices"
            style={[estilos.boton, { borderColor: c.border }]}
          >
            <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '500' }]}>
              Ver más ({aprendices.length} de {totalAprendices ?? '—'})
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
  tarjeta: {
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  cabeceraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  opcionRol: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
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
