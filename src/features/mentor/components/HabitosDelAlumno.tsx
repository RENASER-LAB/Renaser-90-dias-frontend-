import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { Card, MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { aHoraCorta, etiquetaDeCategoria } from '../../habits/api/habitsMappers';
import { useHabitosDelAlumno } from '../hooks/useHabitosDelAlumno';
import type { HabitoDelAlumnoApi } from '../api/mentorSchemas';
import { diaYMes } from '../utils/fechasLegibles';

/**
 * Cómo tiene armado su plan de hábitos el aprendiz: qué lleva, a qué hora, con qué recordatorio
 * y qué cambios pidió que todavía no rigen.
 *
 * Es la otra mitad de lo que el mentor necesita para hablar con alguien. Arriba, la semana dice
 * QUÉ pasó; acá dice CÓMO está configurado, que es lo que explica buena parte de lo de arriba:
 * un hábito que vence a las 06:00 y otro que vence a las 23:00 fallan por motivos distintos.
 *
 * ## Las horas son las del APRENDIZ y se muestran sin convertir
 *
 * `triggerTime` y `limitTime` llegan en la zona que el propio endpoint informa (`timeZone`).
 * Convertirlas al huso del teléfono del mentor las correría una o dos horas sin avisar, y "su
 * ritual de las 7" pasaría a leerse "las 9". Se muestran tal cual y se dice de quién es el reloj.
 *
 * ## Si el endpoint no está, acá no hay nada
 *
 * Un 404 (todavía sin desplegar) o un 403 (ya no acompaña a esta persona) no dibujan la sección:
 * ni título, ni tarjeta, ni error rojo. Sólo un problema transitorio —sin red, respuesta
 * inesperada— se dice, y se dice en una línea.
 */
export function HabitosDelAlumno({ grupoId, alumnoId }: { grupoId: string | null; alumnoId: string }) {
  const { c, t } = useTheme();
  const { habitos, cargando, fallo } = useHabitosDelAlumno(grupoId, alumnoId);

  /* La sección entera desaparece. Un mentor no puede hacer nada con "404" y un exmentor no
     tiene por qué enterarse de que existe algo que ya no puede ver. */
  if (fallo === 'no_disponible' || fallo === 'sin_permiso' || fallo === 'sin_celula') return null;
  /* Sin grupo no hay a quién preguntarle: no se dibuja una tarjeta vacía que en realidad
     significa "no pregunté". */
  if (!grupoId) return null;
  if (!cargando && !fallo && !habitos) return null;

  return (
    <Aparicion retardo={170} style={{ marginTop: 20 }}>
      <MicroLabel>SUS HÁBITOS</MicroLabel>
      <Card style={estilos.tarjeta}>
        {cargando ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 13 }]}>Cargando sus hábitos…</Text>
        ) : fallo ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
            {fallo === 'sin_red'
              ? 'No se pudieron cargar sus hábitos. Revisa tu conexión y vuelve a entrar.'
              : 'No se pudieron cargar sus hábitos.'}
          </Text>
        ) : habitos ? (
          <>
            <Text style={[t.body, { color: c.text, fontSize: 13.5, fontFamily: 'Jost_500Medium' }]}>
              {habitos.programDay > 0 ? `Día ${habitos.programDay} de 90` : 'Todavía no arrancó su programa'}
            </Text>
            {/* De quién es el reloj con el que se leen las horas de abajo. Sin esto, un mentor
                en otro huso no tiene forma de saber que "07:00" no son sus siete. */}
            <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5, marginTop: 6, lineHeight: 17 }]}>
              Hoy para él es {diaYMes(habitos.localDate)} · horarios en {habitos.timeZone}
            </Text>
            <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5, marginTop: 2, lineHeight: 17 }]}>
              {textoDeCupoDeCambios(habitos.scheduleEdits)}
            </Text>

            {habitos.habits.length === 0 ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 12, lineHeight: 19 }]}>
                Sin hábitos configurados.
              </Text>
            ) : (
              habitos.habits.map(h => <FilaHabito key={h.habitId} habito={h} />)
            )}
          </>
        ) : null}
      </Card>
    </Aparicion>
  );
}

/**
 * Un hábito. El título es el que ve el aprendiz —si lo renombró, el suyo—, y el del catálogo se
 * dice aparte: el mentor busca "RITUAL TIERRA - AGUA - FUEGO" y el aprendiz lo llama "mediodía",
 * así que mostrar sólo uno de los dos deja a alguien sin poder nombrar la misma cosa.
 */
function FilaHabito({ habito }: { habito: HabitoDelAlumnoApi }) {
  const { c, t } = useTheme();

  const titulo = habito.personalTitle?.trim() || habito.catalogTitle;
  const renombrado = Boolean(habito.personalTitle?.trim()) && habito.personalTitle?.trim() !== habito.catalogTitle;

  const etiquetas = [etiquetaDeCategoria(habito.category), habito.isPersonal ? 'Propio' : null]
    .filter((e): e is string => Boolean(e));

  const lineas = [
    lineaDeHorario(habito),
    lineaDeRecordatorio(habito),
    lineaDeCambioPendiente(habito),
    lineaDeDesbloqueo(habito),
    lineaDeSemanal(habito),
  ].filter((l): l is string => l !== null);

  return (
    <View style={[estilos.habito, { borderColor: c.border }]}>
      <Text style={[t.body, { color: c.text, fontSize: 13.5 }]}>{titulo}</Text>
      {renombrado ? (
        <Text style={[t.micro, { color: c.textSoft, fontSize: 11, lineHeight: 16 }]}>
          En el catálogo: {habito.catalogTitle}
        </Text>
      ) : null}
      {etiquetas.length > 0 ? (
        <Text style={[t.micro, { color: c.micro, fontSize: 11 }]}>{etiquetas.join(' · ')}</Text>
      ) : null}
      {lineas.map((linea, i) => (
        <Text
          key={`${habito.habitId}-${i}`}
          style={[t.micro, { color: c.textSoft, fontSize: 11.5, lineHeight: 17 }]}
        >
          {linea}
        </Text>
      ))}
    </View>
  );
}

/** `07:00:00` + `09:00:00` → `07:00 – 09:00`. Sin hora de cierre no vence dentro del día. */
function lineaDeHorario(h: HabitoDelAlumnoApi): string {
  const disparo = aHoraCorta(h.triggerTime);
  const limite = aHoraCorta(h.limitTime);
  const propio = h.customSchedule ? ' · horario propio' : '';
  if (!disparo && !limite) return `Sin horario${propio}`;
  if (!limite) return `Desde las ${disparo}, sin hora de cierre${propio}`;
  if (!disparo) return `Hasta las ${limite}${propio}`;
  return `${disparo} – ${limite}${propio}`;
}

/**
 * `null` cuando el servidor no informa el recordatorio: no se dice nada. "Sin recordatorio" es
 * una afirmación distinta de "no sé si tiene", y sólo la primera se puede sostener con `false`.
 */
function lineaDeRecordatorio(h: HabitoDelAlumnoApi): string | null {
  if (h.reminderEnabled === null || h.reminderEnabled === undefined) return null;
  if (!h.reminderEnabled) return 'Sin recordatorio';
  const minutos = h.reminderMinutesBefore;
  return minutos === null || minutos === undefined
    ? 'Con recordatorio'
    : `Recordatorio ${minutos} min antes`;
}

/** El horario que ya pidió y todavía no rige. El guion es literal: el campo puede venir nulo. */
function lineaDeCambioPendiente(h: HabitoDelAlumnoApi): string | null {
  const cambio = h.pendingScheduleChange;
  if (!cambio) return null;
  const disparo = aHoraCorta(cambio.triggerTime) || '—';
  const limite = aHoraCorta(cambio.limitTime) || '—';
  return `Desde el ${diaYMes(cambio.effectiveDate)}: ${disparo} – ${limite}`;
}

/**
 * En qué día de programa se le abre. `chosenByPerson: false` no se traduce a "asignado por el
 * sistema" — eso sería afirmar de dónde salió el día, que el campo no dice.
 */
function lineaDeDesbloqueo(h: HabitoDelAlumnoApi): string | null {
  if (!h.unlock) return null;
    // `programDay`/`chosenByTrainee` y no `unlockDay`/`chosenByPerson`: son los nombres que manda
  // `HabitUnlockResponse` del backend, los mismos de `/admin/trainees/{id}/habits`.
  return `Desbloqueo: día ${h.unlock.programDay}${h.unlock.chosenByTrainee ? ' · elegido por el aprendiz' : ''}`;
}

/** Hábito semanal cuyo día elige el aprendiz. Sin día elegido no se inventa ninguno. */
function lineaDeSemanal(h: HabitoDelAlumnoApi): string | null {
  if (!h.weeklyDayChoice) return null;
  return h.chosenWeeklyDate
    ? `Semanal, elige el día · ${diaYMes(h.chosenWeeklyDate)}`
    : 'Semanal, elige el día';
}

/**
 * El cupo de cambios de horario. Se muestran los tres números del servidor sin recalcular
 * ninguno: si `remaining` dejara de ser `limit − used` por una regla nueva, la pantalla diría
 * lo que el backend decide y no lo que ella supone.
 */
function textoDeCupoDeCambios(cupo: { used: number; remaining: number; limit: number; period: string }): string {
  const periodo = PERIODO[cupo.period];
  return `Cambios de horario${periodo ? ` ${periodo}` : ''}: ${cupo.used} de ${cupo.limit} · quedan ${cupo.remaining}`;
}

/** Sólo los períodos confirmados por el contrato. Uno desconocido no se traduce: se omite. */
const PERIODO: Record<string, string | undefined> = {
  DAY: 'hoy',
  WEEK: 'esta semana',
  MONTH: 'este mes',
};

const estilos = StyleSheet.create({
  tarjeta: { marginTop: 8 },
  habito: { borderTopWidth: 1, paddingTop: 10, marginTop: 10, gap: 3 },
});
