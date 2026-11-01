import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { RocaDiariaApi, RocaMaestraApi } from '../types/objetivos.types';
import { ETIQUETA_EJE } from '../types/objetivos.types';
import { estadoDeLaAccion, horaCortaDeLaAccion, textoDelEstado } from '../utils/accionesDeHoy';
import { primeraClausula } from '../utils/cifraDelObjetivo';
import { estaPorConfirmar } from '../utils/objetivosPorConfirmar';
import { iconoDelEje } from '../utils/iconoDelEje';
import { colorDePareto, etiquetaDeLaAccion, lineaDelObjetivo, NOMBRE_DEL_COLOR } from '../utils/planPrincipal';

/**
 * Las tarjetas de la pantalla principal de Plan (2026-10-31, pedido del dueño: «en Plan replica este formato de acuerdo a lo que
 * tenemos»). Todas con el fondo y el borde del tema, textos de 16 a 18, áreas de 48 y `Presionable` donde se toca; sin animaciones
 * propias. Aquí solo se dibuja: qué se lee y qué abre cada cosa lo decide `PlanScreen` / `PlanDelEje`.
 */

const TEXTO_DEL_BOTON = { fontSize: 16, letterSpacing: 0 } as const;

/* ------------------------------------------------------------------------------------------------
 * c. El objetivo de 90 días
 * ---------------------------------------------------------------------------------------------- */

export function TarjetaDelObjetivo({
  roca,
  cargando,
  error,
  cifraDelMes,
  alAbrirOpciones,
  alCambiarElMes,
}: {
  /** Un objetivo del diagnóstico sin confirmar se ve «Por confirmar»; sus «…» abren la revisión y no «Anotar avance». */
  roca: RocaMaestraApi | null;
  cargando: boolean;
  error: string | null;
  /** «81.6 kg»: lo que dice el servidor para este mes; se toca para corregirla. `null` = no hay cifra. */
  cifraDelMes: string | null;
  /** Los «…» de la derecha: abren «Editar» / «Anotar avance». `undefined` = no hay nada que hacer y no se dibujan. */
  alAbrirOpciones?: () => void;
  alCambiarElMes: () => void;
}) {
  const { c, t } = useTheme();
  const linea = roca ? lineaDelObjetivo(roca) : null;
  const porConfirmar = estaPorConfirmar(roca);
  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.fila}>
        <Icon name="flag" size={TAMANO_ICONO.chico} color={c.goldInk} />
        <Text style={[t.small, estilos.rotulo, { color: c.goldInk, flex: 1 }]}>Tu objetivo de 90 días</Text>
        {alAbrirOpciones ? (
          <Presionable
            onPress={alAbrirOpciones}
            accessibilityRole="button"
            accessibilityLabel={porConfirmar ? 'Revisar y confirmar el objetivo' : 'Más opciones del objetivo'}
            style={estilos.puntos}
          >
            <Icon name="dots" size={TAMANO_ICONO.normal} color={c.textSoft} />
          </Presionable>
        ) : null}
      </View>

      {cargando && !roca ? (
        <Text style={[t.body, estilos.suave, { color: c.textSoft }]}>Cargando tu objetivo…</Text>
      ) : error && !roca ? (
        <Text style={[t.body, estilos.suave, { color: c.danger }]}>{error}</Text>
      ) : !roca ? (
        // Estado vacío real: nunca un objetivo inventado.
        <Text style={[t.body, estilos.suave, { color: c.textSoft }]}>
          Todavía no lo definiste. Toca los tres puntos y escribe a dónde quieres llegar.
        </Text>
      ) : (
        <>
          {/* «Por confirmar» (spec 026): un objetivo que nació del diagnóstico y la persona todavía no confirmó. Con texto, ícono y
              borde, no solo color. */}
          {porConfirmar ? (
            <View
              style={[estilos.chipPorConfirmar, { borderColor: c.gold, backgroundColor: c.goldWash }]}
              accessible
              accessibilityLabel="Por confirmar"
            >
              <Icon name="hourglass" size={TAMANO_ICONO.chico} color={c.goldInk} />
              <Text style={[t.small, estilos.textoDelChip, { color: c.goldInk }]}>Por confirmar</Text>
            </View>
          ) : null}
          {/* Solo la primera cláusula (2026-09-22, pedido del dueño: «quiero poco texto»). */}
          <Text style={[t.cardTitle, estilos.objetivo, { color: c.textStrong }]}>{primeraClausula(roca.objetivo)}</Text>
          {roca.porcentaje != null ? (
            <>
              <View style={estilos.filaDeCifras}>
                <Text style={[t.small, estilos.cifras, estilos.linea, { color: c.textSoft }]} numberOfLines={2}>
                  {linea ?? ''}
                </Text>
                <Text style={[t.cardTitle, estilos.cifras, estilos.porcentaje, { color: c.goldInk }]}>{roca.porcentaje}%</Text>
              </View>
              <View
                style={[estilos.barra, estilos.barraDelObjetivo, { backgroundColor: c.border }]}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`Avance de tu objetivo: ${roca.porcentaje} por ciento`}
              >
                <View style={[estilos.relleno, { width: `${Math.max(0, Math.min(100, roca.porcentaje))}%`, backgroundColor: c.gold }]} />
              </View>
            </>
          ) : null}
        </>
      )}

      {/* La cifra del mes (2026-09-22): la calcula el servidor; tocarla la corrige a mano. */}
      {cifraDelMes ? (
        <Presionable
          onPress={alCambiarElMes}
          accessibilityRole="button"
          accessibilityLabel="Cambiar el objetivo de este mes"
          style={estilos.esteMes}
        >
          <Text style={[t.small, estilos.cifras, { color: c.textSoft, fontSize: 15, flexShrink: 1 }]}>
            Este mes: <Text style={{ color: c.goldInk, fontFamily: fuentes.negrita }}>{cifraDelMes}</Text>
          </Text>
          <Icon name="pencil" size={TAMANO_ICONO.chico} color={c.textSoft} />
        </Presionable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * d. Esta semana
 * ---------------------------------------------------------------------------------------------- */

export type EstadoDeLaSemana = 'cargando' | 'bloqueada' | 'sin_planificar' | 'planificada' | 'cerrada';

export function TarjetaEstaSemana({
  estado,
  numeroSemana,
  titulo,
  revisada,
  avance,
  error,
  queEmpieza,
  alArmar,
  alRevisar,
  alDefinirObjetivos,
  alArmarLaQueEmpieza,
}: {
  estado: EstadoDeLaSemana;
  numeroSemana: number;
  /** El objetivo semanal del eje. `null` = este eje no tiene objetivo esta semana. */
  titulo: string | null;
  /** La autoevaluación final, si el objetivo ya se revisó. */
  revisada: number | null;
  /** Las acciones del eje de hoy en adelante: `total` 0 = no hay barra. */
  avance: { cumplidas: number; total: number };
  error: string | null;
  /** Solo el domingo: la semana que empieza el lunes. */
  queEmpieza?: { numeroSemana: number; titulo: string | null; cargando: boolean };
  alArmar: () => void;
  alRevisar: () => void;
  /** Con la semana bloqueada: abre el editor del primer objetivo de 90 días que falta. */
  alDefinirObjetivos?: () => void;
  alArmarLaQueEmpieza: () => void;
}) {
  const { c, t } = useTheme();
  const hayTitulo = (estado === 'planificada' || estado === 'cerrada') && titulo !== null;
  const proporcion = avance.total > 0 ? avance.cumplidas / avance.total : 0;
  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.fila}>
        <Icon name="calendar" size={TAMANO_ICONO.chico} color={c.goldInk} />
        <Text style={[t.small, estilos.rotulo, { color: c.goldInk, flex: 1 }]}>Esta semana · semana {numeroSemana}</Text>
        {hayTitulo && avance.total > 0 ? (
          <Text style={[t.cardTitle, estilos.cifras, estilos.porcentaje, { color: c.goldInk }]}>
            {avance.cumplidas} de {avance.total}
          </Text>
        ) : null}
      </View>

      {estado === 'cargando' ? <Text style={[t.body, estilos.suave, { color: c.textSoft }]}>Cargando tu semana…</Text> : null}

      {estado === 'bloqueada' ? (
        <View style={estilos.bloque}>
          <Text style={[t.body, { color: c.textSoft }]}>Primero define tus tres objetivos de 90 días: la semana se arma a partir de ellos.</Text>
          {alDefinirObjetivos ? (
            <GoldButton label="Escribir mis objetivos" onPress={alDefinirObjetivos} variant="outline" icon="chevron" textStyle={TEXTO_DEL_BOTON} />
          ) : null}
        </View>
      ) : null}

      {estado === 'sin_planificar' && !queEmpieza ? (
        <View style={estilos.bloque}>
          <Text style={[t.body, { color: c.textSoft }]}>Todavía no armaste esta semana. Con tu eje principal alcanza.</Text>
          <GoldButton label="Arma tu semana" onPress={alArmar} variant="outline" icon="chevron" textStyle={TEXTO_DEL_BOTON} />
        </View>
      ) : null}
      {estado === 'sin_planificar' && queEmpieza ? (
        <Text style={[t.body, estilos.suave, { color: c.textSoft }]}>Esta semana no la armaste. Hoy ya se arma la que empieza el lunes.</Text>
      ) : null}

      {(estado === 'planificada' || estado === 'cerrada') && titulo === null ? (
        <View style={estilos.bloque}>
          <Text style={[t.body, { color: c.textSoft }]}>
            {queEmpieza ? 'Esta semana no le pusiste objetivo.' : 'Todavía no le pusiste objetivo esta semana.'}
          </Text>
          {!queEmpieza ? <GoldButton label="Arma tu semana" onPress={alArmar} variant="outline" icon="chevron" textStyle={TEXTO_DEL_BOTON} /> : null}
        </View>
      ) : null}

      {hayTitulo ? (
        <>
          <Text style={[t.cardTitle, estilos.objetivo, { color: c.textStrong }]}>{titulo}</Text>
          {avance.total > 0 ? (
            <>
              <View
                style={[estilos.barra, { backgroundColor: c.border }]}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`${avance.cumplidas} de ${avance.total} acciones cumplidas, de hoy a fin de semana`}
              >
                <View style={[estilos.relleno, { width: `${Math.round(proporcion * 100)}%`, backgroundColor: c.gold }]} />
              </View>
              {/* Las lecturas del servidor no traen los días que ya pasaron: se dice de qué días es la cuenta. */}
              <Text style={[t.small, { color: c.textSoft, marginTop: 6 }]}>acciones cumplidas, de hoy a fin de semana</Text>
            </>
          ) : null}
          {estado === 'cerrada' ? (
            <Text style={[t.small, estilos.revisada, { color: c.success }]}>Revisada · te pusiste {revisada} de 10</Text>
          ) : (
            <Presionable onPress={alRevisar} accessibilityRole="button" style={estilos.enlace}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita, fontSize: 15 }]}>Cerrar este objetivo con mi revisión</Text>
            </Presionable>
          )}
        </>
      ) : null}

      {/* La semana que empieza, solo el domingo (D-203): es la que se arma ese día y la que sostiene las acciones del lunes. */}
      {queEmpieza && estado !== 'cargando' && estado !== 'bloqueada' ? (
        <View style={[estilos.subtarjeta, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
          <Text style={[t.small, estilos.rotulo, { color: c.goldInk }]}>La que empieza el lunes · semana {queEmpieza.numeroSemana}</Text>
          {queEmpieza.cargando ? (
            <Text style={[t.body, { color: c.textSoft, marginTop: 4 }]}>Cargando…</Text>
          ) : queEmpieza.titulo ? (
            <Text style={[t.body, { color: c.textStrong, marginTop: 4 }]}>{queEmpieza.titulo}</Text>
          ) : (
            <>
              <Text style={[t.body, { color: c.textSoft, marginTop: 4 }]}>Hoy se arma. Las acciones del lunes salen de su objetivo.</Text>
              <Presionable onPress={alArmarLaQueEmpieza} accessibilityRole="button" style={estilos.enlace}>
                <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita, fontSize: 15 }]}>Armar la semana que empieza</Text>
              </Presionable>
            </>
          )}
        </View>
      ) : null}

      {error ? <Text style={[t.small, { color: c.danger, marginTop: 8 }]}>{error}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * e. Acciones que mueven la meta
 * ---------------------------------------------------------------------------------------------- */

export function AccionesQueMuevenLaMeta({
  acciones,
  hoyIso,
  nombreDelEje,
  hayPlanSemanal,
  puedeAgendar,
  error,
  alTocarUna,
  alAgendar,
  children,
}: {
  /** Las del eje elegido, de hoy y las que vienen (ya ordenadas). */
  acciones: readonly RocaDiariaApi[];
  /** El día de hoy según el servidor; sin él, nada se considera «de hoy». */
  hoyIso: string | null;
  nombreDelEje: string;
  hayPlanSemanal: boolean;
  puedeAgendar: boolean;
  error: string | null;
  /** Una de hoy lleva a Training; una que viene abre «Agendar». */
  alTocarUna: (accion: RocaDiariaApi, esDeHoy: boolean) => void;
  alAgendar: () => void;
  /** Debajo de la lista: los recordatorios de las acciones. */
  children?: React.ReactNode;
}) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.fila}>
        <Icon name="target" size={TAMANO_ICONO.chico} color={c.goldInk} />
        <Text style={[t.small, estilos.rotulo, { color: c.goldInk, flex: 1 }]}>Acciones que mueven la meta</Text>
      </View>

      {!hayPlanSemanal ? (
        <Text style={[t.body, estilos.suave, { color: c.textSoft }]}>Primero arma tu semana: de ahí salen tus acciones.</Text>
      ) : acciones.length > 0 ? (
        <View style={estilos.lista}>
          {acciones.map(accion => {
            const esDeHoy = hoyIso !== null && accion.fecha === hoyIso;
            const tocable = esDeHoy || puedeAgendar;
            const icono = accion.completada ? 'checkCircle' : accion.bloqueada ? 'lock' : iconoDelEje(accion.eje);
            const fila = (
              <View style={[estilos.accion, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                <Icon
                  name={icono}
                  size={TAMANO_ICONO.normal}
                  color={accion.completada ? c.success : accion.bloqueada ? c.chevron : c.goldInk}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[t.body, estilos.tituloDeLaAccion, { color: c.textStrong }]} numberOfLines={2}>
                    {accion.titulo}
                  </Text>
                  <Text style={[t.small, estilos.cifras, { color: c.textSoft }]}>{etiquetaDeLaAccion(accion)}</Text>
                </View>
                {tocable ? <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} /> : null}
              </View>
            );
            const etiqueta = [
              accion.titulo,
              etiquetaDeLaAccion(accion),
              accion.completada ? 'cumplida' : accion.bloqueada ? 'se abre al completar la primera' : null,
              esDeHoy ? 'abre Training' : puedeAgendar ? 'abre Agendar' : null,
            ]
              .filter(Boolean)
              .join(', ');
            return tocable ? (
              <Presionable key={accion.id} onPress={() => alTocarUna(accion, esDeHoy)} accessibilityRole="button" accessibilityLabel={etiqueta}>
                {fila}
              </Presionable>
            ) : (
              <View key={accion.id} accessible accessibilityLabel={etiqueta}>
                {fila}
              </View>
            );
          })}
          {puedeAgendar ? (
            <Presionable onPress={alAgendar} accessibilityRole="button" style={estilos.enlace}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita, fontSize: 15 }]}>Agendar otro día</Text>
            </Presionable>
          ) : null}
        </View>
      ) : (
        <View style={estilos.bloque}>
          <Text style={[t.body, { color: c.textSoft }]}>Todavía no agendaste acciones de {nombreDelEje}.</Text>
          {puedeAgendar ? <GoldButton label="Agendar mis acciones" onPress={alAgendar} variant="outline" icon="chevron" textStyle={TEXTO_DEL_BOTON} /> : null}
        </View>
      )}

      {children}
      {error ? <Text style={[t.small, { color: c.danger, marginTop: 8 }]}>{error}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * f. Tu 80/20
 * ---------------------------------------------------------------------------------------------- */

export function TarjetaOchentaVeinte({ alAbrir }: { alAbrir: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={alAbrir}
      accessibilityRole="button"
      accessibilityLabel="Tu 80/20. Prioriza lo que más acerca tu meta."
      style={[estilos.tarjeta, estilos.filaAncha, { borderColor: c.border, backgroundColor: c.cardBg }]}
    >
      <View style={[estilos.medallon, { backgroundColor: c.goldWash }]}>
        <Icon name="chartNoAxesColumn" size={TAMANO_ICONO.normal} color={c.goldInk} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>Tu 80/20</Text>
        <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>Prioriza lo que más acerca tu meta.</Text>
      </View>
      <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
    </Presionable>
  );
}

/** La regla de Pareto, con las acciones de HOY del eje y su estado (la verde primero; las otras esperan con candado). */
export function HojaOchentaVeinte({
  visible,
  alCerrar,
  eje,
  deHoy,
}: {
  visible: boolean;
  alCerrar: () => void;
  eje: RocaDiariaApi['eje'];
  deHoy: readonly RocaDiariaApi[];
}) {
  const { c, t } = useTheme();
  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo="Tu 80/20" subtitulo={ETIQUETA_EJE[eje]} tamano="grande">
      <View style={estilos.cuerpoDeLaHoja}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 17 }]}>Prioriza lo que más acerca tu meta.</Text>
        <Text style={[t.body, { color: c.textSoft }]}>
          Pocas acciones mueven casi todo tu avance. En cada eje la acción verde va primero: es la que más mueve la aguja. Mientras no la
          cumplas, las otras de ese eje esperan con un candado.
        </Text>
        {deHoy.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={[t.small, estilos.rotulo, { color: c.goldInk }]}>Tus acciones de hoy · {ETIQUETA_EJE[eje]}</Text>
            {deHoy.map(accion => {
              const estado = estadoDeLaAccion(accion, 24 * 60);
              const hora = horaCortaDeLaAccion(accion);
              return (
                <View key={accion.id} style={[estilos.accion, { borderColor: c.border, backgroundColor: c.cardBgAlt }]} accessible>
                  <View style={[estilos.marca, { backgroundColor: colorDePareto(accion.color, c) }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[t.body, estilos.tituloDeLaAccion, { color: c.textStrong }]}>{accion.titulo}</Text>
                    <Text style={[t.small, { color: c.textSoft }]}>
                      {NOMBRE_DEL_COLOR[accion.color]}
                      {hora ? ` · ${hora}` : ''} · {estado === 'sePaso' ? 'Pendiente' : textoDelEstado(estado, null)}
                    </Text>
                  </View>
                  {estado === 'cumplida' ? (
                    <Icon name="checkCircle" size={TAMANO_ICONO.normal} color={c.success} />
                  ) : estado === 'esperaALaVerde' ? (
                    <Icon name="lock" size={TAMANO_ICONO.normal} color={c.chevron} />
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[t.small, { color: c.textSoft }]}>Hoy no tienes acciones agendadas en este eje.</Text>
        )}
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17 },
  filaAncha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  rotulo: { fontFamily: fuentes.media, fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  suave: { marginTop: 8 },
  cifras: { fontVariant: ['tabular-nums'] },
  objetivo: { fontSize: 18, lineHeight: 25, fontFamily: fuentes.negrita, marginTop: 8 },
  filaDeCifras: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  linea: { flex: 1, fontSize: 15 },
  porcentaje: { fontSize: 18, fontFamily: fuentes.negrita },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  // La línea «Inicio · Actual · Meta» puede ocupar dos renglones: 12 de aire hasta la barra para que no quede pegada.
  barraDelObjetivo: { marginTop: 12 },
  relleno: { height: '100%', borderRadius: 4 },
  /** «Por confirmar»: una píldora con borde, a la izquierda, antes del texto del objetivo. */
  chipPorConfirmar: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  textoDelChip: { fontFamily: fuentes.negrita, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  puntos: { width: 48, height: 48, marginRight: -12, marginVertical: -10, alignItems: 'center', justifyContent: 'center' },
  esteMes: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  bloque: { gap: 12, marginTop: 8 },
  enlace: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  revisada: { marginTop: 8, fontFamily: fuentes.negrita, fontSize: 15 },
  subtarjeta: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 },
  lista: { gap: 10, marginTop: 10 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 60 },
  tituloDeLaAccion: { fontSize: 16, lineHeight: 22, fontFamily: fuentes.media },
  marca: { width: 6, height: 34, borderRadius: 3 },
  medallon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cuerpoDeLaHoja: { gap: 14, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
});
