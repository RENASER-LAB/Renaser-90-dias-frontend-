import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { PausaDelSemaforo } from '../types/semaforo.types';
import { fechaLarga, sumarDias } from '../utils/lecturaDelSemaforo';

/** Lo que propone el selector al abrir. Es solo un punto de partida: se cambia con − y +. */
const DIAS_PROPUESTOS = 7;

/**
 * Pausar el semáforo, solo para el staff con programa propio (`obligatorio === false`). Al aprendiz
 * esto no se le muestra: su semáforo no se puede apagar (§1 del contrato).
 *
 * **La pausa siempre tiene fecha de regreso** — es la regla del dueño: no hay "hasta que lo encienda
 * de nuevo". La fecha se elige con un selector de días simple, − y +, con la fecha escrita en
 * palabras en el medio. La app no tiene un calendario reutilizable (`DatePickerField` es de fecha de
 * nacimiento), y para elegir "hasta cuándo" alcanza con esto.
 *
 * `hoy` llega de afuera, sacado de lo que dijo el servidor (`hoyDeLaPersona`), no del teléfono.
 * Las dos fechas son inclusive, y el servidor vuelve a validar que `hasta` no sea antes de hoy.
 */
export function ControlDePausa({
  pausa,
  hoy,
  guardando,
  error,
  onPausar,
  onReanudar,
}: {
  pausa: PausaDelSemaforo | null;
  hoy: string;
  guardando: boolean;
  error: string | null;
  onPausar: (hasta: string) => void;
  onReanudar: () => void;
}) {
  const { c, t } = useTheme();
  const [dias, setDias] = useState(DIAS_PROPUESTOS);
  const hasta = sumarDias(hoy, dias - 1);
  const cuerpo = [t.body, { color: c.text, fontSize: 16, lineHeight: 23 }];

  if (pausa) {
    const porEmpezar = pausa.desde > hoy;
    return (
      <View style={{ gap: 12 }}>
        <Text style={cuerpo}>
          {porEmpezar
            ? `Tu semáforo queda en pausa del ${fechaLarga(pausa.desde)} al ${fechaLarga(pausa.hasta)}.`
            : `Tu semáforo está en pausa hasta el ${fechaLarga(pausa.hasta)}.`}
        </Text>
        <Text style={[cuerpo, { color: c.textSoft }]}>
          Esos días no se miden ni salen en rojo. El {fechaLarga(sumarDias(pausa.hasta, 1))} vuelve a medirse solo.
        </Text>
        <Boton texto="Volver a medir desde hoy" onPress={onReanudar} ocupado={guardando} principal={false} />
        {error ? <Text style={[cuerpo, { color: c.danger }]}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={[cuerpo, { color: c.textSoft }]}>
        Si vas a estar fuera unos días, puedes pausarlo. Esos días no se miden ni salen en rojo, lo
        anterior se conserva y, al pasar la fecha, vuelve a medirse solo.
      </Text>

      <Text style={[t.cardTitle, { color: c.textStrong }]}>¿Hasta qué día?</Text>
      <View style={estilos.selector}>
        <Paso
          signo="−"
          etiqueta="Un día menos"
          deshabilitado={dias <= 1 || guardando}
          onPress={() => setDias(d => Math.max(1, d - 1))}
        />
        <View style={estilos.fecha} accessibilityLiveRegion="polite">
          <Text style={[t.cardTitle, { color: c.textStrong, textAlign: 'center' }]}>{fechaLarga(hasta)}</Text>
          <Text style={[t.small, { color: c.textSoft, fontSize: 14, textAlign: 'center' }]}>
            {dias === 1 ? 'Solo hoy' : `${dias} días, desde hoy`}
          </Text>
        </View>
        <Paso signo="+" etiqueta="Un día más" deshabilitado={guardando} onPress={() => setDias(d => d + 1)} />
      </View>

      <Boton texto={`Pausar hasta el ${fechaLarga(hasta)}`} onPress={() => onPausar(hasta)} ocupado={guardando} principal />
      {error ? <Text style={[cuerpo, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

/** Un botón del selector: 48 × 48, pulsable con una mano (AGENTS.md §4). */
function Paso({
  signo,
  etiqueta,
  deshabilitado,
  onPress,
}: {
  signo: string;
  etiqueta: string;
  deshabilitado: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => [
        estilos.paso,
        { borderColor: c.borderStrong, backgroundColor: pressed ? c.goldWash : c.cardBg, opacity: deshabilitado ? 0.4 : 1 },
      ]}
    >
      <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 24, lineHeight: 28, color: c.goldInk }}>{signo}</Text>
    </Pressable>
  );
}

/**
 * Botón de texto, 48 px. El principal es dorado lleno; el otro lleva borde porque es un control y
 * sin contorno dejaría de parecer pulsable (mismo criterio que la invitación al programa en Hoy).
 */
function Boton({
  texto,
  onPress,
  ocupado,
  principal,
}: {
  texto: string;
  onPress: () => void;
  ocupado: boolean;
  principal: boolean;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado}
      accessibilityRole="button"
      accessibilityState={{ disabled: ocupado, busy: ocupado }}
      style={({ pressed }) => [
        estilos.boton,
        principal
          ? { backgroundColor: c.gold, borderColor: c.gold }
          : { backgroundColor: 'transparent', borderColor: c.borderStrong },
        { opacity: ocupado ? 0.6 : pressed ? 0.8 : 1 },
      ]}
    >
      {ocupado ? (
        <ActivityIndicator color={principal ? c.onGold : c.goldInk} />
      ) : (
        <Text
          style={[
            t.body,
            { fontSize: 16, textAlign: 'center', color: principal ? c.onGold : c.textStrong, fontFamily: 'Jost_700Bold' },
          ]}
        >
          {texto}
        </Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  selector: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fecha: { flex: 1, minWidth: 0, gap: 2 },
  paso: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  /* `paddingVertical` además del `minHeight`: con la letra del sistema en grande el texto pasa a dos
     renglones y el botón tiene que crecer, no cortarlo (visto en `TarjetaAccionesDelDia`). */
  boton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
