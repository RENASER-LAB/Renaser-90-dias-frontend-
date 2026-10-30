import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { InterruptorGrande } from '../../../components/InterruptorGrande';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { DIAS_DEL_PLAN, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { entradaParaElLanzador } from '../../renasia/components/lugarDelLanzador';
import { diasEnFrase } from '../../training/utils/avisoDeLosDias';
import { CodigoRenaserModal } from '../components/CodigoRenaserModal';
import { FilaDeVecesPorDia, isoDelDia } from '../components/FilaDeVecesPorDia';
import { HoraDeMiRadar } from '../components/HoraDeMiRadar';
import { SinMiRadar } from '../components/SinMiRadar';
import { VecesAlDia } from '../components/VecesAlDia';
import { useMiRadar } from '../hooks/useMiRadar';
import type { MiRadarApi, ModoDeMiRadar } from '../types/radar.types';
import {
  DIAS_ISO,
  type DiaIso,
  FUERA_DE_HORARIO,
  HOY_SIN_RADAR,
  TEXTO_DEL_PIE_DE_MI_RADAR,
  claveDeMiRadar,
  diaDeHoyDeMiRadar,
  lineaDeHoy,
  textoDelHorario,
} from '../utils/miRadar';
import { horaEnPunto, type SlotRadar } from '../utils/slotsDelRadar';
import { vistaDeMiRadar } from '../utils/vistaDeMiRadar';
import {
  type BorradorDeMiRadar,
  type VistaDeUnDia,
  botonDeLaFalta,
  cambiosParaGuardar,
  conElModo,
  conSinRadar,
  conVecesAjustadas,
  diasQueSeEditan,
  hayCambios as hayCambiosEnElBorrador,
  horaDeLosDias,
  modoQueSeMuestra,
  todosSinRadar,
  vecesDelObjetivo,
  vistaDelDia,
} from '../utils/vecesDeMiRadar';

/* «Hoy no tienes Mi Radar» y el pie del formulario viven en `utils/miRadar.ts`: la mitad del Radar de Hoy (spec 016) dice lo mismo. */
export { FUERA_DE_HORARIO, HOY_SIN_RADAR };

const SIN_CONFIG: MiRadarApi = { encendido: false, hoy: null, dias: [] };

const OPCIONES_DE_MODO = [
  { valor: 'AUTOMATICO', etiqueta: 'Automático' },
  { valor: 'PERSONALIZADO', etiqueta: 'Personalizado' },
] as const;

/**
 * Yo → Mi Radar (spec 012, rehecha por la 019): el Código Renaser de los primeros siete días, **desde el día 8 y encendido por la
 * persona**, con la forma del editor de un hábito en Planificar. Pantalla completa desde Yo.
 *
 * De arriba abajo:
 *  1. Cabecera «‹ Mi Radar» con «Ahora: 05:30 a 22:30». Sin ✕: se vuelve con la flecha y con el atrás del sistema.
 *  2. «Encendido» y el modo. **Apagado no hay nada más** (y encender y apagar rigen en el acto).
 *  3. Encendido: el modo (**Automático**: cada hora entre el Despertar y el Dormir; **Personalizado**: «Veces al día» con − / +,
 *     repartidas parejo y sin mostrar las horas), «Hora» (el horario, solo lectura) y la fila de los siete días con **solo cuántas
 *     veces pregunta cada uno**. Hoy y lo pasado van con candado y no se editan.
 *  4. «Guardar · sáb, dom», fijo abajo, con lo tocado; o «Programar mi Despertar» si falta el horario.
 *  5. «Registrar ahora» y una sola línea, «Hoy: 4 de 6» (las veces que respondió hoy de las que le tocaban). **No se muestran las
 *     respuestas de la persona** (ni «Hoy», ni «Historial», ni «Patrones»: pedido del dueño, 2026-10-30); las ven su mentor y su líder
 *     en la ficha.
 *
 * ## Cuando todavía no hay Mi Radar, la pantalla dice POR QUÉ (el 403 del servidor lleva un motivo) y no se queda callada
 *
 * Lo decide `utils/vistaDeMiRadar` y lo dibuja `components/SinMiRadar`: sin programa activado, «Mi Radar empieza en tu día 8. Primero
 * elige tu Día 1.» con «Elegir mi Día 1»; con Día 1 pero antes del día 8, cuándo empieza; cuenta suspendida o sin permiso, una línea y
 * nada más; sin red o 5xx, «No pudimos cargar Mi Radar.» con «Reintentar». Mientras llega la respuesta, «Cargando Mi Radar…»: ni el
 * motivo anterior ni la pantalla vacía.
 *
 * Con días marcados («Solo sáb, dom») el modo y las veces cambian esos días; sin marcar, todos los que vienen. El borrador es
 * lo tocado aún sin guardar y se manda SOLO lo tocado. Sin «Cómo suena»: el Radar siempre suena, una vez por hora.
 *
 * Un único scroll, el retroceso del sistema vuelve a Yo y nada se anima salvo lo que ya animan sus piezas
 * (`InterruptorGrande`, `ConfirmacionEnLinea`): se abre pocas veces al día y lo que cambia se tiene que leer en el acto.
 *
 * `abrirDesdeAviso`: se llegó tocando un aviso del teléfono. Si la hora en curso es de Mi Radar y todavía no tiene registro,
 * además abre el formulario. `onProgramarHorario`: lleva a Training, donde se programan el Despertar y el Dormir.
 */
export function MiRadarScreen({
  onVolver,
  abrirDesdeAviso = false,
  onProgramarHorario,
  diaPrograma = null,
}: {
  onVolver: () => void;
  abrirDesdeAviso?: boolean;
  onProgramarHorario?: () => void;
  /** El día del programa (`/home`; `null` = no se sabe): con Mi Radar leído y antes del día 8, la pantalla dice cuándo empieza. */
  diaPrograma?: number | null;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const mi = useMiRadar();
  const { config, historial } = mi;

  const guardado = config ?? SIN_CONFIG;
  /* Los días marcados (vacío = «Todos los días») y lo que se tocó para los días que se editan, aún sin guardar. */
  const [diasMarcados, setDiasMarcados] = useState<DiaDelPlan[]>([]);
  const [borrador, setBorrador] = useState<BorradorDeMiRadar>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [pidioElAviso, setPidioElAviso] = useState(abrirDesdeAviso);

  /* Lo guardado manda: al leerlo de nuevo con algo distinto (otro teléfono, otro horario) o después de guardar, lo que se ve es eso. */
  const claveGuardada = claveDeMiRadar(guardado);
  useEffect(() => {
    setDiasMarcados([]);
    setBorrador({});
    setAviso(null);
    // Se reinicia solo cuando lo guardado cambia de verdad, no cada vez que se lee igual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveGuardada]);

  /* Venir de un aviso: el formulario se abre una sola vez, cuando ya se sabe si esta hora tiene registro. */
  useEffect(() => {
    if (!pidioElAviso || historial.cargando) return;
    setPidioElAviso(false);
    if (mi.horaEnCursoPendiente && mi.dentroDelHorario) setFormularioAbierto(true);
  }, [pidioElAviso, historial.cargando, mi.horaEnCursoPendiente, mi.dentroDelHorario]);

  useSystemBackHandler(() => {
    if (!mi.guardando) onVolver();
    return true;
  });

  const confirmar = (texto: string) => {
    tacto.logro();
    setConfirmacion({ clave: Date.now(), texto });
  };

  /* Encender y apagar rigen en el acto: son el permiso de la persona, no un día. */
  const alCambiarElInterruptor = async (nuevo: boolean) => {
    setAviso(null);
    const resultado = await mi.guardarConfig(nuevo);
    if (resultado.ok) confirmar(nuevo ? 'Mi Radar encendido' : 'Mi Radar apagado');
    else {
      tacto.error();
      setAviso(resultado.error);
    }
  };

  /* ---- Lo que se edita: los días marcados o, sin marcar, todos los que vienen. Hoy y lo pasado nunca. ---- */
  const enModoDias = diasMarcados.length > 0;
  const marcadosIso = useMemo(() => diasMarcados.map(isoDelDia), [diasMarcados]);
  const objetivo = useMemo(() => diasQueSeEditan(guardado, marcadosIso), [guardado, marcadosIso]);
  const frase = diasEnFrase(diasMarcados);
  const vistas = useMemo(
    () => DIAS_ISO.map(d => vistaDelDia(guardado, d, borrador)).filter((v): v is VistaDeUnDia => v !== null),
    [guardado, borrador],
  );
  const modo = modoQueSeMuestra(guardado, objetivo, borrador);
  const veces = vecesDelObjetivo(guardado, objetivo, borrador);
  const hoy = diaDeHoyDeMiRadar(guardado, mi.ahora);
  /* «Hora» y «Ahora:» hablan de los días marcados o, sin marcar, de hoy. */
  const diasDeLaHora: DiaIso[] = enModoDias ? marcadosIso : hoy ? [hoy.dia as DiaIso] : [];
  const hora = horaDeLosDias(guardado, diasDeLaHora);
  const hayCambios = hayCambiosEnElBorrador(guardado, objetivo, borrador);
  const sinRadar = todosSinRadar(guardado, objetivo, borrador);
  const algunoSinRadar = objetivo.some(d => vistaDelDia(guardado, d, borrador)?.sinRadar);
  const subtitulo = (() => {
    const dia = enModoDias ? guardado.dias.find(d => d.dia === marcadosIso[0]) : hoy;
    const horario = dia ? textoDelHorario(dia) : null;
    return guardado.encendido && horario ? `Ahora: ${horario}` : null;
  })();

  const alAlternarUnDia = (dia: DiaDelPlan) => {
    tacto.seleccion();
    setAviso(null);
    setDiasMarcados(previos =>
      previos.includes(dia) ? previos.filter(d => d !== dia) : DIAS_DEL_PLAN.filter(d => d === dia || previos.includes(d)),
    );
  };
  /* Pasar de «todos los días» a días marcados (y de vuelta) cambia el alcance: lo tocado para unos no se lleva a otros. */
  useEffect(() => {
    setBorrador({});
  }, [enModoDias]);

  const alCambiarElModo = (nuevo: ModoDeMiRadar) => {
    if (nuevo === modo) return;
    setAviso(null);
    setBorrador(previo => conElModo(objetivo, previo, nuevo));
  };

  const alAjustarLasVeces = (delta: 1 | -1) => {
    setAviso(null);
    setBorrador(previo => conVecesAjustadas(guardado, objetivo, previo, delta));
  };

  const alCambiarSinRadar = (nuevo: boolean) => {
    setAviso(null);
    setBorrador(previo => conSinRadar(objetivo, previo, nuevo));
  };

  const alGuardar = async () => {
    setAviso(null);
    const resultado = await mi.guardarConfig(true, cambiosParaGuardar(guardado, objetivo, borrador));
    if (!resultado.ok) {
      tacto.error();
      setAviso(resultado.error);
      return;
    }
    confirmar(`Guardado · ${enModoDias ? frase : 'todos los días'}`);
    setBorrador({});
    setDiasMarcados([]);
  };

  const slotDeAhora = useMemo<SlotRadar>(() => {
    const h = mi.ahora.getHours();
    return { hora: h, etiqueta: horaEnPunto(h), cierraA: horaEnPunto(h + 1) };
  }, [mi.ahora]);

  /* El botón fijo de abajo: lo tocado, o —si falta el Despertar o el Dormir— llevar a programarlo. */
  const falta = hora?.tipo === 'falta' ? hora.motivo : null;
  const hoyLinea = guardado.encendido ? lineaDeHoy(guardado, historial.registros, mi.ahora) : null;
  const textoDelBotonFijo = hayCambios ? `Guardar · ${enModoDias ? frase : 'todos los días'}` : falta ? botonDeLaFalta(falta) : null;

  /* Todavía no hay Mi Radar que editar: se dice por qué (y, si hay algo que hacer, se ofrece) en vez de mostrar un formulario vacío. */
  const vista = vistaDeMiRadar(mi.lectura, diaPrograma, mi.ahora);
  if (vista.tipo !== 'editor') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <CabeceraAdmin titulo="Mi Radar" onVolver={onVolver} />
        {/* `reiniciarConfig` es estable: el selector del Día 1 se abre en un Modal que vuelve a cargar si su `onActivado` cambia. */}
        <SinMiRadar vista={vista} alElegirElDiaUno={mi.reiniciarConfig} alReintentar={mi.reiniciarConfig} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Mi Radar" subtitulo={subtitulo} onVolver={onVolver} />
      {confirmacion ? (
        <View style={{ paddingHorizontal: horizontalPadding, paddingBottom: 8 }}>
          <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} />
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
        <InterruptorGrande
          etiqueta="Encendido"
          descripcion=""
          valor={guardado.encendido}
          onCambiar={nuevo => void alCambiarElInterruptor(nuevo)}
          deshabilitado={mi.guardando || config === null}
        />

        {guardado.encendido ? (
          <>
            <ControlSegmentado
              opciones={OPCIONES_DE_MODO}
              valor={modo}
              onCambiar={alCambiarElModo}
              rol="radio"
              accessibilityLabel="Modo de Mi Radar"
              sinAnimacion
            />

            {hora ? <HoraDeMiRadar hora={hora} /> : null}

            {modo === 'PERSONALIZADO' && veces ? (
              <VecesAlDia
                veces={veces.veces}
                noBaja={veces.noBaja}
                noSube={veces.noSube}
                alBajar={() => alAjustarLasVeces(-1)}
                alSubir={() => alAjustarLasVeces(1)}
                deshabilitado={mi.guardando}
              />
            ) : null}

            <FilaDeVecesPorDia
              vistas={vistas}
              marcados={diasMarcados}
              frase={frase}
              alAlternarDia={alAlternarUnDia}
              alVolverATodos={() => {
                setAviso(null);
                setDiasMarcados([]);
              }}
            />

            {enModoDias ? (
              <InterruptorGrande
                etiqueta="Sin Radar estos días"
                descripcion=""
                valor={sinRadar ? true : algunoSinRadar ? 'varia' : false}
                onCambiar={alCambiarSinRadar}
                deshabilitado={mi.guardando}
              />
            ) : null}

            {aviso ? (
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
                {aviso}
              </Text>
            ) : null}

            {hoyLinea ? (
              <Text
                accessibilityLabel={hoyLinea.lectorDePantalla}
                style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23, fontVariant: ['tabular-nums'] }]}
              >
                {hoyLinea.texto}
              </Text>
            ) : null}

            <View style={{ gap: 12 }}>
              {!mi.hoyTieneRadar ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{HOY_SIN_RADAR}</Text>
              ) : !mi.dentroDelHorario ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{FUERA_DE_HORARIO}</Text>
              ) : mi.yaRegistroEstaHora ? (
                <View style={estilos.fila}>
                  <Icon name="checkCircle" size={TAMANO_ICONO.normal} color={c.success} />
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16, flex: 1 }]}>Ya registraste esta hora</Text>
                </View>
              ) : (
                <BotonPrincipal etiqueta="Registrar ahora" icono="compass" onPress={() => setFormularioAbierto(true)} />
              )}
            </View>

          </>
        ) : null}

        {Platform.OS === 'web' ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
            En la web no suenan avisos: los recibes en la app del teléfono.
          </Text>
        ) : null}
      </ScrollView>

      {guardado.encendido && textoDelBotonFijo ? (
        <View
          style={[
            estilos.fijo,
            { backgroundColor: c.bg, borderTopColor: c.border, paddingHorizontal: horizontalPadding },
          ]}
        >
          <View
            style={{
              width: '100%',
              maxWidth: contentMaxWidth,
              alignSelf: 'center',
              // El botón flotante de SER queda a la derecha, a esta altura: el botón de guardar no se mete debajo.
              paddingRight: entradaParaElLanzador(horizontalPadding),
            }}
          >
            <BotonPrincipal
              etiqueta={mi.guardando ? 'Guardando…' : textoDelBotonFijo}
              onPress={hayCambios ? () => void alGuardar() : () => onProgramarHorario?.()}
              cargando={mi.guardando}
            />
          </View>
        </View>
      ) : null}

      <CodigoRenaserModal
        visible={formularioAbierto}
        slot={slotDeAhora}
        obligatorio={false}
        usuarioId={mi.usuarioId}
        enviando={mi.enviando}
        error={mi.errorAlRegistrar}
        onEnviar={mi.registrar}
        onCerrar={() => setFormularioAbierto(false)}
        onLimpiarError={mi.limpiarErrorAlRegistrar}
        textoDelPie={TEXTO_DEL_PIE_DE_MI_RADAR}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fijo: { paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
