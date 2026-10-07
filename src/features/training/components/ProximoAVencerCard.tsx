import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { HabitItem } from '../../../screens/TrainingScreen';

/**
 * El hábito más próximo a vencer, arriba de las cinco dimensiones (pedido del dueño, 2026-09-05).
 *
 * Qué muestra: cuál es, cuánto le queda y cuántos puntos hay en juego.
 *
 * Tres decisiones que conviene no deshacer:
 *
 * 1. **El plazo lo manda el backend, no lo calcula la app.** `deadline` es el `plazoEvidencia`
 *    del track: un instante absoluto, ya resuelto en la zona horaria del aprendiz. La app solo
 *    resta contra el reloj del teléfono. Si el cliente reconstruyera la ventana a partir de
 *    `horaLimite` tendría que conocer la zona del participante, la gracia y la extensión — tres
 *    reglas de negocio que ya viven (y se prueban) del otro lado.
 * 2. **Los puntos también.** `pointsAtStake` sale de la misma escala que después cobra el
 *    servidor (D-97). Calcularlos acá sería garantizar que algún día la pantalla diga un número
 *    y la cuenta sume otro.
 * 3. **Si no hay nada por vencer, no se dibuja nada.** No hay estado vacío ni tarjeta apagada:
 *    un aprendiz que ya cerró su día no necesita un recuadro diciéndoselo.
 */

/** Se refresca cada 30 s: es una cuenta regresiva en minutos, no un cronómetro. */
const REFRESCO_MS = 30_000;

/**
 * El más próximo a vencer entre los que TODAVÍA se pueden entregar.
 *
 * Descarta los hechos (`done`), los que no vencen (`deadline` nulo) y los que ya se pasaron: un
 * hábito cuyo plazo ya pasó no está "por vencer". Se puede registrar igual hasta el fin de su día,
 * sin puntos, y eso lo dice su tarjeta (`avisoDeHoraPasada`). *Corregido 2026-10-06: decía «sería
 * empujar a la persona a algo que ya no puede hacer».*
 */
export function proximoAVencer(habits: HabitItem[], ahora: number): HabitItem | null {
  let proximo: HabitItem | null = null;
  let menorPlazo = Number.POSITIVE_INFINITY;
  for (const habit of habits) {
    if (habit.done || !habit.deadline) {
      continue;
    }
    const plazo = Date.parse(habit.deadline);
    if (Number.isNaN(plazo) || plazo <= ahora || plazo >= menorPlazo) {
      continue;
    }
    menorPlazo = plazo;
    proximo = habit;
  }
  return proximo;
}

/** "1 h 20 min", "45 min", "menos de 1 min". Nunca segundos: es un aviso, no un cronómetro. */
export function tiempoRestante(deadline: string, ahora: number): string {
  const minutos = Math.floor((Date.parse(deadline) - ahora) / 60_000);
  if (minutos < 1) {
    return 'menos de 1 min';
  }
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

type Props = {
  habits: HabitItem[];
  /** Abre el hábito para completarlo o subir su evidencia. */
  onAbrir: (habit: HabitItem) => void;
};

export function ProximoAVencerCard({ habits, onAbrir }: Props) {
  const { c, t } = useTheme();
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), REFRESCO_MS);
    return () => clearInterval(id);
  }, []);

  const habit = proximoAVencer(habits, ahora);
  if (!habit || !habit.deadline) {
    return null;
  }

  const puntos = habit.pointsAtStake;
  const maximo = habit.maxPoints;

  /*
   * Rediseño de Training (2026-10-05): el cronómetro de Lucide (`timer`) dice «se acaba el
   * tiempo»; el asterisco de antes era el mismo dibujo de Espíritu, de «Ponerle otro nombre» y de El
   * Método. Arriba, lo que urge («Vence en 12 min», a 16) y no el rótulo en versalitas de 10,5.
   */
  return (
    <Presionable
      onPress={() => onAbrir(habit)}
      accessibilityRole="button"
      accessibilityLabel={`Próximo a vencer: ${habit.title}. Vence en ${tiempoRestante(habit.deadline, ahora)}.`}
      style={[styles.card, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
    >
      <View style={styles.encabezado}>
        <Icon name="timer" size={TAMANO_ICONO.normal} color={c.goldInk} />
        <Text style={[t.cardTitle, styles.vence, { color: c.goldInk }]}>
          Vence en {tiempoRestante(habit.deadline, ahora)}
        </Text>
      </View>

      <View style={styles.pie}>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, flexShrink: 1 }]} numberOfLines={2}>
          {habit.title}
        </Text>
        {/* Sin puntos informados (backend viejo, o hábito ya terminal) no se inventa un número:
            simplemente no se muestra la parte de puntos. */}
        {typeof puntos === 'number' && (
          <Text style={[t.small, styles.puntos, { color: c.textSoft }]}>
            {puntos}
            {typeof maximo === 'number' ? ` / ${maximo}` : ''} pts en juego
          </Text>
        )}
      </View>
    </Presionable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vence: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  puntos: {
    fontSize: 14,
    fontFamily: 'Jost_500Medium',
    fontVariant: ['tabular-nums'],
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
});
