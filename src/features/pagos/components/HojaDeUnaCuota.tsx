import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormField } from '../../../components/FormField';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CampoDeFecha } from '../../diagnostico/components/CampoDeFecha';
import { cuotaDeSusCampos } from '../utils/borradorDelCronograma';
import { simboloDeLaMoneda } from '../utils/dinero';
import { isoADdMmAaaa } from '../utils/fechasDePago';

/**
 * Agregar o editar UNA cuota pendiente desde la ficha (spec 032): su fecha fija y su monto, en la moneda del cronograma. Una cuota pagada no se edita (el
 * servidor responde 409): la ficha ni ofrece el botón. No guarda sola: devuelve la cuota con `alGuardar` y, si el servidor la rechaza, el motivo queda
 * bajo el botón sin perder lo escrito.
 */
export function HojaDeUnaCuota({
  visible,
  moneda,
  inicial,
  alCerrar,
  alGuardar,
}: {
  visible: boolean;
  moneda: string | null;
  /** La cuota que se edita; `null` = una nueva. */
  inicial: { venceEl: string; monto: number } | null;
  alCerrar: () => void;
  alGuardar: (cuota: { dueDate: string; amount: number }) => Promise<void>;
}) {
  const { c, t } = useTheme();
  const [fecha, setFecha] = useState('');
  const [monto, setMonto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setFecha(inicial ? isoADdMmAaaa(inicial.venceEl) : '');
    setMonto(inicial ? String(inicial.monto) : '');
    setAviso(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const guardar = async () => {
    if (enCurso.current) return;
    const cuota = cuotaDeSusCampos(fecha, monto);
    if ('error' in cuota) {
      setAviso(cuota.error);
      tacto.error();
      return;
    }
    enCurso.current = true;
    setGuardando(true);
    setAviso(null);
    try {
      await alGuardar(cuota);
    } catch (e) {
      tacto.error();
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  const simbolo = simboloDeLaMoneda(moneda);

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={guardando ? () => undefined : alCerrar}
      titulo={inicial ? 'Editar la cuota' : 'Agregar una cuota'}
      tamano="contenido"
      etiquetaCerrar="Cerrar sin guardar"
      pie={
        <View style={estilos.pie}>
          {aviso ? (
            <Text accessibilityRole="alert" style={[t.small, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
              {aviso}
            </Text>
          ) : null}
          <BotonPrincipal etiqueta="Guardar" onPress={() => void guardar()} cargando={guardando} />
        </View>
      }
    >
      <View style={estilos.cuerpo}>
        <View style={{ gap: 8 }}>
          <Text style={[t.small, { color: c.textSoft, fontSize: 16 }]}>Fecha de la cuota</Text>
          <CampoDeFecha etiqueta="Fecha de la cuota" valor={fecha} alCambiar={setFecha} />
        </View>
        <FormField
          label={simbolo ? `Monto (${simbolo})` : 'Monto'}
          value={monto}
          onChangeText={setMonto}
          placeholder="Ej.: 1000"
          keyboardType="decimal-pad"
          maxLength={12}
          editable={!guardando}
          returnKeyType="done"
          onSubmitEditing={() => void guardar()}
        />
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 16, paddingHorizontal: 20, paddingBottom: 24 },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
});
