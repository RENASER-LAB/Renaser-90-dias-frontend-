import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Checkbox } from '../../../../components/Checkbox';
import { useTheme } from '../../../../theme/ThemeContext';
import { tacto } from '../../../../utils/tacto';
import { FilaDeCuota } from '../../../pagos/components/FilaDeCuota';
import { nombreDeLaMoneda } from '../../../pagos/utils/dinero';
import { hoyDelTelefono } from '../../../pagos/utils/fechasDePago';
import { cuotaVisible } from '../../../pagos/utils/vistaDeMiIngreso';
import {
  DETALLE_DEL_CRONOGRAMA_A_FIRMAR,
  ERROR_DE_CRONOGRAMA_FALTA,
  FRASE_DEL_CRONOGRAMA,
  TITULO_DEL_CRONOGRAMA_A_FIRMAR,
  type CronogramaParaFirmar,
} from '../utils/miAceptacion';

/**
 * «Mi cronograma de pagos» (spec 039): debajo de «Mi aceptación», SOLO para quien entra a la app aceptado con cronograma (spec 032). La moneda, una fila por cuota
 * con el mismo dibujo de «Mi ingreso» (`FilaDeCuota`: fecha, monto y «Pendiente») y la casilla con la frase de la cláusula 19. Al firmar los términos queda
 * confirmado este cronograma —la misma confirmación de «Mi ingreso»—, así que ahí ya no se vuelve a pedir.
 *
 * Sin la casilla marcada «Continuar» no avanza y lo dice (`error`): igual que la casilla de los términos, no se apaga el botón.
 */
export function MiCronogramaDePagos({
  cronograma,
  aceptado,
  alCambiar,
  error,
}: {
  cronograma: CronogramaParaFirmar;
  aceptado: boolean;
  alCambiar: (aceptado: boolean) => void;
  /** Se marca cuando la persona intentó seguir sin aceptarlo. */
  error: boolean;
}) {
  const { c, t } = useTheme();
  const hoy = useMemo(() => hoyDelTelefono(), []);
  const cuotas = useMemo(() => cronograma.cuotas.map(cuota => cuotaVisible(cuota, cronograma.moneda, hoy)), [cronograma, hoy]);

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: error && !aceptado ? c.danger : c.border }]}>
      <View style={estilos.cabeza}>
        <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong }]}>
          {TITULO_DEL_CRONOGRAMA_A_FIRMAR}
        </Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>
          {cronograma.moneda ? `${DETALLE_DEL_CRONOGRAMA_A_FIRMAR} Moneda: ${nombreDeLaMoneda(cronograma.moneda)}.` : DETALLE_DEL_CRONOGRAMA_A_FIRMAR}
        </Text>
      </View>

      <View style={estilos.cuotas}>
        {cuotas.map(cuota => (
          <FilaDeCuota key={cuota.id} cuota={cuota} />
        ))}
      </View>

      <Checkbox
        checked={aceptado}
        onToggle={marcado => {
          tacto.seleccion();
          alCambiar(marcado);
        }}
        title={FRASE_DEL_CRONOGRAMA}
        style={{ minHeight: 56 }}
      />
      {error && !aceptado ? (
        <Text accessibilityRole="alert" style={[t.small, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
          {ERROR_DE_CRONOGRAMA_FALTA}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  cabeza: { gap: 4 },
  cuotas: { gap: 10 },
});
