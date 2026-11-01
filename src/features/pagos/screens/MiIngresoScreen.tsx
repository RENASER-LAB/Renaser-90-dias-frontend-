import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { useFuncionalidad } from '../../plataforma/estado/useFuncionalidad';
import { AvisoDeMantenimiento } from '../../plataforma/components/AvisoDeMantenimiento';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import type { MiIngreso } from '../api/pagosSchemas';
import { ConfirmarElCronograma } from '../components/ConfirmarElCronograma';
import { FilaDeCuota } from '../components/FilaDeCuota';
import { PasosDelIngreso } from '../components/PasosDelIngreso';
import { RecordatoriosDePagoEnMiIngreso } from '../components/RecordatoriosDePagoEnMiIngreso';
import { hoyDelTelefono } from '../utils/fechasDePago';
import { pasosVisibles, vistaDelPago } from '../utils/vistaDeMiIngreso';

/**
 * Yo → «Mi ingreso» (spec 032, maqueta del dueño del 2026-11-01): los pasos de la entrada (Diagnóstico → Acuerdo → Pagos) con su estado real y, debajo,
 * el pago.
 *
 * - **Sin cronograma**: «Tu pago fue cancelado» (texto del dueño: en el Perú, pagado por completo).
 * - **Con cronograma**: «Tus fechas de pago · Revisa el cronograma acordado.», una fila por cuota (fecha, monto con su moneda, «✓ Pagado» o «Pendiente»), los
 *   recordatorios de pago y, UNA sola vez, la casilla «Revisé mis fechas y montos.», «Tu nombre» y «Confirmar cronograma». Si Administración cambia las
 *   cuotas, se vuelve a pedir. **Nunca bloquea nada**: no pagar ni no confirmar no cambia ninguna otra pantalla.
 * - No repite «Mi onboarding» de Ajustes: los pasos son orientación, no atajos; el diagnóstico y los términos se releen donde siempre.
 *
 * Un solo scroll; el atrás del sistema y la flecha vuelven a Yo. Sin animaciones propias (se ve de vez en cuando y reemplaza nada que se esté usando): la
 * confirmación se dice en una línea (`ConfirmacionEnLinea`, con el «tic» de logro) y la pantalla cambia al instante.
 */
export function MiIngresoScreen({
  userId,
  ingreso,
  onVolver,
  onConfirmar,
  onReintentar,
}: {
  userId: string;
  ingreso: MiIngreso;
  onVolver: () => void;
  /** Confirma con el nombre; lanza si el servidor lo rechaza. */
  onConfirmar: (nombre: string) => Promise<boolean>;
  onReintentar: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const pagos = useFuncionalidad(CLAVES.pagos);
  const [aviso, setAviso] = useState<{ clave: number; texto: string } | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const vista = useMemo(() => (ingreso.pagos ? vistaDelPago(ingreso.pagos, hoyDelTelefono()) : null), [ingreso.pagos]);
  const pasos = useMemo(() => pasosVisibles(ingreso), [ingreso]);

  const confirmar = async (nombre: string): Promise<void> => {
    if (await onConfirmar(nombre)) {
      tacto.logro();
      setAviso({ clave: Date.now(), texto: 'Cronograma confirmado' });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Mi ingreso" onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 24,
        }}
      >
        {aviso ? <ConfirmacionEnLinea key={aviso.clave} texto={aviso.texto} onTerminar={() => setAviso(null)} /> : null}
        {!pagos.prendida ? (
          <AvisoDeMantenimiento aviso={pagos.aviso} alReintentar={onReintentar} />
        ) : (
          <>
            <PasosDelIngreso pasos={pasos} />

            {vista?.tipo === 'completo' ? (
              /* Una tarjeta de éxito con cuerpo (E2E de las formaciones, 01/11/2026, issue #90): antes era un título suelto y el resto de la pantalla,
                 casi un 65 %, quedaba en blanco. Mismos textos. */
              <View style={[estilos.pagoCompleto, { backgroundColor: c.successWash, borderColor: c.success }]}>
                <View style={[estilos.medallonDeExito, { backgroundColor: c.cardBg, borderColor: c.success }]}>
                  <Icon name="check" size={TAMANO_ICONO.grande} color={c.success} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text accessibilityRole="header" style={[t.cardTitle, estilos.tituloDelPagoCompleto, { color: c.textStrong }]}>
                    {vista.titulo}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 17, lineHeight: 24 }]}>{vista.detalle}</Text>
                </View>
              </View>
            ) : null}

            {vista?.tipo === 'cronograma' ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
                    {vista.titulo}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 17, lineHeight: 24 }]}>{vista.detalle}</Text>
                </View>

                <View style={{ gap: 8 }}>
                  {vista.cuotas.map(cuota => (
                    <FilaDeCuota key={cuota.id} cuota={cuota} />
                  ))}
                </View>

                <RecordatoriosDePagoEnMiIngreso userId={userId} pagos={ingreso.pagos} />

                {vista.confirmacion.tipo === 'pedir' ? (
                  <ConfirmarElCronograma aviso={vista.confirmacion.aviso} alConfirmar={confirmar} />
                ) : (
                  <View style={[estilos.confirmada, { backgroundColor: c.successWash, borderColor: c.success }]}>
                    <Text accessibilityRole="summary" style={[t.body, { color: c.textStrong, fontSize: 17, lineHeight: 24 }]}>
                      {vista.confirmacion.texto}
                    </Text>
                  </View>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  confirmada: { borderWidth: 1, borderRadius: 14, padding: 14 },
  pagoCompleto: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 17 },
  medallonDeExito: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tituloDelPagoCompleto: { fontSize: 22, lineHeight: 28 },
});
