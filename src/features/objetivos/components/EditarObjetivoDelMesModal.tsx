import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { VeloModal } from '../../../components/VeloModal';
import { useTheme } from '../../../theme/ThemeContext';
import type { MesDelPlan } from '../api/planMensualApi';

/**
 * Corregir a mano el objetivo de un mes.
 *
 * El servidor lo calcula solo; esto es para cuando la persona sabe algo que la cuenta no sabe —un
 * viaje, una lesión, un mes que ya arrancó torcido. Desde que se guarda, **manda sobre el cálculo**
 * y la tarjeta lo muestra como tuyo.
 *
 * Un solo campo. La cuenta ya propuso un número y lo trae escrito: lo normal es ajustarlo, no
 * empezar de cero.
 */
export function EditarObjetivoDelMesModal({
  visible,
  mes,
  unidad,
  guardando,
  onCerrar,
  onGuardar,
}: {
  visible: boolean;
  mes: MesDelPlan | null;
  unidad: string;
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (cifra: number | null) => void;
}) {
  const { c, t } = useTheme();
  const [texto, setTexto] = useState('');
  const [tocado, setTocado] = useState(false);

  /* El valor propuesto se escribe solo la primera vez que se abre para ESE mes: si se reescribiera
     en cada render, cada tecla que la persona escribe se perdería al volver a pintar. */
  const propuesto = mes?.cifra != null ? String(mes.cifra) : '';
  const valor = tocado ? texto : propuesto;

  const cerrar = () => {
    setTocado(false);
    setTexto('');
    onCerrar();
  };

  const guardar = () => {
    const limpio = valor.trim().replace(',', '.');
    const numero = limpio === '' ? null : Number(limpio);
    if (numero !== null && (!Number.isFinite(numero) || numero <= 0)) return;
    onGuardar(numero);
    setTocado(false);
    setTexto('');
  };

  const limpio = valor.trim().replace(',', '.');
  const invalido = limpio !== '' && (!Number.isFinite(Number(limpio)) || Number(limpio) <= 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <VeloModal onCerrar={cerrar} style={estilos.velo}>
        <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <View style={estilos.encabezado}>
            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
              OBJETIVO DEL MES {mes?.numeroMes ?? ''}
            </Text>
            <Pressable onPress={cerrar} hitSlop={12} accessibilityLabel="Cerrar">
              <Icon name="close" size={16} color={c.textSoft} />
            </Pressable>
          </View>

          <Text style={[t.body, { color: c.text, marginTop: 8 }]}>
            ¿Dónde quieres estar al Día {mes?.diaDeCierre ?? ''}?
          </Text>

          <View style={estilos.fila}>
            <TextInput
              value={valor}
              onChangeText={nuevo => {
                setTocado(true);
                setTexto(nuevo);
              }}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={c.micro}
              style={[
                estilos.campo,
                t.body,
                { color: c.text, borderColor: invalido ? c.danger : c.border, backgroundColor: c.bg },
              ]}
              accessibilityLabel="Cifra del mes"
            />
            {!!unidad.trim() && (
              <Text style={[t.body, { color: c.textSoft, marginLeft: 8 }]}>{unidad.trim()}</Text>
            )}
          </View>

          {/* Vacío es una respuesta válida: deja el mes sin número, no rompe nada. Cero no: el
              servidor lo rechaza porque una meta de cero necesita punto de partida para medirse. */}
          <Text style={[t.micro, { color: invalido ? c.danger : c.micro, marginTop: 6, fontSize: 12 }]}>
            {invalido ? 'Tiene que ser un número mayor que cero.' : 'Déjalo vacío para quitar la cifra.'}
          </Text>

          <Pressable
            onPress={guardar}
            disabled={guardando || invalido}
            style={[estilos.boton, { backgroundColor: c.gold, opacity: guardando || invalido ? 0.5 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={[t.micro, { color: c.textStrong, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
              {guardando ? 'GUARDANDO…' : 'GUARDAR'}
            </Text>
          </Pressable>
        </View>
      </VeloModal>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  velo: { backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  tarjeta: { borderWidth: 1, borderRadius: 18, padding: 20 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fila: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  campo: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  boton: { marginTop: 18, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
});
