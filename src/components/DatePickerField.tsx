import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { MicroLabel } from './ui';
import { GoldButton } from './GoldButton';
import { Presionable } from './Presionable';
import { HojaDesdeAbajo } from './hojaDesdeAbajo/HojaDesdeAbajo';
import { ARRIBA_FILA_CENTRAL, ALTO_FILA_RUEDA, RuedaDeValores } from './fechaEnRuedas/RuedaDeValores';
import {
  FECHA_POR_DEFECTO,
  MESES,
  aniosElegibles,
  ajustarDia,
  armarFecha,
  diasDelMes,
  fechaEnPalabras,
  partirFecha,
  type FechaPartida,
} from './fechaEnRuedas/logicaDeFecha';

interface DatePickerFieldProps {
  label: string;
  value: string; // "DD/MM/AAAA"
  onChange: (val: string) => void;
  helperText?: string;
  error?: string;
}

/**
 * La fecha de nacimiento de la Ficha Inicial (paso «Sobre ti»). 2026-10-05.
 *
 * Antes: un diálogo centrado con tres columnas de botones (día, mes, año) y «CANCELAR» /
 * «CONFIRMAR FECHA» — la forma de un formulario web. Ahora: una hoja que sube desde abajo con tres
 * ruedas, como el selector de fecha del teléfono, y un solo «LISTO». Cerrar la hoja de cualquier
 * otro modo (arrastrarla, tocar fuera, la ✕, el atrás) no cambia la fecha.
 *
 * No se usa el selector nativo (`@react-native-community/datetimepicker`): no está instalado y trae
 * código nativo; en Android además es un calendario de mes, incómodo para ir 30 años atrás.
 *
 * El campo guarda lo mismo que siempre, `"DD/MM/AAAA"`. Ver `fechaEnRuedas/logicaDeFecha.ts`.
 */
export function DatePickerField({ label, value, onChange, helperText, error }: DatePickerFieldProps) {
  const { c, t } = useTheme();
  const [abierta, setAbierta] = useState(false);
  const [borrador, setBorrador] = useState<FechaPartida>(() => partirFecha(value) ?? FECHA_POR_DEFECTO);

  const elegida = partirFecha(value);
  const anioActual = new Date().getFullYear();

  const dias = useMemo(
    () => Array.from({ length: diasDelMes(borrador.mes, borrador.anio) }, (_, i) => ({ valor: i + 1, texto: String(i + 1) })),
    [borrador.mes, borrador.anio],
  );
  const meses = useMemo(() => MESES.map((mes, i) => ({ valor: i + 1, texto: mes })), []);
  const anios = useMemo(
    () => aniosElegibles(anioActual, elegida?.anio).map(anio => ({ valor: anio, texto: String(anio) })),
    [anioActual, elegida?.anio],
  );

  const abrir = () => {
    setBorrador(partirFecha(value) ?? FECHA_POR_DEFECTO);
    setAbierta(true);
  };

  const cambiar = (parte: Partial<FechaPartida>) => setBorrador(previo => ajustarDia({ ...previo, ...parte }));

  const confirmar = () => {
    onChange(armarFecha(ajustarDia(borrador)));
    setAbierta(false);
  };

  const textoDelCampo = elegida ? fechaEnPalabras(elegida) : '';

  return (
    <View style={styles.container}>
      <View style={styles.labelGroup}>
        <MicroLabel>{label}</MicroLabel>
        {helperText && (
          <Text style={[t.small, { color: c.textSoft, fontSize: 12, lineHeight: 16, marginTop: 2 }]}>{helperText}</Text>
        )}
      </View>

      <Presionable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`Fecha de nacimiento: ${textoDelCampo || 'sin elegir'}`}
        accessibilityHint="Abre las ruedas de día, mes y año"
        style={[styles.campo, { borderColor: error ? c.danger : c.borderStrong, backgroundColor: c.cardBgAlt }]}
      >
        <Icon name="calendar" size={18} color={c.goldInk} strokeWidth={1.4} />
        <Text
          numberOfLines={1}
          style={[
            t.body,
            styles.valor,
            elegida ? { color: c.textStrong, fontFamily: 'Jost_500Medium' } : { color: c.tabInactive },
          ]}
        >
          {textoDelCampo || 'Selecciona tu fecha de nacimiento'}
        </Text>
        <Icon name="chevron" size={14} color={c.chevron} />
      </Presionable>

      {error && <Text style={[t.small, { color: c.danger, fontSize: 11.5 }]}>{error}</Text>}

      <HojaDesdeAbajo
        visible={abierta}
        alCerrar={() => setAbierta(false)}
        titulo="Fecha de nacimiento"
        subtitulo={fechaEnPalabras(borrador)}
        etiquetaCerrar="Cerrar sin cambiar la fecha"
        pie={<GoldButton label="LISTO" onPress={confirmar} />}
      >
        <View style={styles.ruedas}>
          <View style={[styles.franja, { backgroundColor: c.goldWash }]} />
          <RuedaDeValores etiqueta="Día" opciones={dias} valor={borrador.dia} alCambiar={dia => cambiar({ dia })} flex={0.8} />
          <RuedaDeValores etiqueta="Mes" opciones={meses} valor={borrador.mes} alCambiar={mes => cambiar({ mes })} flex={1.5} />
          <RuedaDeValores etiqueta="Año" opciones={anios} valor={borrador.anio} alCambiar={anio => cambiar({ anio })} flex={1} />
        </View>
      </HojaDesdeAbajo>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
  },
  labelGroup: {
    gap: 2,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    gap: 12,
  },
  valor: {
    flex: 1,
    fontSize: 16,
  },
  ruedas: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 4,
  },
  franja: {
    pointerEvents: 'none',
    position: 'absolute',
    left: 12,
    right: 12,
    top: 8 + ARRIBA_FILA_CENTRAL,
    height: ALTO_FILA_RUEDA,
    borderRadius: 10,
  },
});
