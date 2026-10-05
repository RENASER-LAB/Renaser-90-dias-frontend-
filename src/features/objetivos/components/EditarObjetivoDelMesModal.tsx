import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
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

  /*
   * Hoja desde abajo (2026-10-05) en vez de la ventana centrada: su ✕ tiene 44 de área (antes un
   * ícono de 16 con `hitSlop`), y se cierra también arrastrándola o tocando el fondo. `contenido`
   * porque es un solo campo: la hoja mide lo que lleva.
   */
  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={cerrar}
      titulo={mes ? `Objetivo del mes ${mes.numeroMes}` : 'Objetivo del mes'}
      pie={
        <GoldButton
          label={guardando ? 'Guardando…' : 'Guardar'}
          onPress={guardar}
          disabled={guardando || invalido}
          textStyle={{ fontSize: 15, letterSpacing: 0 }}
        />
      }
    >
      <View style={estilos.cuerpo}>
        <Text style={[t.body, { color: c.text }]}>
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
            placeholderTextColor={c.tabInactive}
            style={[
              estilos.campo,
              t.body,
              { color: c.text, borderColor: invalido ? c.danger : c.border, backgroundColor: c.cardBgAlt },
            ]}
            accessibilityLabel="Cifra del mes"
          />
          {!!unidad.trim() && (
            <Text style={[t.body, { color: c.textSoft, marginLeft: 8 }]}>{unidad.trim()}</Text>
          )}
        </View>

        {/* Vacío es una respuesta válida: deja el mes sin número, no rompe nada. Cero no: el
            servidor lo rechaza porque una meta de cero necesita punto de partida para medirse. */}
        <Text style={[t.small, { color: invalido ? c.danger : c.micro, marginTop: 6 }]}>
          {invalido ? 'Tiene que ser un número mayor que cero.' : 'Déjalo vacío para quitar la cifra.'}
        </Text>
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingTop: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  campo: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
});
