import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormField } from '../../../components/FormField';
import { Icon } from '../../../components/Icon';
import { BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import { CampoDeFecha } from '../../diagnostico/components/CampoDeFecha';
import {
  cantidadDeCuotasEnPalabras,
  cuotasMensuales,
  filaVacia,
  leerFilas,
  MAXIMO_DE_CUOTAS,
  sinFilasVacias,
  totalDelBorrador,
  type BorradorDePago,
  type FilaDeCuota,
} from '../utils/borradorDelCronograma';
import { MONEDAS, montoConMoneda, nombreDeLaMoneda, type Moneda } from '../utils/dinero';

/**
 * El cronograma de una persona, escrito a mano (spec 032): la moneda —**S/ o US$, sin valor por defecto**: se elige—, las cuotas con su fecha fija y su monto,
 * y el atajo «N cuotas mensuales de X desde tal fecha» que arma las filas para editarlas después. Lo usan la hoja «Aceptar» de Solicitudes y la ficha de la
 * persona (asignar o reemplazar el cronograma); no sabe de dónde viene ni lo manda: `alCambiar` entrega el borrador entero y quien lo usa decide.
 *
 * - Un solo scroll: las filas van una debajo de otra en la hoja que lo contiene; cada una es de una línea (fecha, monto, quitar) para que doce cuotas no
 *   sean doce pantallas.
 * - Una fila con algo mal se marca (borde rojo) solo después de que la persona escribió algo en ella: un campo vacío recién creado no grita.
 * - Sin animaciones: se arma una vez y los toques tienen que verse en el acto (`Presionable` hunde al apretar).
 */
export function EditorDeCronograma({
  pago,
  alCambiar,
  deshabilitado = false,
}: {
  pago: BorradorDePago;
  alCambiar: (siguiente: BorradorDePago) => void;
  deshabilitado?: boolean;
}) {
  const { c, t } = useTheme();
  const [cantidad, setCantidad] = useState('');
  const [montoMensual, setMontoMensual] = useState('');
  const [desde, setDesde] = useState('');
  const [errorDelAtajo, setErrorDelAtajo] = useState<string | null>(null);

  const filas = leerFilas(pago.filas);
  const total = totalDelBorrador(pago);

  const cambiarFila = (clave: string, parcial: Partial<FilaDeCuota>) =>
    alCambiar({ ...pago, filas: pago.filas.map(f => (f.clave === clave ? { ...f, ...parcial } : f)) });

  const armarMensuales = () => {
    const armadas = cuotasMensuales({ cantidad, monto: montoMensual, desde });
    if ('error' in armadas) {
      setErrorDelAtajo(armadas.error);
      tacto.error();
      return;
    }
    setErrorDelAtajo(null);
    tacto.seleccion();
    alCambiar({ ...pago, filas: [...sinFilasVacias(pago.filas), ...armadas].slice(0, MAXIMO_DE_CUOTAS) });
  };

  return (
    <View style={estilos.caja}>
      <View style={{ gap: 8 }}>
        <Text style={[t.small, { color: c.textSoft, fontSize: 16 }]}>Moneda del cronograma</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Moneda del cronograma" style={estilos.chips}>
          {MONEDAS.map((moneda: Moneda) => (
            <ChipDeOpcion
              key={moneda}
              etiqueta={nombreDeLaMoneda(moneda)}
              activo={pago.moneda === moneda}
              deshabilitado={deshabilitado}
              onPress={() => alCambiar({ ...pago, moneda })}
            />
          ))}
        </View>
      </View>

      <View style={[estilos.atajo, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 17, fontFamily: fuentes.seminegrita }]}>Armar cuotas mensuales</Text>
        <Text style={[t.small, { color: c.textSoft, fontSize: 16 }]}>Escribe cuántas, de cuánto y desde cuándo; después puedes editar cada cuota.</Text>
        <View style={estilos.fila}>
          <FormField
            label=""
            value={cantidad}
            onChangeText={setCantidad}
            placeholder="Cuotas"
            keyboardType="number-pad"
            maxLength={2}
            editable={!deshabilitado}
            accessibilityLabel="Cuántas cuotas"
            containerStyle={{ flex: 1 }}
          />
          <FormField
            label=""
            value={montoMensual}
            onChangeText={setMontoMensual}
            placeholder="Monto de cada una"
            keyboardType="decimal-pad"
            maxLength={12}
            editable={!deshabilitado}
            accessibilityLabel="Monto de cada cuota"
            containerStyle={{ flex: 2 }}
          />
        </View>
        <CampoDeFecha etiqueta="Fecha de la primera cuota" valor={desde} alCambiar={setDesde} />
        {errorDelAtajo ? (
          <Text accessibilityRole="alert" style={[t.small, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
            {errorDelAtajo}
          </Text>
        ) : null}
        <BotonSecundario etiqueta="Armar las cuotas" icono="calendar" onPress={armarMensuales} deshabilitado={deshabilitado} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[t.small, { color: c.textSoft, fontSize: 16 }]}>
          {pago.filas.length === 0 ? 'Todavía no hay cuotas.' : cantidadDeCuotasEnPalabras(pago.filas.length)}
        </Text>
        {filas.map(({ fila, fechaIso, monto }, i) => (
          <View key={fila.clave} style={estilos.filaDeCuota}>
            <View style={{ flex: 1.35 }}>
              <CampoDeFecha
                etiqueta={`Fecha de la cuota ${i + 1}`}
                valor={fila.fecha}
                alCambiar={fecha => cambiarFila(fila.clave, { fecha })}
                hayError={fila.monto.trim() !== '' && fechaIso === null}
                compacto
              />
            </View>
            <FormField
              label=""
              value={fila.monto}
              onChangeText={texto => cambiarFila(fila.clave, { monto: texto })}
              placeholder="Monto"
              keyboardType="decimal-pad"
              maxLength={12}
              editable={!deshabilitado}
              accessibilityLabel={`Monto de la cuota ${i + 1}`}
              error={fila.fecha !== '' && fila.monto.trim() !== '' && monto === null ? 'Monto no válido' : null}
              mensajeDeErrorAparte
              containerStyle={{ flex: 1 }}
            />
            <Presionable
              onPress={() => {
                tacto.seleccion();
                alCambiar({ ...pago, filas: pago.filas.filter(f => f.clave !== fila.clave) });
              }}
              disabled={deshabilitado}
              accessibilityRole="button"
              accessibilityLabel={`Quitar la cuota ${i + 1}`}
              style={estilos.quitar}
            >
              <Icon name="trash" size={20} color={c.danger} />
            </Presionable>
          </View>
        ))}
        {pago.filas.length < MAXIMO_DE_CUOTAS ? (
          <BotonSecundario
            etiqueta="Agregar una cuota"
            icono="plus"
            deshabilitado={deshabilitado}
            onPress={() => alCambiar({ ...pago, filas: [...pago.filas, filaVacia()] })}
          />
        ) : null}
        {total > 0 && pago.moneda ? (
          <Text style={[t.body, { color: c.textStrong, fontSize: 17, fontFamily: fuentes.seminegrita }]}>{`Total: ${montoConMoneda(total, pago.moneda)}`}</Text>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  atajo: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  fila: { flexDirection: 'row', gap: 8 },
  filaDeCuota: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  quitar: { width: 48, height: 56, alignItems: 'center', justifyContent: 'center' },
});
