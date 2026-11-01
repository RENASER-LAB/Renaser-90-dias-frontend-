import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { paraElPedido, problemaDelBorrador, type BorradorDePago, type PagoParaElPedido } from '../utils/borradorDelCronograma';
import { EditorDeCronograma } from './EditorDeCronograma';

/**
 * «Asignar un cronograma» o «Reemplazar el cronograma» desde la ficha de una persona (spec 032): la hoja con el MISMO editor de la hoja «Aceptar»
 * (moneda, atajo mensual y filas) y «Guardar» fijo abajo. No guarda sola: devuelve el cuerpo con `alGuardar` y la ficha hace el pedido; si el servidor lo
 * rechaza (409 por cuotas ya pagadas, 400), el motivo queda bajo el botón y lo escrito no se pierde.
 */
export function HojaDelCronograma({
  visible,
  nombre,
  inicial,
  alCerrar,
  alGuardar,
}: {
  visible: boolean;
  nombre: string;
  /** Con lo que ya tenía (reemplazar) o vacío (asignar). */
  inicial: BorradorDePago;
  alCerrar: () => void;
  /** Hace el pedido; si falla, lanza con el motivo. */
  alGuardar: (pago: PagoParaElPedido) => Promise<void>;
}) {
  const { c, t } = useTheme();
  const [borrador, setBorrador] = useState<BorradorDePago>(inicial);
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const [error, setError] = useState<string | null>(null);

  /* Cada vez que se abre parte de lo que le pasan: lo que se escribió para otra persona no se arrastra. */
  useEffect(() => {
    if (visible) {
      setBorrador(inicial);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const falta = problemaDelBorrador(borrador);

  const guardar = async () => {
    const pedido = paraElPedido(borrador);
    if (!pedido || enCurso.current) return;
    enCurso.current = true;
    setGuardando(true);
    setError(null);
    try {
      await alGuardar(pedido);
    } catch (e) {
      tacto.error();
      setError(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={guardando ? () => undefined : alCerrar}
      titulo="Cronograma de pagos"
      subtitulo={nombre}
      tamano="completa"
      etiquetaCerrar="Cerrar sin guardar"
      pie={
        <View style={estilos.pie}>
          {falta ? <Text style={[t.small, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{falta}</Text> : null}
          {error ? (
            <Text accessibilityRole="alert" style={[t.small, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
              {error}
            </Text>
          ) : null}
          <BotonPrincipal etiqueta="Guardar cronograma" onPress={() => void guardar()} cargando={guardando} deshabilitado={falta !== null} />
        </View>
      }
    >
      <View style={estilos.cuerpo}>
        <EditorDeCronograma pago={borrador} alCambiar={setBorrador} deshabilitado={guardando} />
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingBottom: 32 },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
});
