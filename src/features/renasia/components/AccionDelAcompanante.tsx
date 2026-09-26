import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { GoldButton } from '../../../components/GoldButton';
import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { EstadoPropuestaUI, PedidoDeFotoUI, PropuestaUI } from '../types/renasia.types';
import { elegirAccionVisible, elegirPedidoVisible, primeraFrase, resumenCorto } from '../utils/accionDelOrbe';
import { TEXTO_REGISTRADO } from '../utils/pedidosDeFoto';
import { estadoVisible } from '../utils/propuestas';
import { ESPACIO_PARA_LANZADOR } from './RenasiaLauncher';

type Props = {
  propuestas: PropuestaUI[];
  onConfirmar: (id: string) => void;
  onCancelar: (id: string) => void;
  /** Fotos de hábitos que pidió el acompañante (evento `evidencia`, 2026-09-26). */
  pedidosDeFoto?: PedidoDeFotoUI[];
  onTomarFoto?: (pedido: PedidoDeFotoUI) => void;
};

/** Cómo se cierra la hoja: ícono y una sola frase. Pedido del dueño: directo, sin párrafos. */
function cierreDe(estado: EstadoPropuestaUI, mensaje?: string | null): { icono: IconName; texto: string } {
  switch (estado) {
    case 'confirmada':
      return { icono: 'checkCircle', texto: `Hecho${primeraFrase(mensaje) ? ` · ${primeraFrase(mensaje)}` : ''}` };
    case 'cancelada':
      return { icono: 'close', texto: 'Cancelado · No se cambió nada' };
    case 'vencida':
      return { icono: 'clock', texto: 'Venció · Pídeselo de nuevo' };
    default:
      return { icono: 'close', texto: `No se pudo${primeraFrase(mensaje) ? ` · ${primeraFrase(mensaje)}` : ''}` };
  }
}

/**
 * La hoja de acción del orbe (D-163): una sola tarjeta flotante, abajo y siempre a la vista. Una
 * línea con lo que el acompañante propone (tocándola se ve el detalle: desde cuándo, cuántos
 * cambios quedan) y los botones para decidir. Al confirmar se convierte en "Hecho" con una frase y
 * se retira sola; cancelada o fallida, igual. Nada se apila en la conversación.
 *
 * Nada cambia hasta que la persona toca Confirmar: la voz nunca confirma (D-132, D-153).
 */
export function AccionDelAcompanante({ propuestas, onConfirmar, onCancelar, pedidosDeFoto = [], onTomarFoto }: Props) {
  const { c, t } = useTheme();
  const [, volverAEvaluar] = useState(0);
  const [detalleDe, setDetalleDe] = useState<string | null>(null);
  const accion = elegirAccionVisible(propuestas, Date.now());
  const pedido = onTomarFoto ? elegirPedidoVisible(pedidosDeFoto, Date.now()) : null;

  // Una acción ya resuelta se queda unos segundos y después la hoja se retira sola.
  useEffect(() => {
    const ahora = Date.now();
    const plazos = [elegirAccionVisible(propuestas, ahora)?.seVaEnMs, elegirPedidoVisible(pedidosDeFoto, ahora)?.seVaEnMs]
      .filter((ms): ms is number => typeof ms === 'number');
    if (plazos.length === 0) return;
    const reloj = setTimeout(() => volverAEvaluar(n => n + 1), Math.min(...plazos) + 50);
    return () => clearTimeout(reloj);
  }, [propuestas, pedidosDeFoto]);

  // Una sola cosa a la vez: la propuesta pendiente manda; después, la foto pedida; después, lo
  // último que se resolvió.
  const propuestaPendiente = accion !== null && accion.seVaEnMs === null;
  if (pedido && onTomarFoto && !propuestaPendiente && (pedido.seVaEnMs === null || !accion)) {
    return <HojaPedidoDeFoto pedido={pedido.pedido} onTomarFoto={() => onTomarFoto(pedido.pedido)} />;
  }
  if (!accion) return null;
  const { propuesta, otrasPendientes } = accion;
  const estado = estadoVisible(propuesta, Date.now());
  const enCurso = estado === 'confirmando' || estado === 'cancelando';
  const pendiente = estado === 'pendiente' || enCurso;
  const conDetalle = detalleDe === propuesta.id;

  return (
    <View
      style={[styles.hoja, { bottom: ESPACIO_PARA_LANZADOR, backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Aparicion desplazamiento={12} style={styles.contenido}>
        {pendiente ? (
          <>
            <Pressable
              onPress={() => setDetalleDe(conDetalle ? null : propuesta.id)}
              accessibilityRole="button"
              accessibilityLabel={conDetalle ? 'Ocultar el detalle' : 'Ver el detalle de la propuesta'}
              style={styles.linea}
            >
              <Icon name="spark" size={18} color={c.goldInk} />
              <Text style={[t.body, styles.texto, { color: c.text }]} numberOfLines={conDetalle ? 8 : 2}>
                {conDetalle ? propuesta.resumen : resumenCorto(propuesta.resumen)}
              </Text>
              {otrasPendientes > 0 ? (
                <Text style={[t.micro, { color: c.textSoft }]}>+{otrasPendientes}</Text>
              ) : null}
            </Pressable>
            <View style={styles.botones}>
              <GoldButton
                label="CANCELAR"
                variant="outline"
                onPress={() => onCancelar(propuesta.id)}
                disabled={enCurso}
                loading={estado === 'cancelando'}
                style={styles.boton}
              />
              <GoldButton
                label="CONFIRMAR"
                onPress={() => onConfirmar(propuesta.id)}
                disabled={enCurso}
                loading={estado === 'confirmando'}
                style={styles.boton}
              />
            </View>
          </>
        ) : (
          <View style={styles.linea}>
            <Icon
              name={cierreDe(estado, propuesta.mensaje).icono}
              size={18}
              color={estado === 'confirmada' ? c.success : estado === 'fallida' ? c.danger : c.textSoft}
            />
            <Text style={[t.body, styles.texto, { color: c.text }]} numberOfLines={2}>
              {cierreDe(estado, propuesta.mensaje).texto}
            </Text>
          </View>
        )}
      </Aparicion>
    </View>
  );
}

/** La hoja cuando el acompañante pidió una foto: el hábito y "Tomar foto"; registrada, una línea. */
function HojaPedidoDeFoto({ pedido, onTomarFoto }: { pedido: PedidoDeFotoUI; onTomarFoto: () => void }) {
  const { c, t } = useTheme();
  const registrado = pedido.estado === 'registrado';
  const cerrado = registrado || pedido.estado === 'vencido';
  const texto = registrado
    ? pedido.mensaje || TEXTO_REGISTRADO
    : cerrado
      ? `${pedido.titulo} · ${pedido.mensaje || 'Ya venció'}`
      : pedido.titulo;
  return (
    <View
      style={[styles.hoja, { bottom: ESPACIO_PARA_LANZADOR, backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Aparicion desplazamiento={12} style={styles.contenido}>
        <View style={styles.linea}>
          <Icon
            name={registrado ? 'checkCircle' : cerrado ? 'clock' : 'camera'}
            size={18}
            color={registrado ? c.success : cerrado ? c.textSoft : c.goldInk}
          />
          <Text style={[t.body, styles.texto, { color: c.text }]} numberOfLines={2}>
            {texto}
          </Text>
        </View>
        {!cerrado ? (
          <GoldButton
            label="TOMAR FOTO"
            onPress={onTomarFoto}
            disabled={pedido.estado === 'abriendo'}
            loading={pedido.estado === 'abriendo'}
            style={styles.botonFoto}
          />
        ) : null}
      </Aparicion>
    </View>
  );
}

const styles = StyleSheet.create({
  hoja: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  contenido: { gap: 10 },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  texto: { flex: 1 },
  botones: { flexDirection: 'row', gap: 8 },
  boton: { flex: 1, minHeight: 46 },
  botonFoto: { minHeight: 48 },
});
