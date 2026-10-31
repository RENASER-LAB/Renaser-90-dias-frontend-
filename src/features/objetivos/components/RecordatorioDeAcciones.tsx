import { fuentes } from '../../../theme/fuentes';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Interruptor } from '../../../components/Interruptor';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { preferenciasDeAlarmas } from '../../alarmas/preferenciasDeAlarmas';
import type { SonidoDeAlarma } from '../../alarmas/sonidoDeAlarma';
import { FilaDeDiasDelPlan } from '../../habits/components/FilaDeDiasDelPlan';
import { HoraPickerModal } from '../../habits/components/HoraPickerModal';
import { HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import { etiquetaDeAntelacion } from '../../habits/utils/etiquetaDeAntelacion';
import type { ClaveDeLaCombinacion } from '../../habits/notificaciones/utils/combinacionDeAlarma';
import { DIAS_DEL_PLAN, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import { SeccionComoSuena } from '../../training/components/SeccionComoSuena';
import { diasEnFrase, resumenDelAvisoDelDia } from '../../training/utils/avisoDeLosDias';
import {
  alTocarUnaFila,
  hayCambios as hayCambiosEnComoSuena,
  mensajesEnLinea,
  reglaIncumplidaDeLaSeleccion,
  resumenDeLaCombinacion,
} from '../../training/utils/comoSuena';
import * as objetivosApi from '../api/objetivosApi';
import { useAlarmasAlDiaConLasAcciones } from '../hooks/useAlarmasAlDiaConLasAcciones';
import { huellaDelDiario, planDelRecordatorioDiario } from '../notificaciones/planDelDiario';
import {
  FILAS_DE_COMO_SUENA_DE_LAS_ACCIONES,
  motivoDeAtenuacionDeLasAcciones,
} from '../notificaciones/comoSuenaDeLasAcciones';
import {
  conCambios,
  dejarComoLosDemas,
  hayAvisoEnAlgunDia,
  hayDiarioEnAlgunDia,
  huellaDeLosAvisos,
  resolverLaSemana,
  type PreferenciasDeAcciones,
} from '../notificaciones/preferenciasPorDia';
import {
  ANTELACIONES_DE_ACCIONES,
  cancelarTodasLasAlarmasDeAcciones,
  guardarPreferenciasDeAcciones,
  leerAccionesAgendadas,
  pedirPermisoDeAvisos,
  ponerElRecordatorioDiario,
  preferenciasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  sincronizarAlarmasDeAcciones,
} from '../notificaciones/recordatoriosDeAcciones';
import {
  ajustesEnEdicion,
  cambioDelBorrador,
  hayCambiosPorGuardar,
  vistaDelRecordatorio,
  type Borrador,
} from '../notificaciones/vistaDelRecordatorio';
import type { RocaDiariaApi } from '../types/objetivos.types';

const SIN_PERMISO = 'Este teléfono no tiene permiso para avisarte. Actívalo en los ajustes del teléfono.';

/** Las acciones corren los siete días: ningún día de la fila está de más. */
const CORRE_TODOS_LOS_DIAS: Record<DiaDelPlan, boolean> = {
  LUN: true, MAR: true, 'MIÉ': true, JUE: true, VIE: true, 'SÁB': true, DOM: true,
};

/** El día de la pantalla (LUN … DOM) como día ISO (1 … 7). */
const isoDelDia = (dia: DiaDelPlan) => (DIAS_DEL_PLAN.indexOf(dia) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Los recordatorios de las acciones de los objetivos (2026-09-26): el diario («Recordarme mis
 * acciones del día», con hora y encendido/apagado) y el aviso antes de cada acción con hora. Vive en
 * Plan, en la tarjeta de las acciones del día, y en Yo → Alarmas: es el mismo control y la misma
 * preferencia (en este teléfono). La lógica está en `notificaciones/recordatoriosDeAcciones.ts`.
 *
 * ## Por día de la semana (spec 010, 2026-10-20)
 *
 * Con la fila de los siete días de los hábitos (`FilaDeDiasDelPlan`, la misma de «Planificar») se marca uno o varios
 * días y todo lo de abajo —recordatorio diario, hora y aviso— pasa a valer solo para ellos; los demás siguen la
 * configuración general. Dos modos, como el editor de Planificar:
 *
 * - **Sin días marcados** (la general): cada toque se guarda en el acto, como siempre.
 * - **Con días marcados**: lo que se toca queda en un borrador y se guarda con «Guardar cambios · sáb, dom». Se guarda
 *   SOLO lo tocado (`conCambios`): la hora que no se movió y el aviso que no se eligió siguen como cada día los tenía.
 *
 * El día de hoy y los pasados van con candado (la misma regla que los hábitos): «rige desde la próxima vez». Con días
 * marcados que tienen avisos distintos no se marca ninguna opción y una línea lo dice.
 *
 * Con `rocas` (Plan ya las tiene), cada vez que la lista cambia se ponen al día las alarmas de cada
 * acción. Sin `rocas` (Yo), las lee al cambiar el aviso.
 *
 * En web y en Expo Go no hay alarmas locales: no pinta nada.
 */
export function RecordatorioDeAcciones({
  userId,
  rocas,
  tonoDeYo: tonoQueLlega,
  sincronizarConLaLista = true,
}: {
  userId: string;
  rocas?: RocaDiariaApi[];
  /**
   * Con `rocas`, poner al día las alarmas de cada acción cuando la lista cambia (por defecto, sí). Plan lo apaga: lo hace
   * `useAlarmasAlDiaConLasAcciones` en la pantalla, que siempre está, y no cuando la hoja con este control se abre.
   */
  sincronizarConLaLista?: boolean;
  /**
   * El tono de Yo → Alarmas, si la pantalla ya lo tiene (Yo lo tiene y lo cambia en la misma pantalla). Sin él, se lee al
   * abrir. Decide qué avisa «Cómo suena»: con el tono «Voz» la voz ya habla; con «Solo vibrar» el sonido no suena.
   */
  tonoDeYo?: SonidoDeAlarma;
}) {
  const { c } = useTheme();
  const [prefs, setPrefs] = useState<PreferenciasDeAcciones>(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO);
  // Lo último que se guardó, al instante (no espera al próximo dibujo): quien toca dos veces seguidas parte de lo último.
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const [diasEnEdicion, setDiasEnEdicion] = useState<DiaDelPlan[]>([]);
  const [borrador, setBorrador] = useState<Borrador>({});
  const [eligiendoHora, setEligiendoHora] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const [tonoLeido, setTonoLeido] = useState<SonidoDeAlarma>('sistema');
  const tonoDeYo = tonoQueLlega ?? tonoLeido;

  useEffect(() => {
    if (!HAY_RECORDATORIOS_LOCALES) return;
    void preferenciasDeAcciones(userId).then(setPrefs);
    void preferenciasDeAlarmas(userId).then(p => setTonoLeido(p.sonido)).catch(() => undefined);
  }, [userId]);

  // Poner al día las alarmas de cada acción cuando la lista cambia. Plan lo hace por fuera (la fila «Recordatorios de tus
  // acciones» abre este control en una hoja, y con la hoja cerrada no está dibujado): ahí va `sincronizarConLaLista={false}`.
  useAlarmasAlDiaConLasAcciones(userId, sincronizarConLaLista ? rocas : undefined);

  const marcados = useMemo(() => diasEnEdicion.map(isoDelDia), [diasEnEdicion]);
  const enModoDias = marcados.length > 0;
  // Al pasar de «todos los días» a días marcados (y de vuelta) el alcance cambia: lo tocado para unos días no se lleva a otros.
  useEffect(() => {
    setBorrador({});
  }, [enModoDias]);

  const semana = useMemo(() => resolverLaSemana(prefs), [prefs]);
  const vista = useMemo(() => vistaDelRecordatorio(prefs, marcados, borrador), [prefs, marcados, borrador]);
  const hayCambios = enModoDias && hayCambiosPorGuardar(prefs, marcados, borrador);
  const frase = diasEnFrase(diasEnEdicion);

  // «Cómo suena» (spec 010): las combinaciones de lo que se está editando y las reglas sobre lo tocado.
  const combinaciones = useMemo(() => ajustesEnEdicion(prefs, marcados).map(d => d.alarma), [prefs, marcados]);
  const reglaDeComoSuena = reglaIncumplidaDeLaSeleccion(combinaciones, borrador.alarma ?? {});

  const anunciar = (texto: string) => setConfirmacion({ clave: Date.now(), texto });

  /** Las alarmas de aviso de cada acción, rehechas con las preferencias nuevas: así «Sin aviso» no deja ninguna sonando. */
  const rehacerLosAvisos = useCallback(
    async (nuevas: PreferenciasDeAcciones) => {
      try {
        await cancelarTodasLasAlarmasDeAcciones(userId);
        if (!hayAvisoEnAlgunDia(nuevas)) return;
        const leidas = await leerAccionesAgendadas({
          agendadas: objetivosApi.obtenerRocasAgendadas,
          hoy: objetivosApi.obtenerRocasDeHoy,
          manana: objetivosApi.obtenerRocasDeManana,
        });
        if (leidas) await sincronizarAlarmasDeAcciones(userId, leidas.rocas, { fechasDeLaLista: leidas.fechas });
        else if (rocas) await sincronizarAlarmasDeAcciones(userId, rocas);
      } catch {
        // Sin red: se ponen la próxima vez que la app lea las acciones.
      }
    },
    [userId, rocas],
  );

  /**
   * Guarda las preferencias nuevas y deja las alarmas como dicen. Solo toca lo que cambió: el recordatorio diario si
   * cambió algo suyo y los avisos de las acciones si cambió algún aviso. Si hace falta alarmas y el teléfono no da
   * permiso, no cambia nada y lo dice. Devuelve `true` si quedó guardado.
   *
   * Recibe CÓMO construir las preferencias nuevas a partir de las últimas guardadas, y las aplicaciones van una detrás de
   * otra: dos toques seguidos en «Cómo suena» (que no se apagan mientras se guarda) no se pisan ni dejan dos alarmas
   * diarias, y el segundo parte de lo que dejó el primero.
   */
  const aplicar = useCallback(
    (construir: (previas: PreferenciasDeAcciones) => PreferenciasDeAcciones): Promise<boolean> => {
      const ahora = async (): Promise<boolean> => {
        setOcupado(true);
        try {
          const previas = prefsRef.current;
          const nuevas = construir(previas);
          const cambioElDiario = huellaDelDiario(nuevas) !== huellaDelDiario(previas);
          const cambioLosAvisos = huellaDeLosAvisos(nuevas) !== huellaDeLosAvisos(previas);
          const pideAlarmas = (cambioElDiario && hayDiarioEnAlgunDia(nuevas)) || (cambioLosAvisos && hayAvisoEnAlgunDia(nuevas));
          if (pideAlarmas && !(await pedirPermisoDeAvisos())) {
            Alert.alert('Falta el permiso', SIN_PERMISO);
            return false;
          }
          prefsRef.current = nuevas;
          setPrefs(nuevas);
          await guardarPreferenciasDeAcciones(userId, nuevas);
          if (cambioElDiario && !(await ponerElRecordatorioDiario(userId, nuevas)) && hayDiarioEnAlgunDia(nuevas)) {
            Alert.alert('Falta el permiso', SIN_PERMISO);
          }
          if (cambioLosAvisos) await rehacerLosAvisos(nuevas);
          return true;
        } catch {
          return false;
        } finally {
          setOcupado(false);
        }
      };
      const turno = cola.current.then(ahora, ahora);
      cola.current = turno.catch(() => undefined);
      return turno;
    },
    [userId, rehacerLosAvisos],
  );

  if (!HAY_RECORDATORIOS_LOCALES) return null;

  const alternarDia = (dia: DiaDelPlan) => {
    tacto.seleccion();
    setDiasEnEdicion(previos =>
      previos.includes(dia) ? previos.filter(d => d !== dia) : DIAS_DEL_PLAN.filter(d => d === dia || previos.includes(d)),
    );
  };

  const volverATodos = () => setDiasEnEdicion([]);

  /** Un cambio: en el acto con «todos los días»; con días marcados queda en el borrador hasta «Guardar». */
  const cambiar = (cambio: Partial<Borrador>) => {
    if (enModoDias) {
      setBorrador(previo => ({ ...previo, ...cambio }));
      return;
    }
    void aplicar(previas => conCambios(previas, [], cambioDelBorrador(cambio)));
  };

  const tocarElDiario = (encender: boolean) => cambiar({ diarioActivo: encender });

  const cambiarHora = (hora: string) => {
    setEligiendoHora(false);
    cambiar({ horaDiaria: hora });
  };

  /** `null` = «Sin aviso». Las demás se prenden y apagan, como en un hábito. */
  const alternarAntelacion = (minutos: number | null) => {
    tacto.seleccion();
    const actuales = vista.aviso.mostrado;
    const nuevas =
      minutos === null ? [] : actuales.includes(minutos) ? actuales.filter(m => m !== minutos) : [...actuales, minutos];
    cambiar({ antelaciones: nuevas });
  };

  /**
   * Un toque en un interruptor de «Cómo suena». Con días marcados queda en el borrador. Sin días marcados se guarda en el
   * acto, salvo que deje el sonido y la vibración apagados: eso no se puede guardar, y la selección espera, con su aviso en
   * línea, a que se encienda uno.
   */
  const tocarComoSuena = (clave: ClaveDeLaCombinacion) => {
    const tocados = alTocarUnaFila(vista.comoSuena.iniciales, borrador.alarma ?? {}, clave);
    if (enModoDias || reglaIncumplidaDeLaSeleccion(combinaciones, tocados)) {
      setBorrador(previo => ({ ...previo, alarma: tocados }));
      return;
    }
    setBorrador(previo => ({ ...previo, alarma: undefined }));
    if (hayCambiosEnComoSuena(combinaciones, tocados)) void aplicar(previas => conCambios(previas, [], { alarma: tocados }));
  };

  const guardarLosDias = async () => {
    if (reglaDeComoSuena) {
      // La regla ya está dicha en línea; acá solo se avisa al tacto que así no se guarda.
      tacto.error();
      return;
    }
    if (!(await aplicar(previas => conCambios(previas, marcados, cambioDelBorrador(borrador))))) return;
    tacto.logro();
    anunciar(`Guardado para ${frase}.`);
    setBorrador({});
    setDiasEnEdicion([]);
  };

  const dejarComoLosDemasDias = async () => {
    if (!(await aplicar(previas => dejarComoLosDemas(previas, marcados)))) return;
    tacto.logro();
    anunciar(`Quedó igual que los demás días: ${frase}.`);
    setBorrador({});
    setDiasEnEdicion([]);
  };

  /* ----------------------------------------------------------------------------------------------
   * Lo que se dibuja
   * -------------------------------------------------------------------------------------------- */

  const tieneDiasPropios = Object.keys(prefs.dias ?? {}).length > 0;
  const algunMarcadoTienePropio = marcados.some(iso => Object.values(semana[iso - 1].propio).some(Boolean));

  const lineaDelDiario = !enModoDias
    ? `${prefs.diarioActivo ? `Todos los días a las ${prefs.horaDiaria}.` : 'Apagado en este teléfono.'}${
      tieneDiasPropios ? ' Algunos días tienen el suyo.' : ''
    }`
    : vista.diario.distintos
      ? 'Estos días tienen recordatorios distintos.'
      : !vista.diario.valor
        ? `${conMayuscula(frase)}: apagado.`
        : vista.hora.distintas
          ? 'Estos días tienen horas distintas.'
          : `${conMayuscula(frase)}: a las ${vista.hora.valor}.`;

  const pastilla = (activa: boolean) => [
    estilos.pastilla,
    { borderColor: activa ? c.gold : c.border, backgroundColor: activa ? c.goldWash : 'transparent' },
  ];
  const opciones: { minutos: number | null; etiqueta: string }[] = [
    { minutos: null, etiqueta: 'Sin aviso' },
    ...ANTELACIONES_DE_ACCIONES.map(m => ({ minutos: m, etiqueta: etiquetaDeAntelacion(m) })),
  ];
  const sinAviso = vista.aviso.mostrado.length === 0 && !vista.aviso.distintos;
  // Ni recordatorio diario ni aviso en lo que se edita: «Cómo suena» no tiene qué decidir.
  const motivoDeAtenuar = motivoDeAtenuacionDeLasAcciones({
    sinAlarmas: !vista.diario.valor && !vista.diario.distintos && sinAviso,
    conDias: enModoDias,
    cuantosDias: marcados.length,
  });

  return (
    <View style={{ gap: 12 }}>
      {/* Los siete días, los mismos de «Planificar». El número de abajo es la hora del recordatorio diario de ese día;
          la campana, el aviso propio (solo si difiere del general). Hoy y lo pasado van con candado. */}
      <View>
        <View style={estilos.filaDelRotulo}>
          <View style={estilos.rotuloDeLosDias}>
            <MicroLabel>{enModoDias ? `Solo ${frase}` : 'Todos los días'}</MicroLabel>
          </View>
          {enModoDias && (
            <Presionable
              onPress={volverATodos}
              accessibilityRole="button"
              accessibilityLabel="Volver a todos los días"
              style={estilos.enlaceTodos}
            >
              <Icon name="arrowLeft" size={TAMANO_ICONO.chico} color={c.goldInk} />
              <Text style={[estilos.textoDelEnlace, { color: c.goldInk }]}>Todos</Text>
            </Presionable>
          )}
        </View>
        <FilaDeDiasDelPlan
          corre={CORRE_TODOS_LOS_DIAS}
          horarios={Object.fromEntries(
            DIAS_DEL_PLAN.map(dia => {
              const d = semana[isoDelDia(dia) - 1];
              return [dia, { hora: d.diarioActivo ? d.horaDiaria : undefined, propio: d.diarioActivo && d.propio.horaDiaria }];
            }),
          )}
          enEdicion={diasEnEdicion}
          onAlternarDia={alternarDia}
          avisoDelDia={dia => {
            const d = semana[isoDelDia(dia) - 1];
            return d.propio.antelaciones ? resumenDelAvisoDelDia(d.antelaciones, prefs.antelaciones) : null;
          }}
          alarmaDelDia={dia => {
            const d = semana[isoDelDia(dia) - 1];
            return d.propio.alarma ? { largo: `Alarma propia: ${resumenDeLaCombinacion(d.alarma)}` } : null;
          }}
        />
        <Text style={[estilos.ayuda, { color: c.textSoft }]}>
          {enModoDias
            ? `Solo ${frase}, todas las semanas. Hoy no cambia.`
            : 'Toca un día para darle su propio recordatorio, aviso y alarma. Hoy y lo pasado van con candado.'}
        </Text>
        {enModoDias && algunMarcadoTienePropio && (
          <Presionable
            onPress={() => void dejarComoLosDemasDias()}
            disabled={ocupado}
            accessibilityRole="button"
            hitSlop={8}
            style={estilos.enlaceQuitar}
          >
            <Text style={[estilos.textoDelEnlace, { color: c.textSoft, textDecorationLine: 'underline' }]}>
              Dejar {frase} como los demás días
            </Text>
          </Presionable>
        )}
      </View>

      <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <View style={estilos.fila}>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.nombre, { color: c.textStrong }]}>Recordarme mis acciones del día</Text>
            <Text style={[estilos.cuerpo, { color: vista.diario.distintos || vista.hora.distintas ? c.text : c.textSoft }]}>
              {lineaDelDiario}
            </Text>
          </View>
          {/* `Interruptor` y no el `Switch` con colores a mano (prueba en Android, 2026-10-05). */}
          <Interruptor
            valor={vista.diario.valor}
            deshabilitado={ocupado}
            onCambiar={v => void tocarElDiario(v)}
            etiqueta="Recordarme mis acciones del día"
          />
        </View>
        <View style={{ paddingBottom: 14 }}>
          <BotonSecundario
            etiqueta={vista.hora.distintas ? 'Cambiar hora (varía)' : `Cambiar hora (${vista.hora.valor})`}
            icono="clock"
            deshabilitado={ocupado}
            onPress={() => setEligiendoHora(true)}
          />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[estilos.nombre, { color: c.textStrong }]}>
          {enModoDias ? `Aviso antes de cada acción con hora · ${frase}` : 'Aviso antes de cada acción con hora'}
        </Text>
        {vista.aviso.distintos && (
          <Text style={[estilos.lineaDeAvisosDistintos, { color: c.text }]} accessibilityLiveRegion="polite">
            Estos días tienen avisos distintos
          </Text>
        )}
        <View style={estilos.filaPastillas}>
          {opciones.map(o => {
            const activa = o.minutos === null ? sinAviso : vista.aviso.mostrado.includes(o.minutos);
            return (
              <Presionable
                key={o.etiqueta}
                onPress={() => alternarAntelacion(o.minutos)}
                disabled={ocupado}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: activa, disabled: ocupado }}
                accessibilityLabel={o.etiqueta}
                style={pastilla(activa)}
              >
                <Text style={[estilos.etiqueta, { color: activa ? c.goldInk : c.textSoft }]}>{o.etiqueta}</Text>
              </Presionable>
            );
          })}
        </View>
      </View>

      {/* Cómo suena (spec 010): las mismas cuatro filas, reglas y medidas que en los hábitos. Es el último bloque, antes de
          guardar: días → recordatorio → aviso → cómo suena → guardar. */}
      <SeccionComoSuena
        titulo={enModoDias ? `Cómo suena de ${frase}` : 'Cómo suena'}
        filas={FILAS_DE_COMO_SUENA_DE_LAS_ACCIONES}
        mostrados={vista.comoSuena.mostrados}
        mensajes={mensajesEnLinea({ mostrados: vista.comoSuena.mostrados, regla: reglaDeComoSuena, tonoDeYo })}
        vozPorElTono={tonoDeYo === 'voz'}
        atenuada={motivoDeAtenuar}
        alTocar={tocarComoSuena}
      />

      {hayCambios && (
        <BotonPrincipal
          etiqueta={`Guardar cambios · ${frase}`}
          deshabilitado={ocupado}
          onPress={() => void guardarLosDias()}
        />
      )}

      {confirmacion && (
        <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} />
      )}

      <HoraPickerModal
        visible={eligiendoHora}
        tituloHabito={enModoDias ? `Tus acciones · ${frase}` : 'Tus acciones del día'}
        horaInicial={vista.hora.valor}
        onConfirmar={hora => cambiarHora(hora)}
        onCerrar={() => setEligiendoHora(false)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { fontFamily: fuentes.regular, fontSize: 16, lineHeight: 23 },
  nombre: { fontFamily: fuentes.media, fontSize: 17, lineHeight: 22 },
  etiqueta: { fontFamily: fuentes.media, fontSize: 16, lineHeight: 22 },
  ayuda: { fontFamily: fuentes.regular, fontSize: 16, lineHeight: 22, marginTop: 6 },
  // «Estos días tienen avisos distintos»: a 15 px y con el color del texto, nunca el gris tenue.
  lineaDeAvisosDistintos: { fontFamily: fuentes.media, fontSize: 15, lineHeight: 21 },
  caja: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12 },
  filaPastillas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pastilla: { minHeight: 48, borderWidth: 1.5, borderRadius: 24, paddingHorizontal: 16, justifyContent: 'center' },
  filaDelRotulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  rotuloDeLosDias: { flexShrink: 1, minHeight: 24, justifyContent: 'center' },
  enlaceTodos: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 8 },
  enlaceQuitar: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  textoDelEnlace: { fontFamily: fuentes.media, fontSize: 16, lineHeight: 22 },
});
