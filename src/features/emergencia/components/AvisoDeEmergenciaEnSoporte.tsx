import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useTheme } from '../../../theme/ThemeContext';
import { avisar, confirmar } from '../../admin/utils/dialogo';
import { cerrarEmergenciaSinCambio, leerEmergenciaAbierta } from '../api/emergenciaApi';
import type { EmergenciaParaSoporte } from '../api/emergenciaSchemas';
import { resumenParaSoporte, sePuedeCambiarAlDiaPedido } from '../utils/pedidoDeEmergencia';

/**
 * En el chat de soporte, para quien atiende (D-244): si esa persona tiene un pedido de emergencia abierto,
 * una franja con el resumen y dos botones. «Cambiar al día N» abre «Cambiar día del programa» con el día y
 * el motivo ya puestos (cambiarlo deja el pedido resuelto en el servidor); «Cerrar sin cambiar» lo cierra.
 * Un pedido del Día 0 (sin día) o del día en que ya está solo ofrece «Cerrar sin cambiar». Sin pedido, o si el
 * servidor no deja leerlo, no se ve nada.
 */
export function AvisoDeEmergenciaEnSoporte({
  aprendizId,
  onCambiarDia,
}: {
  aprendizId: string;
  onCambiarDia: (emergencia: EmergenciaParaSoporte) => void;
}) {
  const { c, t } = useTheme();
  const [emergencia, setEmergencia] = useState<EmergenciaParaSoporte | null>(null);
  const [cerrando, setCerrando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setEmergencia(await leerEmergenciaAbierta(aprendizId));
    } catch {
      setEmergencia(null);
    }
  }, [aprendizId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!emergencia) return null;

  const cerrar = async () => {
    if (!(await confirmar('¿Cerrar el pedido sin cambiar el día?', 'Úsalo si ya lo hablaste y no hace falta moverlo.', { ok: 'Cerrar' }))) {
      return;
    }
    setCerrando(true);
    try {
      await cerrarEmergenciaSinCambio(emergencia.id);
      setEmergencia(null);
    } catch (e) {
      avisar('No se pudo cerrar', mensajeDeError(e, 'Vuelve a intentar.'));
    } finally {
      setCerrando(false);
    }
  };

  const puedeCambiar = sePuedeCambiarAlDiaPedido(emergencia);

  return (
    <View
      accessibilityRole="summary"
      style={[estilos.franja, { backgroundColor: c.cardBg, borderColor: c.danger }]}
    >
      <Text style={[t.micro, { color: c.danger, fontFamily: 'Jost_700Bold' }]}>EMERGENCIA</Text>
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>{resumenParaSoporte(emergencia)}</Text>
      <View style={estilos.botones}>
        {puedeCambiar ? (
          <BotonPrincipal
            etiqueta={`Cambiar al día ${emergencia.diaPedido}`}
            onPress={() => onCambiarDia(emergencia)}
            deshabilitado={cerrando}
            estilo={{ flex: 1 }}
          />
        ) : null}
        <BotonSecundario etiqueta="Cerrar sin cambiar" onPress={cerrar} cargando={cerrando} estilo={{ flex: 1 }} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  franja: { marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 8 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
