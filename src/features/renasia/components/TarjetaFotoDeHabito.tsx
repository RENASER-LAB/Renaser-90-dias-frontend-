import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { PedidoDeFotoUI } from '../types/renasia.types';
import { ETIQUETA_DEL_BOTON_DEL_RITUAL } from '../../habits/utils/registroConFoto';
import { estadoVisibleDelPedido, seRegistraEscribiendoElPedido, textoDeRegistrado, tituloDelPedido } from '../utils/pedidosDeFoto';

type Props = {
  pedido: PedidoDeFotoUI;
  onTomarFoto: () => void;
};

/**
 * El acompañante pidió la foto de un hábito (evento `evidencia`, 2026-09-26) o, desde D-178, de una
 * acción del día (`destino: 'roca'`): el título y el botón «Tomar foto». Tocarlo abre la cámara y después la misma pantalla partida de
 * Training. Registrado, dice que quedó; vencido, el botón se deshabilita.
 *
 * **Spec 038: un ritual no pide foto sino que se escribe.** Su botón dice «Escribir cómo me siento» y abre el mismo registro por texto de
 * Training (`RegistroDeRitualConTexto`). Rótulos en tipo oración y en segunda persona, como el resto de la app.
 *
 * Solo dibuja: la cámara y la subida las maneja quien la monta (chat u orbe) con
 * `useRegistroConFoto`.
 */
export function TarjetaFotoDeHabito({ pedido, onTomarFoto }: Props) {
  const { c, t } = useTheme();
  const estado = estadoVisibleDelPedido(pedido, Date.now());
  const seEscribe = seRegistraEscribiendoElPedido(pedido);

  return (
    <View style={[styles.tarjeta, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
      <Text style={[t.micro, { color: c.goldInk, fontFamily: fuentes.negrita }]}>
        {pedido.destino === 'roca' ? 'Evidencia de tu acción' : seEscribe ? 'Registro de tu ritual' : 'Evidencia de tu hábito'}
      </Text>
      <Text style={[t.body, { color: c.text, fontSize: 14.5 }]}>{tituloDelPedido(pedido)}</Text>

      {estado === 'registrado' ? (
        <View style={styles.cierre}>
          <Icon name="checkCircle" size={16} color={c.success} />
          <Text style={[t.small, { color: c.success, fontSize: 13, flexShrink: 1 }]}>
            {pedido.mensaje || textoDeRegistrado(pedido)}
          </Text>
        </View>
      ) : (
        <GoldButton
          label={seEscribe ? ETIQUETA_DEL_BOTON_DEL_RITUAL : 'Tomar foto'}
          onPress={onTomarFoto}
          disabled={estado !== 'pendiente'}
          loading={estado === 'abriendo'}
          style={styles.boton}
        />
      )}

      {estado === 'vencido' ? (
        <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>
          {pedido.mensaje || 'Tu día ya cerró: solo se registran los hábitos del día.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginTop: 6, width: '100%' },
  boton: { minHeight: 48 },
  cierre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
