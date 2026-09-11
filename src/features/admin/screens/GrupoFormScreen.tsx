import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '../../../components/FormField';
import { GoldButton } from '../../../components/GoldButton';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { avisar } from '../utils/dialogo';
import { actualizarGrupo, crearCohorte, crearGrupo, listarCohortes, obtenerGrupo } from '../api/adminApi';
import type { CohorteAdminApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { esFechaValida, normalizarFechaIso } from '../utils/fechas';
import { mensajeDeFallo } from '../utils/mensajes';

const CAPACIDAD_MINIMA = 10;
const CAPACIDAD_MAXIMA = 15;

/**
 * Alta y edición de un grupo: nombre, cohorte, período, tipo y cupo.
 *
 * **El período es lo delicado de esta pantalla.** Va con las dos fechas o con ninguna; media
 * fecha no es medio período, es un grupo en un limbo que ninguna consulta resuelve. Y borrarlo se
 * PIDE: un guardado que solo cambia el nombre no toca las fechas, porque perderlas sin querer
 * significa que el grupo deja de cerrarse y nadie se entera (ARF-05, V10).
 *
 * El tipo se elige solo al crear. Convertir un grupo estable en bienvenida a mitad de camino le
 * quitaría el tope con gente adentro, así que en edición no se ofrece.
 */
export function GrupoFormScreen({
  grupoId,
  onVolver,
  onGuardado,
}: {
  /** `null` = alta. Con id, se edita el que ya existe. */
  grupoId: string | null;
  onVolver: () => void;
  onGuardado: (grupoId: string) => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [cohortes, setCohortes] = useState<CohorteAdminApi[]>([]);
  const [cohorteId, setCohorteId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [tipo, setTipo] = useState<'REGULAR' | 'RECEPTION'>('REGULAR');
  const [capacidad, setCapacidad] = useState(String(CAPACIDAD_MINIMA));
  const [teniaPeriodo, setTeniaPeriodo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [fallo, setFallo] = useState<string | null>(null);
  /** Alta de la primera cohorte, cuando no hay ninguna: sin ella no se puede crear ningún grupo. */
  const [nuevaCohorte, setNuevaCohorte] = useState('');
  const [creandoCohorte, setCreandoCohorte] = useState(false);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const lista = await listarCohortes();
        if (!vivo) return;
        setCohortes(lista);
        // Se propone la primera ACTIVA, no la primera de la lista: una cohorte completada no
        // admite grupos nuevos y el error saldría recién al guardar.
        const activa = lista.find(co => co.status === 'ACTIVE') ?? lista[0];
        setCohorteId(prev => prev ?? activa?.id ?? null);
        if (grupoId) {
          const grupo = await obtenerGrupo(grupoId);
          if (!vivo) return;
          setNombre(grupo.name);
          setCohorteId(grupo.cohortId);
          setInicio(grupo.periodStart ?? '');
          setFin(grupo.periodEnd ?? '');
          setTeniaPeriodo(Boolean(grupo.periodStart && grupo.periodEnd));
          setTipo(grupo.type === 'RECEPCION' ? 'RECEPTION' : 'REGULAR');
          if (grupo.capacity) setCapacidad(String(grupo.capacity));
        }
      } catch (e) {
        if (vivo) setFallo(mensajeDeFallo(e, 'No se pudo cargar el grupo.'));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [grupoId]);

  const esBienvenida = tipo === 'RECEPTION';

  const validar = (): boolean => {
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) nuevos.nombre = 'Poné un nombre para el grupo.';
    if (!cohorteId) nuevos.cohorte = 'Elegí la cohorte.';
    const hayAlguna = Boolean(inicio.trim() || fin.trim());
    if (hayAlguna) {
      if (!esFechaValida(inicio.trim())) nuevos.inicio = 'Formato AAAA-MM-DD, y que la fecha exista.';
      if (!esFechaValida(fin.trim())) nuevos.fin = 'Formato AAAA-MM-DD, y que la fecha exista.';
      if (!nuevos.inicio && !nuevos.fin && fin.trim() < inicio.trim()) {
        nuevos.fin = 'El cierre no puede ser antes del comienzo.';
      }
    }
    if (!esBienvenida) {
      const n = Number(capacidad);
      if (!Number.isInteger(n) || n < CAPACIDAD_MINIMA || n > CAPACIDAD_MAXIMA) {
        nuevos.capacidad = `Entre ${CAPACIDAD_MINIMA} y ${CAPACIDAD_MAXIMA} aprendices.`;
      }
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const guardar = async () => {
    if (!validar() || !cohorteId) return;
    setGuardando(true);
    setFallo(null);
    try {
      const conPeriodo = Boolean(inicio.trim() && fin.trim());
      if (grupoId) {
        const grupo = await actualizarGrupo(grupoId, {
          nombre: nombre.trim(),
          // Si tenía período y quedó vacío, se pide el borrado EXPLÍCITO. No mandar nada dejaría
          // las fechas viejas y el administrador creería que las quitó.
          ...(conPeriodo
            ? { periodoInicio: inicio.trim(), periodoFin: fin.trim() }
            : teniaPeriodo
              ? { borrarPeriodo: true }
              : {}),
          ...(esBienvenida ? {} : { capacidad: Number(capacidad) }),
        });
        onGuardado(grupo.id);
      } else {
        const grupo = await crearGrupo({
          nombre: nombre.trim(),
          cohorteId,
          periodoInicio: conPeriodo ? inicio.trim() : null,
          periodoFin: conPeriodo ? fin.trim() : null,
          tipo,
          capacidad: esBienvenida ? null : Number(capacidad),
        });
        onGuardado(grupo.id);
      }
    } catch (e) {
      const mensaje = mensajeDeFallo(e, 'No se pudo guardar el grupo.');
      setFallo(mensaje);
      avisar('No se guardó', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const crearNuevaCohorte = async () => {
    if (!nuevaCohorte.trim()) {
      setErrores(e => ({ ...e, cohorte: 'Poné un nombre para la cohorte.' }));
      return;
    }
    setCreandoCohorte(true);
    try {
      const co = await crearCohorte(nuevaCohorte.trim());
      setCohortes(prev => [...prev, co]);
      setCohorteId(co.id);
      setNuevaCohorte('');
      setErrores(e => ({ ...e, cohorte: '' }));
    } catch (e) {
      avisar('No se pudo crear la cohorte', mensajeDeFallo(e, 'Probá de nuevo.'));
    } finally {
      setCreandoCohorte(false);
    }
  };

  const nombreDeCohorte = useMemo(
    () => cohortes.find(co => co.id === cohorteId)?.name ?? null,
    [cohortes, cohorteId],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo={grupoId ? 'Editar grupo' : 'Crear grupo'}
        subtitulo={nombreDeCohorte}
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
          gap: 6,
        }}
      >
        <FormField
          label="NOMBRE DEL GRUPO"
          value={nombre}
          onChangeText={setNombre}
          error={errores.nombre}
          placeholder="Fénix"
          autoCapitalize="words"
        />

        {!grupoId ? (
          <View style={{ gap: 8, marginTop: 4 }}>
            <MicroLabel>COHORTE</MicroLabel>
            {cohortes.length === 0 ? (
              /* Sin ninguna cohorte no se puede crear ningún grupo, y el panel no tenía por dónde
                 crearla: era un huevo-y-gallina que dejaba el formulario trabado. Acá se crea la
                 primera en el sitio. */
              <View style={{ gap: 8 }}>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 17 }]}>
                  La cohorte es la generación a la que pertenece el grupo (por ejemplo «Generación
                  Septiembre»). Todavía no hay ninguna: creá la primera para poder seguir.
                </Text>
                <FormField
                  label="NOMBRE DE LA COHORTE"
                  value={nuevaCohorte}
                  onChangeText={setNuevaCohorte}
                  error={errores.cohorte || undefined}
                  placeholder="Generación Septiembre 2026"
                  autoCapitalize="words"
                />
                <Pressable
                  onPress={crearNuevaCohorte}
                  disabled={creandoCohorte}
                  accessibilityRole="button"
                  accessibilityLabel="Crear la cohorte"
                  style={[estilos.opcion, { borderColor: c.goldInk, alignItems: 'center', opacity: creandoCohorte ? 0.6 : 1 }]}
                >
                  <Text style={[t.body, { color: c.goldInk, fontSize: 14, fontWeight: '500' }]}>
                    {creandoCohorte ? 'Creando…' : 'Crear cohorte'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={estilos.opciones}>
                  {cohortes.map(co => {
                    const activa = cohorteId === co.id;
                    return (
                      <Pressable
                        key={co.id}
                        onPress={() => setCohorteId(co.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activa }}
                        accessibilityLabel={co.name}
                        style={[
                          estilos.opcion,
                          { borderColor: activa ? c.goldInk : c.border, backgroundColor: activa ? c.goldWash : 'transparent' },
                        ]}
                      >
                        <Text style={[t.body, { color: activa ? c.goldInk : c.text, fontSize: 14 }]}>{co.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errores.cohorte ? (
                  <Text style={[t.body, { color: c.danger, fontSize: 12.5 }]}>{errores.cohorte}</Text>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {!grupoId ? (
          <View style={{ gap: 8, marginTop: 10 }}>
            <MicroLabel>TIPO</MicroLabel>
            <View style={estilos.opciones}>
              {(
                [
                  { clave: 'REGULAR' as const, etiqueta: 'Grupo estable' },
                  { clave: 'RECEPTION' as const, etiqueta: 'Bienvenida (permanente)' },
                ]
              ).map(op => {
                const activa = tipo === op.clave;
                return (
                  <Pressable
                    key={op.clave}
                    onPress={() => {
                      setTipo(op.clave);
                      // La bienvenida es permanente: sin fechas. El corte lo pone el día de
                      // programa de cada persona, no el calendario del grupo.
                      if (op.clave === 'RECEPTION') {
                        setInicio('');
                        setFin('');
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activa }}
                    accessibilityLabel={op.etiqueta}
                    style={[
                      estilos.opcion,
                      { borderColor: activa ? c.goldInk : c.border, backgroundColor: activa ? c.goldWash : 'transparent' },
                    ]}
                  >
                    <Text style={[t.body, { color: activa ? c.goldInk : c.text, fontSize: 14 }]}>{op.etiqueta}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 17 }]}>
              {esBienvenida
                ? 'La bienvenida no lleva fechas ni tope de plazas: recibe sola a cada persona que se registra durante sus primeros días de programa y la suelta cuando le toca pasar a un grupo estable. Con una alcanza — no hace falta crear una nueva cada semana.'
                : 'El grupo estable tiene fechas (suele ser por mes) y un tope de plazas. Acá aterriza la gente cuando sale de la bienvenida.'}
            </Text>
          </View>
        ) : null}

        {/* La bienvenida es permanente: no muestra fechas. El resto sí, porque un grupo estable
            se cierra por calendario. */}
        {!esBienvenida ? (
          <View style={{ marginTop: 10 }}>
            <FormField
              label="COMIENZA"
              helperText="AAAA-MM-DD. Las dos fechas o ninguna."
              value={inicio}
              onChangeText={setInicio}
              onBlur={() => setInicio(normalizarFechaIso(inicio))}
              error={errores.inicio}
              placeholder="2026-09-01"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            <FormField
              label="CIERRA"
              helperText="El último día entra entero."
              value={fin}
              onChangeText={setFin}
              onBlur={() => setFin(normalizarFechaIso(fin))}
              error={errores.fin}
              placeholder="2026-09-30"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            {teniaPeriodo && !inicio.trim() && !fin.trim() ? (
              <Text style={[t.body, { color: c.danger, fontSize: 12.5, marginTop: -4, marginBottom: 8 }]}>
                Al guardar se le quita el período: el grupo dejará de cerrarse solo.
              </Text>
            ) : null}
          </View>
        ) : null}

        {!esBienvenida ? (
          <FormField
            label="PLAZAS DE APRENDIZ"
            helperText={`De ${CAPACIDAD_MINIMA} a ${CAPACIDAD_MAXIMA}. El mentor y el soporte no ocupan lugar.`}
            value={capacidad}
            onChangeText={setCapacidad}
            error={errores.capacidad}
            keyboardType="number-pad"
          />
        ) : null}

        {fallo ? (
          <Text style={[t.body, { color: c.danger, fontSize: 13, marginBottom: 8 }]}>{fallo}</Text>
        ) : null}

        <GoldButton
          label={grupoId ? 'Guardar cambios' : 'Crear grupo'}
          onPress={guardar}
          loading={guardando}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 1,
  },
});
