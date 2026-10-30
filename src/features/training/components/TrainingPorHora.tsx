import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';

import { Alert } from '../../../components/Alerta';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { HabitItem } from '../../../screens/TrainingScreen';
import { HojaDelCierre, TEXTO_DE_DIA_CERRADO_TARDE } from '../../cierre/components/HojaDelCierre';
import { useCierreDeHoy } from '../../cierre/hooks/useCierreDeHoy';
import { useCierresAnteriores } from '../../cierre/hooks/useCierresAnteriores';
import { horaDelCierre, yaEsHoraDelCierre } from '../../cierre/utils/horaDelCierre';
import { itemDelCierreDeHoy, itemDelCierreDeUnDiaAnterior } from '../../cierre/utils/itemDelCierre';
import { useAhora } from '../../eventos/hooks/useAhora';
import { sumarDiasIso, zonaDelTelefono } from '../../eventos/utils/zonaHoraria';
import { useDiasCerrados } from '../hooks/useDiasCerrados';
import { useEventosDeLaSemana } from '../hooks/useEventosDeLaSemana';
import { useFilasQueSeDespiden } from '../hooks/useFilasQueSeDespiden';
import { usePlanDeLaSemana } from '../hooks/usePlanDeLaSemana';
import {
  TEXTO_DE_DIA_CERRADO,
  TEXTO_YA_HECHO,
  destinoDelToque,
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
import { lineaDelPrograma } from '../utils/lineaDelPrograma';
import { contarElDia, minutosDeAhora, textoDelResumenDeHoy } from '../utils/listaDelDia';
import { fechaDelDiaUno, semanaDe, sePuedeLeerElDia, tituloDelDia } from '../utils/semanaDeTraining';
import { vistaDeOtroDia } from '../utils/vistaDeOtroDia';
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
  fase,
  titulos,
  eventosPrendidos,
  cierrePrendido = true,
  confirmacion,
  onConfirmacionTerminada,
  aperturaPedida,
  onAperturaAtendida,
  onRegistrar,
  onMarcar,
  onAbrirEvento,
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
  fase: string | null;
  titulos: Readonly<Record<string, string>>;
  eventosPrendidos: boolean;
  /**
   * ¿«Cierra tu día» (spec 017) está disponible? Lo apaga el interruptor `plan` de Soporte TI. Apagado o sin la ruta en el
   * servidor, la fila no existe y Training queda como siempre.
   */
  cierrePrendido?: boolean;
  confirmacion: { clave: number; texto: string } | null;
  onConfirmacionTerminada: () => void;
  /** Abrir un hábito de hoy desde el aviso del teléfono: el id de su registro. */
  aperturaPedida: { registroId: string; vez: number } | null;
  onAperturaAtendida: () => void;
  onRegistrar: (habit: HabitItem) => void;
  onMarcar: (habit: HabitItem) => void;
  onAbrirEvento: (eventoId: string) => void;
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
  const { pedir: pedirElCierre, estadoDe: estadoDelCierre } = useCierresAnteriores({ cuentaId, semana: lunes });

  /* Lo que hace falta para MOSTRAR un día que no es hoy: el día anterior leído del servidor, o lo planificado. */
  const pedirLoDeUnDia = useCallback(
    (iso: string) => {
      if (iso === hoyIso) return;
      if (iso < hoyIso && sePuedeLeerElDia(iso, hoyIso, diaPrograma)) {
        // «Cerrado» / «Sin cerrar» (spec 017): una lectura por fecha, solo al tocar el día.
        if (cierrePrendido) void pedirElCierre(iso);
        // Con datos, no hace falta lo planificado; si el servidor no los tiene o falló, sí.
        void pedirElDia(iso).then(() => {
          if (estadoDe(iso)?.estado !== 'datos') cargarElPlan();
        });
        return;
      }
      cargarElPlan();
    },
    [hoyIso, diaPrograma, cierrePrendido, pedirElCierre, pedirElDia, estadoDe, cargarElPlan],
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

  /* «Cierra tu día» (spec 017): aparece 30 min antes de Dormir (21:30 sin Dormir), la última de hoy. Solo se lee del servidor
     cuando ya es su hora y Training está a la vista; sin lectura (backend anterior, plan apagado) no hay fila. */
  const horaDelCierreDeHoy = useMemo(() => horaDelCierre(habits, hoyIso), [habits, hoyIso]);
  const esLaHoraDelCierre = yaEsHoraDelCierre(horaDelCierreDeHoy, minutosDeAhora(ahoraMs));
  const cierreDeHoy = useCierreDeHoy({ cuentaId, hoyIso, activo: activa && cierrePrendido && esLaHoraDelCierre });
  const lecturaDelCierreDeHoy = cierreDeHoy.lectura;
  const itemsHoy = useMemo(() => {
    const items = itemsDeHoy(habits, ocurrencias, contexto);
    return lecturaDelCierreDeHoy.estado === 'listo'
      ? [...items, itemDelCierreDeHoy(hoyIso, horaDelCierreDeHoy, lecturaDelCierreDeHoy.vista)]
      : items;
  }, [habits, ocurrencias, contexto, lecturaDelCierreDeHoy, hoyIso, horaDelCierreDeHoy]);

  /* La hoja: el ítem que se abrió, aunque se esté cerrando (la hoja baja con lo último que mostró). */
  const [hoja, setHoja] = useState<{ item: ItemDelDia; modo: ModoDeLaFila } | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  /* La hoja de «Cierra tu día» y el día para el que se abrió (el «ID original» que se compara antes de enviar). */
  const [cierreAbierto, setCierreAbierto] = useState(false);
  const [diaDelCierre, setDiaDelCierre] = useState(hoyIso);
  /** Lo que se hace cuando la hoja termina de irse: el registro no puede abrirse con la hoja todavía encima (Android). */
  const despuesDeLaHoja = useRef<(() => void) | null>(null);

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
      switch (destinoDelToque(item, modo, deHoy)) {
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
        case 'cierre':
          setDiaDelCierre(hoyIso);
          setCierreAbierto(true);
          return;
        case 'hoja':
          setHoja({ item, modo });
          setHojaAbierta(true);
          return;
        default:
          return;
      }
    },
    [onAbrirEvento, onRegistrar, hoyIso],
  );
  const alTocarLaFila = useCallback((item: ItemDelDia, modo: ModoDeLaFila) => abrirFila(item, modo, esHoy), [abrirFila, esHoy]);

  const alElegirLaAccion = useCallback(
    (item: ItemDelDia, accion: AccionDeLaHoja) => {
      const habit = item.habit;
      if (habit) despuesDeLaHoja.current = accion.tipo === 'marcar' ? () => onMarcar(habit) : () => onRegistrar(habit);
      setHojaAbierta(false);
    },
    [onMarcar, onRegistrar],
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
    setCierreAbierto(false);
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

  const lecturaDelCierreAnterior = estadoDelCierre(dia.iso);
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
    // «Cerrado» / «Sin cerrar» (spec 017): solo de un día anterior ya leído, y solo cuando la lista está lista.
    if (relacion !== 'pasado' || vista.estado !== 'listo' || lecturaDelCierreAnterior?.estado !== 'datos') return vista;
    const filaDelCierre = itemDelCierreDeUnDiaAnterior(dia.iso, lecturaDelCierreAnterior.cierre);
    return filaDelCierre ? { ...vista, items: [...vista.items, filaDelCierre] } : vista;
    // `estadoDe` no cambia de identidad cuando llega una lectura: se relee en cada dibujo, a propósito, y por eso
    // su valor entra a la lista de dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esHoy, dia.iso, dia.relacion, hoyIso, diaPrograma, contexto, ocurrencias, planHabits, preferencias, acciones, estadoDe(dia.iso), lecturaDelCierreAnterior]);

  const resumen = esHoy
    ? estado !== 'listo'
      ? ''
      : (() => {
        const { hechos, total } = contarElDia(itemsHoy);
        return textoDelResumenDeHoy(hechos, total, puntosDeHoy(itemsHoy));
      })()
    : otroDia?.resumen ?? '';
  const programa = lineaDelPrograma(fase, diaPrograma);

  return (
    <View>
      {programa ? (
        <Text style={[t.small, { color: c.textSoft, fontVariant: ['tabular-nums'] }]}>{programa}</Text>
      ) : null}

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
          <ListaDeHoy items={itemsHoy} ahoraMs={ahoraMs} retenidos={retenidos} onAbrir={alTocarLaFila} onMarcar={item => item.habit && onMarcar(item.habit)} />
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

      <HojaDelCierre
        visible={cierreAbierto}
        fecha={diaDelCierre}
        hoyIso={hoyIso}
        diaPrograma={diaPrograma}
        habitosHechos={contarElDia(itemsHoy).hechos}
        habitosTotal={contarElDia(itemsHoy).total}
        puedeVerManana={dias.some(d => d.iso === sumarDiasIso(hoyIso, 1))}
        onCerrar={() => setCierreAbierto(false)}
        alTerminarDeCerrar={alIrseLaHoja}
        alLeer={cierreDeHoy.reemplazar}
        alGuardar={cierreDeHoy.reemplazar}
        alSalirPorDiaCerrado={() => {
          setCierreAbierto(false);
          void cierreDeHoy.recargar();
          Alert.alert('Ese día ya cerró', TEXTO_DE_DIA_CERRADO_TARDE);
        }}
        onVerManana={() => {
          const manana = sumarDiasIso(hoyIso, 1);
          despuesDeLaHoja.current = () => elegirDia(manana);
          setCierreAbierto(false);
        }}
      />

      <HojaDelHabito
        visible={hojaAbierta}
        item={hoja?.item ?? null}
        modo={hoja?.modo ?? 'hoy'}
        ahoraMs={ahoraMs}
        onCerrar={() => setHojaAbierta(false)}
        alTerminarDeCerrar={alIrseLaHoja}
        onAccion={alElegirLaAccion}
      />
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
