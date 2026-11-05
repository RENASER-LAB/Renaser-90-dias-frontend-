import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { HabitItem } from '../../../screens/TrainingScreen';
import { useAhora } from '../../eventos/hooks/useAhora';
import { zonaDelTelefono } from '../../eventos/utils/zonaHoraria';
import { useDiasCerrados } from '../hooks/useDiasCerrados';
import { useEventosDeLaSemana } from '../hooks/useEventosDeLaSemana';
import { useFilasQueSeDespiden } from '../hooks/useFilasQueSeDespiden';
import { usePlanDeLaSemana } from '../hooks/usePlanDeLaSemana';
import {
  TEXTO_DE_DIA_CERRADO,
  TEXTO_YA_HECHO,
  destinoDelToque,
  metaDeLaHoja,
  type AccionDeLaHoja,
  type ModoDeLaFila,
} from '../utils/filaDelDia';
import {
  itemsDeHoy,
  itemsDeUnDiaCerrado,
  itemsPlanificados,
  puntosDeHoy,
  type ItemDelDia,
} from '../utils/itemsDelDia';
import { contarElDia, textoDelResumenDeHoy } from '../utils/listaDelDia';
import { fechaDelDiaUno, semanaDe, sePuedeLeerElDia, tituloDelDia } from '../utils/semanaDeTraining';
import { vistaDeOtroDia } from '../utils/vistaDeOtroDia';
import { HojaConectarPasos } from '../../pasos/components/HojaConectarPasos';
import { HojaDeKilometros } from '../../pasos/components/HojaDeKilometros';
import { ProveedorDePasosDeLaLista, type PasosDeLaLista } from '../../pasos/components/PasosDeLaLista';
import type { PasosEnTraining } from '../../pasos/hooks/usePasosDelDia';
import { abreLaHojaDeKilometros } from '../../pasos/utils/vistaDeKilometros';
import { useCarreraEnVivo } from '../../carrera/hooks/useCarreraEnVivo';
import { pedirLaCarrera } from '../../carrera/servicios/pedidosDeLaCarrera';
import { lugarDeLaCarrera } from '../../carrera/utils/entradaDeLaCarrera';
import { FilaDeSemana } from './FilaDeSemana';
import { HojaDelHabito } from './HojaDelHabito';
import { ListaDeHoy } from './ListaDeHoy';
import { ListaDeOtroDia } from './ListaDeOtroDia';

/**
 * El cuerpo de Training (spec 014, «Training por hora»): el día elegido en serif, su resumen, la semana de lunes a
 * domingo y, debajo, UNA lista con los hábitos, las acciones del día y los eventos, por la hora planificada.
 *
 * Esta pieza no registra nada. Sabe qué mostrar y a dónde lleva cada toque (`destinoDelToque`); registrar —la cámara,
 * la Pastilla, la Clase, el check— sigue siendo de `TrainingScreen`, que le pasa `onRegistrar` y `onMarcar`: los
 * mismos caminos de siempre y los mismos pedidos al servidor.
 *
 * **Qué se pide y cuándo** (condición del dueño sobre `GET /habit-tracks/day`: «que se puede ejecutar 1000 veces»):
 * - Al abrir Training, los datos de siempre (los trae `useTraining`) y una lectura de los eventos de la semana.
 * - Un día anterior se lee del servidor SOLO al tocarlo, una vez por fecha y cuenta (`useDiasCerrados`).
 * - Las horas planificadas por día y las acciones agendadas se piden la primera vez que se toca un día que no es hoy.
 */
export function TrainingPorHora({
  activa,
  estado,
  mensajeDeError,
  onReintentar,
  cuentaId,
  habits,
  planHabits,
  hoyIso,
  diaElegido,
  onElegirDia,
  diaPrograma,
  titulos,
  eventosPrendidos,
  confirmacion,
  onConfirmacionTerminada,
  aperturaPedida,
  onAperturaAtendida,
  onRegistrar,
  onMarcar,
  onAbrirEvento,
  pasos,
  ofrecerCarrera = false,
}: {
  activa: boolean;
  /**
   * Cómo va la lectura de hoy. Con `cargando` o `error` el título del día y la semana se quedan donde están y solo la
   * lista cambia: así elegir un día y abrir una hoja sobreviven a la relectura que hace Training al volver al foco.
   */
  estado: 'cargando' | 'error' | 'listo';
  mensajeDeError: string | null;
  onReintentar: () => void;
  cuentaId: string;
  /** Los hábitos con registro de hoy y las acciones del día (`useTraining`). */
  habits: HabitItem[];
  /** El inventario completo de hábitos, para armar lo planificado de otros días. */
  planHabits: HabitItem[];
  /** `YYYY-MM-DD` de HOY (el día de la persona: el que dice el servidor, o el del teléfono). */
  hoyIso: string;
  /**
   * El día que se mira (`YYYY-MM-DD`), o `null` = hoy. Lo guarda `TrainingScreen`: ella decide qué registros monta (en
   * un día anterior, ninguno), así que tiene que saber qué día se mira.
   */
  diaElegido: string | null;
  onElegirDia: (iso: string | null) => void;
  diaPrograma: number | null;
  titulos: Readonly<Record<string, string>>;
  eventosPrendidos: boolean;
  confirmacion: { clave: number; texto: string } | null;
  onConfirmacionTerminada: () => void;
  /** Abrir un hábito de hoy desde el aviso del teléfono: el id de su registro. */
  aperturaPedida: { registroId: string; vez: number } | null;
  onAperturaAtendida: () => void;
  onRegistrar: (habit: HabitItem) => void;
  onMarcar: (habit: HabitItem) => void;
  onAbrirEvento: (eventoId: string) => void;
  /** Spec 037 (D-310): los pasos del teléfono para «Kilómetros diarios». Ausente = la fila de siempre. */
  pasos?: PasosEnTraining;
  /** Spec 042: ofrecer «Correr con GPS» en la fila de «Kilómetros diarios» de hoy. */
  ofrecerCarrera?: boolean;
}) {
  const { c, t } = useTheme();
  // Con el día de hoy del servidor como llave: al pasar la medianoche la hora de «ahora» se toma de nuevo en ese mismo render.
  const ahoraMs = useAhora(30_000, hoyIso);
  const zona = useMemo(() => zonaDelTelefono(), []);
  const dias = useMemo(() => semanaDe(hoyIso), [hoyIso]);
  const lunes = dias[0].iso;

  const dia = dias.find(d => d.iso === diaElegido) ?? dias.find(d => d.relacion === 'hoy') ?? dias[0];

  const ocurrencias = useEventosDeLaSemana({ cuentaId, activa, habilitado: eventosPrendidos, lunes });
  const { pedir: pedirElDia, estadoDe } = useDiasCerrados({ cuentaId, semana: lunes });
  const { preferencias, acciones, cargar: cargarElPlan } = usePlanDeLaSemana({ cuentaId, semana: lunes });
  const retenidos = useFilasQueSeDespiden();

  /* Lo que hace falta para MOSTRAR un día que no es hoy: el día anterior leído del servidor, o lo planificado. */
  const pedirLoDeUnDia = useCallback(
    (iso: string) => {
      if (iso === hoyIso) return;
      if (iso < hoyIso && sePuedeLeerElDia(iso, hoyIso, diaPrograma)) {
        // Con datos, no hace falta lo planificado; si el servidor no los tiene o falló, sí.
        void pedirElDia(iso).then(() => {
          if (estadoDe(iso)?.estado !== 'datos') cargarElPlan();
        });
        return;
      }
      cargarElPlan();
    },
    [hoyIso, diaPrograma, pedirElDia, estadoDe, cargarElPlan],
  );

  /* Tocar un día. Es la puerta por donde se pide un día anterior o lo planificado… */
  const elegirDia = useCallback(
    (iso: string) => {
      onElegirDia(iso === hoyIso ? null : iso);
      pedirLoDeUnDia(iso);
    },
    [hoyIso, onElegirDia, pedirLoDeUnDia],
  );
  /* …y la otra es volver a este cuerpo con un día ya elegido (el que guarda `TrainingScreen`): al abrir el engranaje y regresar,
     este componente se monta de nuevo sin la memoria de lo planificado, y el día elegido se veía con las horas generales de
     antes de planificar (sin la hora de ese día, sin el día apagado, sin las acciones agendadas). Pide lo que falta una vez. */
  const diaDeLaPantalla = diaElegido;
  useEffect(() => {
    if (!activa || diaDeLaPantalla === null) return;
    pedirLoDeUnDia(diaDeLaPantalla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa, diaDeLaPantalla, cuentaId, lunes]);

  const contexto = useMemo(() => ({ hoyIso, zona, titulos }), [hoyIso, zona, titulos]);

  /* «Cierra tu día» (spec 017) ya no vive acá: se movió a Plan (spec 033, 2026-10-31). La lista de hoy son los hábitos, las
     acciones y los eventos del día, por hora. */
  const itemsHoy = useMemo(() => itemsDeHoy(habits, ocurrencias, contexto), [habits, ocurrencias, contexto]);

  /* La hoja: el ítem que se abrió, aunque se esté cerrando (la hoja baja con lo último que mostró). */
  const [hoja, setHoja] = useState<{ item: ItemDelDia; modo: ModoDeLaFila } | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  /** Lo que se hace cuando la hoja termina de irse: el registro no puede abrirse con la hoja todavía encima (Android). */
  const despuesDeLaHoja = useRef<(() => void) | null>(null);
  /** Spec 042 (2026-11-05): ¿esta fila es «Kilómetros diarios» por cumplir hoy en un teléfono que puede correr con GPS? */
  const carreraEnCurso = useCarreraEnVivo() != null;
  const esLaFilaDeLaCarrera = useCallback(
    (item: ItemDelDia, modo: ModoDeLaFila, deHoy: boolean) =>
      deHoy &&
      ofrecerCarrera &&
      !!pasos?.registroId &&
      item.habit?.id === pasos.registroId &&
      lugarDeLaCarrera({ ofrecida: true, modo, hecho: item.hecho, conAvanceDePasos: false }) === 'fila',
    [ofrecerCarrera, pasos?.registroId],
  );

  /* Spec 037: las dos hojas de los pasos (conectar y la de los km). Se abren solo en HOY. */
  const [conectarAbierta, setConectarAbierta] = useState(false);
  const [kmAbierta, setKmAbierta] = useState(false);

  /* Lo que se dice al tocar una fila de un día anterior: «Ya hecho» o que ese día ya cerró. Nada más. */
  const [avisoDeFila, setAvisoDeFila] = useState<{ clave: number; texto: string; icono: 'check' | 'lock' } | null>(null);
  useEffect(() => {
    if (!avisoDeFila) return;
    const temporizador = setTimeout(() => setAvisoDeFila(null), 4000);
    return () => clearTimeout(temporizador);
  }, [avisoDeFila]);

  const esHoy = dia.relacion === 'hoy';
  /** Abre lo que corresponde a una fila. `deHoy` dice si la fila es del día de hoy: en cualquier otro día solo se avisa. */
  const abrirFila = useCallback(
    (item: ItemDelDia, modo: ModoDeLaFila, deHoy: boolean) => {
      // Con los pasos conectados, tocar «Kilómetros diarios» abre la hoja de los km (avance, sin pasos o sin permiso).
      if (deHoy && pasos && item.habit?.id === pasos.registroId && (modo === 'hoy' || modo === 'atrasado') && abreLaHojaDeKilometros(pasos.vista)) {
        setKmAbierta(true);
        return;
      }
      const destino = destinoDelToque(item, modo, deHoy);
      // Spec 042 (2026-11-05): con la carrera, «Kilómetros diarios» por cumplir abre su hoja («Correr con GPS» y «Subir captura»)
      // en vez de la cámara directa: la captura ya no es el botón principal.
      if (destino === 'registro' && esLaFilaDeLaCarrera(item, modo, deHoy)) {
        setHoja({ item, modo });
        setHojaAbierta(true);
        return;
      }
      switch (destino) {
        case 'ya-hecho':
          setAvisoDeFila({ clave: Date.now(), texto: TEXTO_YA_HECHO, icono: 'check' });
          return;
        case 'candado':
          setAvisoDeFila({ clave: Date.now(), texto: TEXTO_DE_DIA_CERRADO, icono: 'lock' });
          return;
        case 'evento':
          if (item.eventoId) onAbrirEvento(item.eventoId);
          return;
        case 'registro':
          if (item.habit) onRegistrar(item.habit);
          return;
        case 'hoja':
          setHoja({ item, modo });
          setHojaAbierta(true);
          return;
        default:
          return;
      }
    },
    [onAbrirEvento, onRegistrar, pasos, esLaFilaDeLaCarrera],
  );
  const alTocarLaFila = useCallback((item: ItemDelDia, modo: ModoDeLaFila) => abrirFila(item, modo, esHoy), [abrirFila, esHoy]);

  const alElegirLaAccion = useCallback(
    (item: ItemDelDia, accion: AccionDeLaHoja) => {
      const habit = item.habit;
      if (habit) {
        despuesDeLaHoja.current =
          accion.tipo === 'marcar'
            ? () => onMarcar(habit)
            : accion.tipo === 'correr'
              ? () => pedirLaCarrera(carreraEnCurso ? { tipo: 'volver' } : { tipo: 'empezar', registroId: habit.id })
              : () => onRegistrar(habit);
      }
      setHojaAbierta(false);
    },
    [onMarcar, onRegistrar, carreraEnCurso],
  );

  /* Si cambia el día (la persona elige otro, o pasa la medianoche) la hoja de un hábito no se queda: se cierra y no
     abre ningún registro pendiente. El registro de siempre vuelve a comprobar el día antes de enviar (spec 002). */
  const abriendoDesdeUnAviso = useRef(false);
  useEffect(() => {
    // La hoja que un aviso del teléfono acaba de abrir al volver a hoy no se cierra por ese mismo cambio de día.
    if (abriendoDesdeUnAviso.current) {
      abriendoDesdeUnAviso.current = false;
      return;
    }
    setHojaAbierta(false);
    setKmAbierta(false);
    setConectarAbierta(false);
    despuesDeLaHoja.current = null;
    setAvisoDeFila(null);
  }, [dia.iso, hoyIso]);

  const alIrseLaHoja = useCallback(() => {
    const pendiente = despuesDeLaHoja.current;
    despuesDeLaHoja.current = null;
    pendiente?.();
  }, []);

  /* Un aviso del teléfono que abre un hábito (`aperturaDesdeAviso`): se va a hoy y se abre como al tocar su fila. */
  const ultimaApertura = useRef(0);
  useEffect(() => {
    if (!aperturaPedida || aperturaPedida.vez === ultimaApertura.current) return;
    const item = itemsHoy.find(x => x.habit?.id === aperturaPedida.registroId);
    ultimaApertura.current = aperturaPedida.vez;
    onAperturaAtendida();
    if (!item) return;
    if (!esHoy) abriendoDesdeUnAviso.current = true;
    onElegirDia(null);
    abrirFila(item, item.hecho ? 'hecho' : item.cerrado ? 'cerrado' : 'hoy', true);
  }, [aperturaPedida, itemsHoy, abrirFila, esHoy, onAperturaAtendida, onElegirDia]);

  const otroDia = useMemo(() => {
    if (esHoy) return null;
    const relacion = dia.relacion as 'pasado' | 'futuro';
    const diaUno = fechaDelDiaUno(hoyIso, diaPrograma);
    const estado = estadoDe(dia.iso);
    const vista = vistaDeOtroDia({
      relacion,
      leible: sePuedeLeerElDia(dia.iso, hoyIso, diaPrograma),
      previoAlPrograma: relacion === 'pasado' && diaUno != null && dia.iso < diaUno,
      lectura: estado,
      itemsLeidos: () =>
        estado?.estado === 'datos' ? itemsDeUnDiaCerrado(estado.tracks, ocurrencias, { ...contexto, fechaIso: dia.iso }) : [],
      itemsPlanificados: () =>
        itemsPlanificados({
          ...contexto,
          fechaIso: dia.iso,
          inventario: planHabits,
          preferencias,
          acciones,
          ocurrencias,
        }),
    });
    return vista;
    // `estadoDe` no cambia de identidad cuando llega una lectura: se relee en cada dibujo, a propósito, y por eso
    // su valor entra a la lista de dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esHoy, dia.iso, dia.relacion, hoyIso, diaPrograma, contexto, ocurrencias, planHabits, preferencias, acciones, estadoDe(dia.iso)]);

  /* Lo que la fila de «Kilómetros diarios» necesita de los pasos (contexto de la lista de hoy). */
  const pasosDeLaLista = useMemo<PasosDeLaLista | null>(
    () =>
      pasos && pasos.registroId
        ? {
            registroId: pasos.registroId,
            vista: pasos.vista,
            registrando: pasos.registrando,
            onConectar: () => setConectarAbierta(true),
            onActualizar: () => void pasos.actualizar(),
            onRegistrar: () => void pasos.registrar(),
            carrera: ofrecerCarrera,
          }
        : null,
    [pasos, ofrecerCarrera],
  );
  const itemDeKilometros = pasos?.registroId ? itemsHoy.find(x => x.habit?.id === pasos.registroId) ?? null : null;
  /** La captura de siempre: se abre cuando la hoja de los pasos ya se fue (en Android una ventana apilada se come los toques). */
  const subirLaCaptura = useCallback(() => {
    if (itemDeKilometros?.habit) onRegistrar(itemDeKilometros.habit);
  }, [itemDeKilometros, onRegistrar]);

  const resumen = esHoy
    ? estado !== 'listo'
      ? ''
      : (() => {
        const { hechos, total } = contarElDia(itemsHoy);
        return textoDelResumenDeHoy(hechos, total, puntosDeHoy(itemsHoy));
      })()
    : otroDia?.resumen ?? '';

  return (
    <View>
      <View style={estilos.titulo}>
        <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
          {tituloDelDia(dia.iso)}
        </Text>
        <Text style={[t.small, { color: c.textSoft, fontVariant: ['tabular-nums'] }]} accessibilityLiveRegion="polite">
          {resumen}
        </Text>
      </View>

      <FilaDeSemana dias={dias} elegido={dia.iso} onElegir={elegirDia} />

      {avisoDeFila ? (
        <View style={estilos.avisoDeFila} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Icon name={avisoDeFila.icono} size={TAMANO_ICONO.chico} color={avisoDeFila.icono === 'check' ? c.success : c.textSoft} />
          <Text style={[t.body, { color: c.textSoft, flexShrink: 1 }]}>{avisoDeFila.texto}</Text>
        </View>
      ) : null}

      {confirmacion ? (
        <View style={{ marginTop: 12 }}>
          <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={onConfirmacionTerminada} />
        </View>
      ) : null}

      {/* Una lista por día: al cambiar de día se monta una nueva, y las filas del día anterior no se despiden con
          fundido encima de las nuevas. */}
      <View key={dia.iso}>
        {esHoy && estado === 'cargando' ? (
          <View style={{ gap: 0, marginTop: 8 }} accessibilityLabel="Cargando tu entrenamiento">
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[estilos.esqueleto, { borderTopColor: c.divider, backgroundColor: c.cardBg, opacity: 0.45 }]} />
            ))}
          </View>
        ) : esHoy && estado === 'error' ? (
          <View style={[estilos.error, { borderColor: c.danger, backgroundColor: c.cardBg }]}>
            <Text style={[t.cardTitle, { color: c.text }]}>No pudimos cargar tu entrenamiento</Text>
            <Text style={[t.body, { color: c.textSoft }]}>{mensajeDeError}</Text>
            {/* Relleno sólido, sin borde: es la única acción de la tarjeta y ya vive DENTRO de un recuadro. */}
            <Presionable onPress={onReintentar} accessibilityRole="button" style={[estilos.reintentar, { backgroundColor: c.gold }]}>
              <Text style={[t.cardTitle, { color: c.onGold }]}>Reintentar</Text>
            </Presionable>
          </View>
        ) : esHoy ? (
          <ProveedorDePasosDeLaLista value={pasosDeLaLista}>
            <ListaDeHoy items={itemsHoy} ahoraMs={ahoraMs} retenidos={retenidos} onAbrir={alTocarLaFila} onMarcar={item => item.habit && onMarcar(item.habit)} onSubir={item => item.habit && onRegistrar(item.habit)} />
          </ProveedorDePasosDeLaLista>
        ) : otroDia && otroDia.estado === 'cargando' ? (
          <Text style={[t.body, estilos.cargando, { color: c.textSoft }]} accessibilityLiveRegion="polite">
            {otroDia.resumen}
          </Text>
        ) : otroDia ? (
          <ListaDeOtroDia
            items={otroDia.items}
            relacion={dia.relacion as 'pasado' | 'futuro'}
            conLectura={otroDia.conLectura}
            ahoraMs={ahoraMs}
            nota={otroDia.nota}
            onAbrir={alTocarLaFila}
            accion={otroDia.puedeReintentar ? { etiqueta: 'Reintentar', onPress: () => void pedirElDia(dia.iso, { reintentar: true }) } : null}
          />
        ) : null}
      </View>

      <HojaDelHabito
        visible={hojaAbierta}
        item={hoja?.item ?? null}
        modo={hoja?.modo ?? 'hoy'}
        ahoraMs={ahoraMs}
        onCerrar={() => setHojaAbierta(false)}
        alTerminarDeCerrar={alIrseLaHoja}
        onAccion={alElegirLaAccion}
        carrera={hoja && esLaFilaDeLaCarrera(hoja.item, hoja.modo, true) ? { enCurso: carreraEnCurso } : null}
      />

      {pasos && pasos.registroId ? (
        <>
          <HojaConectarPasos
            visible={conectarAbierta}
            soporte={pasos.vista.modo === 'ofrecer' ? pasos.vista.soporte : 'disponible'}
            conectar={pasos.conectar}
            fuente={pasos.vista.modo === 'avance' ? pasos.vista.fuente.etiqueta : null}
            desdeLasHoy={pasos.conectadoHoyA}
            onCerrar={() => setConectarAbierta(false)}
            onSubirCaptura={subirLaCaptura}
            onAbrirHealthConnect={pasos.abrirHealthConnect}
          />
          <HojaDeKilometros
            visible={kmAbierta}
            titulo={itemDeKilometros?.titulo ?? 'Kilómetros diarios'}
            subtitulo={itemDeKilometros ? metaDeLaHoja(itemDeKilometros, 'hoy') : undefined}
            vista={pasos.vista}
            registrando={pasos.registrando}
            onRegistrar={() => {
              setKmAbierta(false);
              void pasos.registrar();
            }}
            onActualizar={() => void pasos.actualizar()}
            onDesconectar={() => {
              setKmAbierta(false);
              pasos.desconectar();
            }}
            onAbrirHealthConnect={pasos.abrirHealthConnect}
            onSubirCaptura={subirLaCaptura}
            onCerrar={() => setKmAbierta(false)}
          />
        </>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { marginTop: 6, gap: 2 },
  cargando: { marginTop: 16 },
  avisoDeFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, minHeight: 24 },
  esqueleto: { height: 66, borderTopWidth: StyleSheet.hairlineWidth },
  error: { marginTop: 12, gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  reintentar: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
