import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { InterruptorGrande } from '../../../components/InterruptorGrande';
import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { DIAS_DEL_PLAN, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import { diaLargo } from '../../mentor/utils/fechasLegibles';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { diasEnFrase } from '../../training/utils/avisoDeLosDias';
import { CodigoRenaserModal } from '../components/CodigoRenaserModal';
import { DiasDeMiRadar, isoDelDia } from '../components/DiasDeMiRadar';
import { HorariosDeMiRadar } from '../components/HorariosDeMiRadar';
import { HorasDeLosDias } from '../components/HorasDeLosDias';
import { RegistroDeMiRadar } from '../components/RegistroDeMiRadar';
import { MI_RADAR } from '../config/configRadar';
import { useMiRadar } from '../hooks/useMiRadar';
import type { DiaDeMiRadarApi, MiRadarApi } from '../types/radar.types';
import {
  type BorradorDeLosDias,
  algunDiaTienePropias,
  aplicarAlosDias,
  dejarComoLosDemas,
  errorDeLosDias,
  hayCambiosEnLosDias,
  textoDelBotonDeLosDias,
  vistaDeLosDias,
} from '../utils/diasDeMiRadar';
import {
  FUERA_DE_HORARIO,
  HOY_SIN_RADAR,
  MENSAJE_DEMASIADAS_HORAS,
  TEXTO_DEL_PIE_DE_MI_RADAR,
  type PatronesDeMiRadar,
  alternarHora,
  claveDeMiRadar,
  textoDeEnergia,
  textoDeEvitar,
  textoDeLasHoras,
  textoSinPatrones,
} from '../utils/miRadar';
import { horaEnPunto, type SlotRadar } from '../utils/slotsDelRadar';

/** Lo que dice la pantalla de quién puede leer lo que se registra: nunca «solo tú» (FR-016). */
export const QUIEN_LO_VE = 'Lo ves tú, tu mentor y el equipo que coordina tu grupo.';
/* «Hoy no tienes Mi Radar» y el pie del formulario viven en `utils/miRadar.ts`: la mitad del Radar de Hoy (spec 016) dice lo mismo. */
export { FUERA_DE_HORARIO, HOY_SIN_RADAR };

const SIN_CONFIG: MiRadarApi = { encendido: false, horas: [], dias: [] };

/**
 * Yo → Mi Radar (spec 012, pedido del dueño del 2026-10-29): el Código Renaser de los primeros siete días, **desde el
 * día 8 y encendido por la persona**. Pantalla completa desde Yo, como «Tuve una emergencia».
 *
 * De arriba abajo:
 *  1. El interruptor «Mi Radar». **Apagado no hay registrar ni horarios**: es lo primero y lo único (FR-010).
 *  2. Encendido, «Registrar ahora» (el formulario de siempre, que se puede cerrar; en un día sin Radar, «Hoy no tienes Mi
 *     Radar»), «Hoy» (las horas de hoy que ya pasaron con su registro o «Sin registro», en orden de hora, en gris y sin
 *     palabras de falta) y los horarios.
 *  3. Siempre: el historial por día y los patrones. Apagarlo no borra nada.
 *
 * ## Los horarios, por día de la semana (cuarta ronda, 2026-10-29)
 *
 * La forma de «Planificar» de los hábitos, que la persona ya conoce: la fila de los siete días y, debajo, las horas.
 * **Sin días marcados** («Todos los días») se eligen las horas de siempre y se guardan con «Guardar horarios» /
 * «Guardar y encender». **Con días marcados** («Solo sáb, dom») se elige «Sin Radar» o las horas propias de esos días y se
 * guarda con «Guardar horas · sáb, dom»: solo lo tocado, y un día que queda igual que todos vuelve a seguirlos. Los dos
 * modos tienen su propio borrador y no se mezclan. «Dejar sáb como los demás días» le quita lo propio.
 *
 * **Encender se guarda con «Guardar»**: el interruptor muestra las horas sugeridas (09:00, 14:00 y 20:00) para cambiarlas
 * antes. **Apagar es inmediato.** Las reglas de las horas se validan acá y el servidor las vuelve a validar.
 *
 * Un único scroll, el retroceso del sistema vuelve a Yo y nada se anima salvo lo que ya animan sus piezas
 * (`InterruptorGrande`, `ConfirmacionEnLinea`): se abre pocas veces al día y lo que cambia se tiene que leer en el acto.
 *
 * `abrirDesdeAviso`: se llegó tocando un aviso del teléfono. Si la hora en curso es una de las elegidas y todavía no
 * tiene registro, además abre el formulario.
 */
export function MiRadarScreen({ onVolver, abrirDesdeAviso = false }: { onVolver: () => void; abrirDesdeAviso?: boolean }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const mi = useMiRadar();
  const { config, historial } = mi;

  const guardado = config ?? SIN_CONFIG;
  /* Lo que se está eligiendo, aún sin guardar. Encendido, parte de lo guardado; apagado, de las sugeridas. */
  const [encendido, setEncendido] = useState(guardado.encendido);
  const [elegidas, setElegidas] = useState<number[]>(guardado.encendido ? guardado.horas : [...MI_RADAR.horasSugeridas]);
  /* Los días marcados para darles horas propias (vacío = «Todos los días») y lo que se tocó para ellos, aún sin guardar. */
  const [diasMarcados, setDiasMarcados] = useState<DiaDelPlan[]>([]);
  const [borrador, setBorrador] = useState<BorradorDeLosDias>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [pidioElAviso, setPidioElAviso] = useState(abrirDesdeAviso);

  /* Lo guardado manda: al leerlo de nuevo (otro teléfono) o después de guardar, lo que se ve es eso. */
  const claveGuardada = claveDeMiRadar(guardado);
  useEffect(() => {
    setEncendido(guardado.encendido);
    setElegidas(guardado.encendido ? guardado.horas : [...MI_RADAR.horasSugeridas]);
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

  /** Apagar rige en el acto; encender solo muestra las horas, que se guardan con «Guardar». */
  const alCambiarElInterruptor = async (nuevo: boolean) => {
    setAviso(null);
    if (nuevo) {
      setEncendido(true);
      return;
    }
    if (!guardado.encendido) {
      setEncendido(false);
      setDiasMarcados([]);
      return;
    }
    const resultado = await mi.guardarConfig(false, []);
    if (resultado.ok) confirmar('Mi Radar apagado');
    else setAviso(resultado.error);
  };

  const alAlternarUnaHora = (hora: number) => {
    if (!elegidas.includes(hora) && elegidas.length >= MI_RADAR.maximoDeHoras) {
      tacto.error();
      setAviso(MENSAJE_DEMASIADAS_HORAS);
      return;
    }
    setAviso(null);
    setElegidas(alternarHora(elegidas, hora));
  };

  const guardarHorarios = async () => {
    setAviso(null);
    const yaEstabaEncendido = guardado.encendido;
    // Las horas de todos los días; los días con horas propias que ya había se conservan tal cual.
    const resultado = await mi.guardarConfig(true, elegidas, guardado.dias ?? []);
    if (!resultado.ok) {
      tacto.error();
      setAviso(resultado.error);
      return;
    }
    confirmar(`${yaEstabaEncendido ? 'Horarios guardados' : 'Mi Radar encendido'} · ${textoDeLasHoras(resultado.config.horas)}`);
  };

  /* «Guardar» solo cuando hay algo que guardar: encender, o cambiar las horas de un Mi Radar ya encendido. */
  const hayCambios = encendido && (!guardado.encendido || elegidas.join() !== guardado.horas.join());

  /* ---- Días marcados: horas propias o «Sin Radar» ---- */
  const enModoDias = diasMarcados.length > 0;
  const marcados = useMemo(() => diasMarcados.map(isoDelDia), [diasMarcados]);
  const frase = diasEnFrase(diasMarcados);
  /* Las horas de todos los días sobre las que se editan los días: las guardadas o, si aún no está encendido, las que se
     están eligiendo. Los días propios son siempre los guardados. */
  const base = useMemo<MiRadarApi>(
    () => ({ encendido: true, horas: guardado.encendido ? guardado.horas : elegidas, dias: guardado.dias ?? [] }),
    [guardado.encendido, guardado.horas, guardado.dias, elegidas],
  );
  const vista = useMemo(() => vistaDeLosDias(base, marcados, borrador), [base, marcados, borrador]);
  const errorDelBorrador = errorDeLosDias(borrador);
  const hayCambiosEnDias = enModoDias && (hayCambiosEnLosDias(base, marcados, borrador) || errorDelBorrador !== null);

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

  const volverATodos = () => {
    setAviso(null);
    setDiasMarcados([]);
  };

  const alCambiarSinRadar = (nuevo: boolean) => {
    setAviso(null);
    setBorrador(previo => ({ ...previo, sin: nuevo }));
  };

  const alAlternarUnaHoraDeLosDias = (hora: number) => {
    if (!vista.horas.includes(hora) && vista.horas.length >= MI_RADAR.maximoDeHoras) {
      tacto.error();
      setAviso(MENSAJE_DEMASIADAS_HORAS);
      return;
    }
    setAviso(null);
    setBorrador(previo => ({ ...previo, horas: alternarHora(vista.horas, hora) }));
  };

  /** Guarda los días con lo tocado; si Mi Radar aún está apagado, lo enciende con las horas que se están eligiendo. */
  const guardarLosDias = async (dias: DiaDeMiRadarApi[], texto: (yaEstabaEncendido: boolean) => string) => {
    setAviso(null);
    const yaEstabaEncendido = guardado.encendido;
    const resultado = await mi.guardarConfig(true, base.horas, dias);
    if (!resultado.ok) {
      tacto.error();
      setAviso(resultado.error);
      return;
    }
    confirmar(texto(yaEstabaEncendido));
    setBorrador({});
    setDiasMarcados([]);
  };

  const alGuardarLosDias = () => {
    if (errorDelBorrador) {
      tacto.error();
      setAviso(errorDelBorrador);
      return;
    }
    void guardarLosDias(aplicarAlosDias(base, marcados, borrador), yaEstabaEncendido =>
      yaEstabaEncendido ? `Guardado para ${frase}.` : `Mi Radar encendido · guardado para ${frase}.`,
    );
  };

  const alDejarComoLosDemas = () => {
    void guardarLosDias(dejarComoLosDemas(base, marcados), () => `Quedó igual que los demás días: ${frase}.`);
  };

  const slotDeAhora = useMemo<SlotRadar>(() => {
    const hora = mi.ahora.getHours();
    return { hora, etiqueta: horaEnPunto(hora), cierraA: horaEnPunto(hora + 1) };
  }, [mi.ahora]);

  const diasAnteriores = useMemo(() => {
    // Con Mi Radar encendido lo de hoy ya está arriba, en «Hoy»: no se repite en el historial.
    const hoyIso = `${mi.ahora.getFullYear()}-${String(mi.ahora.getMonth() + 1).padStart(2, '0')}-${String(mi.ahora.getDate()).padStart(2, '0')}`;
    return guardado.encendido ? historial.dias.filter(d => d.fecha !== hoyIso) : historial.dias;
  }, [historial.dias, guardado.encendido, mi.ahora]);

  /* Los días, las horas (de todos o de los marcados), su aviso, el botón de guardar y la nota de la web. */
  const horarios = (
    <View style={{ gap: 12 }}>
      <TituloDeSeccion detalle={`De ${horaEnPunto(MI_RADAR.primeraHora)} a ${horaEnPunto(MI_RADAR.ultimaHora)}, hasta ${MI_RADAR.maximoDeHoras} horas por día.`}>
        Tus horas
      </TituloDeSeccion>
      <DiasDeMiRadar
        base={base}
        marcados={diasMarcados}
        frase={frase}
        alAlternarDia={alAlternarUnDia}
        alVolverATodos={volverATodos}
      />
      {enModoDias ? (
        <HorasDeLosDias
          vista={vista}
          cuantosDias={diasMarcados.length}
          frase={frase}
          alCambiarSinRadar={alCambiarSinRadar}
          alAlternarHora={alAlternarUnaHoraDeLosDias}
          deshabilitado={mi.guardando}
          ofreceDejarComoLosDemas={algunDiaTienePropias(base, marcados)}
          alDejarComoLosDemas={alDejarComoLosDemas}
        />
      ) : (
        <HorariosDeMiRadar elegidas={elegidas} alAlternar={alAlternarUnaHora} deshabilitado={mi.guardando} />
      )}
      {aviso ? (
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
          {aviso}
        </Text>
      ) : null}
      {enModoDias ? (
        hayCambiosEnDias ? (
          <BotonPrincipal
            etiqueta={textoDelBotonDeLosDias({ guardando: mi.guardando, frase, enciende: !guardado.encendido })}
            onPress={alGuardarLosDias}
            cargando={mi.guardando}
          />
        ) : null
      ) : hayCambios ? (
        <BotonPrincipal
          etiqueta={mi.guardando ? 'Guardando…' : guardado.encendido ? 'Guardar horarios' : 'Guardar y encender'}
          onPress={() => void guardarHorarios()}
          cargando={mi.guardando}
        />
      ) : null}
      {Platform.OS === 'web' ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          En la web no suenan avisos: los recibes en la app del teléfono.
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Mi Radar" onVolver={onVolver} />
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
          gap: 22,
        }}
      >
        <View style={{ gap: 6 }}>
          <InterruptorGrande
            etiqueta="Mi Radar"
            descripcion="Te preguntamos cómo estás a las horas que elijas."
            valor={encendido}
            onCambiar={nuevo => void alCambiarElInterruptor(nuevo)}
            deshabilitado={mi.guardando}
          />
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{QUIEN_LO_VE}</Text>
        </View>

        {/* Encender solo muestra las horas; ya encendido, van después de registrar y de lo de hoy. */}
        {encendido && !guardado.encendido ? horarios : null}

        {guardado.encendido ? (
          <>
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

            <View style={{ gap: 10 }}>
              <TituloDeSeccion>Hoy</TituloDeSeccion>
              {mi.hoy.length === 0 ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                  Aquí verás tus registros de hoy.
                </Text>
              ) : (
                mi.hoy.map(e =>
                  e.tipo === 'registro' ? (
                    <RegistroDeMiRadar key={e.registro.id} registro={e.registro} />
                  ) : (
                    <Text key={`sin-${e.hora}`} style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                      {horaEnPunto(e.hora)} · Sin registro
                    </Text>
                  ),
                )
              )}
            </View>

            {horarios}
          </>
        ) : null}

        <View style={{ gap: 10 }}>
          <TituloDeSeccion>Historial</TituloDeSeccion>
          {historial.cargando && historial.registros.length === 0 ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Cargando tus registros…</Text>
          ) : historial.fallo ? (
            <View style={{ gap: 10 }}>
              <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                No pudimos cargar tus registros.
              </Text>
              <BotonSecundario etiqueta="Reintentar" onPress={() => void historial.recargar(false)} />
            </View>
          ) : diasAnteriores.length === 0 ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
              {historial.registros.length === 0 ? 'Todavía no tienes registros.' : 'No hay registros de otros días.'}
            </Text>
          ) : (
            diasAnteriores.map(dia => (
              <View key={dia.fecha ?? 'sin-fecha'} style={{ gap: 8, marginTop: 4 }}>
                <Text style={[t.body, { color: c.text, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>
                  {dia.fecha ? diaLargo(dia.fecha) : 'Sin fecha'}
                </Text>
                {dia.registros.map(({ registro }) => (
                  <RegistroDeMiRadar key={registro.id} registro={registro} />
                ))}
              </View>
            ))
          )}
          {historial.hayMas ? (
            <BotonSecundario
              etiqueta="Ver más"
              onPress={() => void historial.cargarMas()}
              cargando={historial.cargandoMas}
              accessibilityLabel="Ver registros anteriores"
            />
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <TituloDeSeccion>Patrones</TituloDeSeccion>
          <Patrones patrones={mi.patrones} />
        </View>
      </ScrollView>

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

/** Lo que se descubre en los registros, cada cosa con los registros en que se apoya. Nada se puntúa ni se juzga. */
function Patrones({ patrones }: { patrones: PatronesDeMiRadar }) {
  const { c, t } = useTheme();
  const linea = (texto: string) => (
    <Text key={texto} style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
      {texto}
    </Text>
  );
  if (!patrones.hayPatrones) {
    return <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{textoSinPatrones(patrones.registros)}</Text>;
  }
  const lineas = [
    patrones.masEnergia ? linea(textoDeEnergia('mas', patrones.masEnergia)) : null,
    patrones.menosEnergia ? linea(textoDeEnergia('menos', patrones.menosEnergia)) : null,
    patrones.evitando ? linea(textoDeEvitar(patrones.evitando)) : null,
  ].filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {lineas.length > 0 ? (
        lineas
      ) : (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          Todavía no se ve un patrón en tus {patrones.registros} registros.
        </Text>
      )}
      {patrones.evitando ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          Lo último que evitabas: «{patrones.evitando.ejemplo}»
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
