import { fuentes } from '../../../theme/fuentes';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Checkbox } from '../../../components/Checkbox';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { FormField } from '../../../components/FormField';
import { Interruptor } from '../../../components/Interruptor';
import { BotonPeligro, BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { ApiError } from '../../../services/http/apiClient';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import {
  cambiarActivoDelHabito,
  crearHabitoDelPrograma,
  editarHabitoDelPrograma,
  eliminarHabitoDelPrograma,
} from '../api/habitosProgramaApi';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { ChipDeOpcion } from '../components/ChipDeOpcion';
import type { useHabitosProgramaAdmin } from '../hooks/useHabitosProgramaAdmin';
import { confirmar } from '../utils/dialogo';
import {
  alternarRol,
  cuerpoDesde,
  DIMENSIONES,
  EVIDENCIAS,
  faltaEnElFormulario,
  formularioDesde,
  hayCambios,
  LARGO_MAXIMO_DEL_TITULO,
  tieneReglasPropias,
  TIPOS,
  type FormularioDeHabito,
} from '../utils/habitosPrograma';
import { mensajeDeFallo } from '../utils/mensajes';

/** Las casillas de rol entran con un fundido corto al apagar «Para todos»; con «reducir movimiento», al instante. */
const ENTRADA_DE_LOS_ROLES = FadeIn.duration(180).easing(CURVA_SALIDA).reduceMotion(ReduceMotion.System);

/**
 * Crear o editar un hábito del programa y elegir a quién le llega (spec 001 del backend, D-264). Un cambio
 * de roles rige desde mañana en el día de cada persona; lo de hoy se respeta. Lo decide el servidor: acá
 * solo se avisa.
 *
 * `id` nulo = hábito nuevo. Nada se guarda hasta «Guardar»; salir con cambios pregunta antes.
 */
export function HabitoProgramaFormScreen({
  id,
  estado,
  onVolver,
}: {
  id: string | null;
  estado: ReturnType<typeof useHabitosProgramaAdmin>;
  onVolver: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const habito = id ? (estado.habitos?.find(h => h.id === id) ?? null) : null;
  const esNuevo = id === null;
  const original = useMemo(() => formularioDesde(habito), [habito]);
  const [formulario, setFormulario] = useState<FormularioDeHabito>(original);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'guardar' | 'activar' | 'eliminar' | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const cambiado = hayCambios(formulario, original);
  const scroll = useRef<ScrollView>(null);
  const campoNombre = useRef<TextInput>(null);

  const salir = async () => {
    if (cambiado && !(await confirmar('¿Salir sin guardar?', 'Se pierden los cambios de este hábito.', { ok: 'Salir' }))) {
      return;
    }
    onVolver();
  };

  useSystemBackHandler(() => {
    void salir();
    return true;
  });

  if (!esNuevo && !habito) return null;

  /* Editar borra el aviso de lo que faltaba (E2E 2026-10-12: «Escribe el nombre…» seguía con el nombre ya escrito). */
  const cambiar = <K extends keyof FormularioDeHabito>(campo: K, valor: FormularioDeHabito[K]) => {
    setError(null);
    setFormulario(actual => ({ ...actual, [campo]: valor }));
  };

  const avisarListo = (texto: string) => {
    tacto.logro();
    setConfirmacion({ clave: Date.now(), texto });
  };

  const guardar = async () => {
    const falta = faltaEnElFormulario(formulario, esNuevo);
    if (falta) {
      tacto.error();
      setError(falta);
      // Sin nombre: el campo está arriba, fuera de la vista. Se sube hasta él y se lo enfoca.
      if (esNuevo && !formulario.titulo.trim()) {
        scroll.current?.scrollTo({ y: 0, animated: true });
        campoNombre.current?.focus();
      }
      return;
    }
    setOcupado('guardar');
    setError(null);
    try {
      const cuerpo = cuerpoDesde(formulario, esNuevo);
      const guardado = esNuevo ? await crearHabitoDelPrograma(cuerpo) : await editarHabitoDelPrograma(id, cuerpo);
      estado.reemplazar(guardado);
      if (esNuevo) {
        onVolver();
        return;
      }
      const cambioDeRoles = cuerpo.targetRoles.join() !== cuerpoDesde(original, false).targetRoles.join();
      avisarListo(cambioDeRoles ? 'Guardado. Los roles rigen desde mañana.' : 'Guardado.');
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudo guardar el hábito. Vuelve a intentar.'));
    } finally {
      setOcupado(null);
    }
  };

  const cambiarActivo = async (activo: boolean) => {
    if (!habito) return;
    setOcupado('activar');
    setError(null);
    try {
      estado.reemplazar(await cambiarActivoDelHabito(habito.id, activo));
      avisarListo(activo ? 'Activado: vuelve a llegar a su audiencia.' : 'Desactivado: ya no le llega a nadie.');
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudo cambiar el estado. Vuelve a intentar.'));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async () => {
    if (!habito) return;
    const acepto = await confirmar('¿Eliminar este hábito?', `«${habito.title}» desaparece del programa.`, {
      ok: 'Eliminar',
      destructivo: true,
    });
    if (!acepto) return;
    setOcupado('eliminar');
    setError(null);
    try {
      await eliminarHabitoDelPrograma(habito.id);
      estado.quitar(habito.id);
      onVolver();
    } catch (e) {
      setOcupado(null);
      if (e instanceof ApiError && e.esConflicto && habito.isActive) {
        const desactivar = await confirmar('No se puede eliminar', mensajeDeFallo(e, 'Este hábito ya tiene registros.'), {
          ok: 'Desactivar',
        });
        if (desactivar) await cambiarActivo(false);
        return;
      }
      setError(mensajeDeFallo(e, 'No se pudo eliminar el hábito. Vuelve a intentar.'));
    }
  };

  const ayuda = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo={esNuevo ? 'Nuevo hábito' : habito?.title ?? ''}
        subtitulo={esNuevo ? 'Del programa, no personal' : habito?.isActive ? 'Activo' : 'Inactivo'}
        onVolver={() => void salir()}
      />
      <ScrollView
        ref={scroll}
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
          gap: 18,
        }}
      >
        {habito && tieneReglasPropias(habito) ? (
          <View style={[estilos.aviso, { backgroundColor: c.goldWash, borderColor: c.gold }]}>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>
              Este hábito tiene reglas propias en la app. Si lo restringes, los demás roles se quedan sin él.
            </Text>
          </View>
        ) : null}

        {esNuevo ? (
          <FormField
            ref={campoNombre}
            label="Nombre"
            value={formulario.titulo}
            onChangeText={v => cambiar('titulo', v.slice(0, LARGO_MAXIMO_DEL_TITULO))}
            placeholder="Ej.: Revisión del grupo"
            autoCapitalize="sentences"
            returnKeyType="next"
          />
        ) : null}
        <FormField
          label="Descripción"
          helperText="Opcional. La ve quien recibe el hábito."
          value={formulario.descripcion}
          onChangeText={v => cambiar('descripcion', v)}
          multiline
          numberOfLines={3}
        />

        <Seccion titulo="Dimensión">
          <View style={estilos.fila} accessibilityRole="radiogroup">
            {DIMENSIONES.map(d => (
              <ChipDeOpcion key={d.valor} etiqueta={d.etiqueta} activo={formulario.categoria === d.valor} onPress={() => cambiar('categoria', d.valor)} />
            ))}
          </View>
        </Seccion>

        {esNuevo ? (
          <Seccion titulo="Tipo" detalle={TIPOS.find(o => o.valor === formulario.tipo)?.detalle}>
            <View style={estilos.fila} accessibilityRole="radiogroup">
              {TIPOS.map(o => (
                <ChipDeOpcion key={o.valor} etiqueta={o.etiqueta} activo={formulario.tipo === o.valor} onPress={() => cambiar('tipo', o.valor)} />
              ))}
            </View>
          </Seccion>
        ) : null}

        <Seccion titulo="Evidencia">
          <ControlSegmentado
            rol="radio"
            accessibilityLabel="Evidencia"
            opciones={EVIDENCIAS}
            valor={formulario.evidencia}
            onCambiar={v => cambiar('evidencia', v)}
          />
        </Seccion>

        <View style={{ gap: 10 }}>
          <Checkbox title="Es opcional" subtitle="No cuenta en contra si no se hace" checked={formulario.esOpcional} onToggle={v => cambiar('esOpcional', v)} />
          <Checkbox
            title="Obligatorio en intoxicación"
            subtitle="Se exige también en los días de ciclo de intoxicación"
            checked={formulario.obligatorioEnIntoxicacion}
            onToggle={v => cambiar('obligatorioEnIntoxicacion', v)}
          />
        </View>

        <Seccion titulo="¿Para quién es?" detalle="Un cambio de roles rige desde mañana; lo de hoy se respeta.">
          <View style={[estilos.interruptor, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>Para todos los roles</Text>
              <Text style={ayuda}>También para los roles que se agreguen después.</Text>
            </View>
            <Interruptor etiqueta="Para todos los roles" valor={formulario.paraTodos} onCambiar={v => cambiar('paraTodos', v)} />
          </View>
          {!formulario.paraTodos ? (
            <Animated.View entering={ENTRADA_DE_LOS_ROLES} style={{ gap: 10 }}>
              {estado.roles.length === 0 ? (
                <Text style={ayuda}>No se pudieron cargar los roles. Vuelve a abrir la pantalla.</Text>
              ) : (
                estado.roles.map(r => (
                  <Checkbox
                    key={r.code}
                    title={r.name}
                    checked={formulario.roles.includes(r.code)}
                    onToggle={() => {
                      tacto.seleccion();
                      cambiar('roles', alternarRol(formulario.roles, r.code));
                    }}
                  />
                ))
              )}
            </Animated.View>
          ) : null}
        </Seccion>

        {error ? (
          <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
            {error}
          </Text>
        ) : null}

        <BotonPrincipal
          etiqueta={esNuevo ? 'Crear hábito' : 'Guardar'}
          onPress={() => void guardar()}
          cargando={ocupado === 'guardar'}
          deshabilitado={(!esNuevo && !cambiado) || ocupado !== null}
        />
        {confirmacion ? (
          <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} />
        ) : null}

        {habito ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <BotonSecundario
              etiqueta={habito.isActive ? 'Desactivar' : 'Activar'}
              onPress={() => void cambiarActivo(!habito.isActive)}
              cargando={ocupado === 'activar'}
              deshabilitado={ocupado !== null}
            />
            <BotonPeligro etiqueta="Eliminar" onPress={() => void eliminar()} deshabilitado={ocupado !== null} />
            <Text style={ayuda}>Solo se puede eliminar un hábito que nadie registró todavía.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Seccion({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <TituloDeSeccion detalle={detalle}>{titulo}</TituloDeSeccion>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aviso: { borderWidth: 1, borderRadius: 14, padding: 14 },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 64 },
});
