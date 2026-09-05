import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Icon } from '../../../components/Icon';
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
 * hábito vencido no está "por vencer", y mostrarlo con "hace 2 h" sería empujar a la persona a
 * algo que ya no puede hacer.
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

  return (
    <Pressable
      onPress={() => onAbrir(habit)}
      accessibilityRole="button"
      accessibilityLabel={`Próximo a vencer: ${habit.title}. Quedan ${tiempoRestante(habit.deadline, ahora)}.`}
      style={[styles.card, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
    >
      <View style={styles.encabezado}>
        <Icon name="spark" size={14} color={c.gold} />
        <Text style={[t.micro, { color: c.gold }]}>PRÓXIMO A VENCER</Text>
      </View>

      <Text style={[t.cardTitle, { color: c.text, fontSize: 15.5 }]} numberOfLines={2}>
        {habit.title}
      </Text>

      <View style={styles.pie}>
        <Text style={[t.body, { color: c.text, fontSize: 13.5 }]}>
          Te quedan {tiempoRestante(habit.deadline, ahora)}
        </Text>
        {/* Sin puntos informados (backend viejo, o hábito ya terminal) no se inventa un número:
            simplemente no se muestra la parte de puntos. */}
        {typeof puntos === 'number' && (
          <Text style={[t.cardTitle, { color: c.gold, fontSize: 13.5 }]}>
            {puntos}
            {typeof maximo === 'number' ? ` / ${maximo}` : ''} pts en juego
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
});
