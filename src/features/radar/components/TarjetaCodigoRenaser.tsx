import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { Card, MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { horaEnPunto, type EstadoRadar } from '../utils/slotsDelRadar';

/**
 * El Código Renaser en la pantalla de Hoy.
 *
 * Cuatro estados, y sólo uno pide algo:
 *
 *  - **abierto** — borde dorado, marcado como innegociable, con el botón para responder.
 *  - **respondido** — confirmación tranquila y cuándo es el siguiente. No desaparece: que se vea
 *    hecho es parte de sostener el hábito.
 *  - **fuera-de-ventana, pero el día todavía no arrancó** — una línea gris diciendo a qué hora
 *    empieza. Pasado el último slot del día no se dibuja nada: recordarle a alguien a las 23:00
 *    algo que ya no puede hacer es ruido.
 *  - **apagado** — nada. Día 0, día 8 en adelante, o el interruptor general.
 *
 * No hay estado "atrasado" y no lo va a haber: los slots que pasaron no se acumulan (ver
 * `config/configRadar.ts`).
 *
 * Rediseño de Hoy (2026-10-05): los rótulos del estado van en tipo oración («En espera»,
 * «Registrado», «Innegociable», «Abierto»; eran versales espaciadas), los íconos a
 * 20, el chevron a 16, y la tarjeta abierta responde al dedo (`Presionable`). La diana (`target`) se
 * queda hasta que entre `compass`, que dibuja el rediseño de Plan.
 */
export function TarjetaCodigoRenaser({
  estado,
  obligatorio,
  minutosParaAbrir,
  onResponder,
}: {
  estado: EstadoRadar;
  /** Cuenta atrás hasta que el formulario se abre solo. 0 = ya está en pantalla. */
  minutosParaAbrir: number;
  /** `true` = este rol no puede cerrarlo. Sólo cambia el rótulo; el formulario es el mismo. */
  obligatorio: boolean;
  onResponder: () => void;
}) {
  const { c, t } = useTheme();

  if (estado.tipo === 'apagado') return null;

  if (estado.tipo === 'fuera-de-ventana') {
    if (estado.proximaHora === null) return null;
    return (
      <Card>
        <View style={styles.cabecera}>
          <MicroLabel>Código Renaser</MicroLabel>
          <Text style={[t.small, { color: c.micro, fontFamily: 'Jost_500Medium' }]}>En espera</Text>
        </View>
        <View style={styles.fila}>
          <Icon name="clock" size={TAMANO_ICONO.normal} color={c.micro} />
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, flex: 1 }]}>
            El primer registro del día es a las {horaEnPunto(estado.proximaHora)}.
          </Text>
        </View>
      </Card>
    );
  }

  if (estado.tipo === 'respondido') {
    return (
      <Card>
        <View style={styles.cabecera}>
          <MicroLabel>Código Renaser · {estado.slot.etiqueta}</MicroLabel>
          <Text style={[t.small, { color: c.success, fontFamily: 'Jost_700Bold' }]}>Registrado</Text>
        </View>
        <View style={styles.fila}>
          <Icon name="checkCircle" size={TAMANO_ICONO.normal} color={c.success} />
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, flex: 1 }]}>
            {estado.proximaHora !== null
              ? `Listo por esta hora. El siguiente a las ${horaEnPunto(estado.proximaHora)}.`
              : 'Listo. Era el último registro del día.'}
          </Text>
        </View>
      </Card>
    );
  }

  const minutos = estado.minutosParaCerrar;
  return (
    <Presionable onPress={onResponder} accessibilityRole="button" accessibilityLabel="Responder el Código Renaser de esta hora">
      <Card style={{ borderColor: c.gold }}>
        <View style={styles.cabecera}>
          <MicroLabel>Código Renaser · {estado.slot.etiqueta}</MicroLabel>
          <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
            {obligatorio ? 'Innegociable' : 'Abierto'}
          </Text>
        </View>
        <View style={styles.fila}>
          <Icon name="target" size={TAMANO_ICONO.normal} color={c.goldInk} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[t.cardTitle, { color: c.text }]}>¿Dónde estás ahora mismo?</Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 12, lineHeight: 18 }]}>
              {minutosParaAbrir > 0
                ? `Cinco preguntas, un minuto. Se abre en ${minutosParaAbrir} min — o tócalo para empezar ya.`
                : `Cinco preguntas, un minuto. Se cierra a las ${estado.slot.cierraA}${minutos <= 15 ? ` · quedan ${minutos} min` : ''}.`}
            </Text>
          </View>
          <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
        </View>
      </Card>
    </Presionable>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
