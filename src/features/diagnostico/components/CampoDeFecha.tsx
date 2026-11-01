import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ARRIBA_FILA_CENTRAL, ALTO_FILA_RUEDA, RuedaDeValores } from '../../../components/fechaEnRuedas/RuedaDeValores';
import {
  MESES,
  ajustarDia,
  armarFecha,
  diasDelMes,
  fechaEnPalabras,
  hoyEnLima,
  partirFecha,
  type FechaPartida,
} from '../../../components/fechaEnRuedas/logicaDeFecha';
import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';

/** Cuántos años hacia atrás y hacia adelante ofrece la rueda: una fecha de un diagnóstico puede ser pasada o por venir. */
export const ANIOS_ATRAS = 100;
export const ANIOS_ADELANTE = 10;

interface CampoDeFechaProps {
  /** Lo que lee el lector de pantalla del campo: el texto de la pregunta. */
  etiqueta: string;
  /** `DD/MM/AAAA`, o vacío. */
  valor: string;
  alCambiar: (valor: string) => void;
  hayError?: boolean;
}

/**
 * La pregunta de tipo FECHA del diagnóstico (spec 026): el campo que abre las mismas ruedas de día, mes y año de la ficha
 * estándar (`RuedaDeValores`, `HojaDesdeAbajo`), sin su tope de «mayor de 18», que es de la fecha de nacimiento y no de una
 * fecha cualquiera. Guarda `DD/MM/AAAA`, igual que el selector de la ficha. Cerrar la hoja de otro modo que «Listo» no cambia
 * la fecha.
 */
export function CampoDeFecha({ etiqueta, valor, alCambiar, hayError = false }: CampoDeFechaProps) {
  const { c, t } = useTheme();
  const hoy = useMemo(() => hoyEnLima(), []);
  const [abierta, setAbierta] = useState(false);
  const [borrador, setBorrador] = useState<FechaPartida>(() => partirFecha(valor) ?? hoy);

  const elegida = partirFecha(valor);

  const dias = useMemo(
    () => Array.from({ length: diasDelMes(borrador.mes, borrador.anio) }, (_, i) => ({ valor: i + 1, texto: String(i + 1) })),
    [borrador.mes, borrador.anio],
  );
  const meses = useMemo(() => MESES.map((mes, i) => ({ valor: i + 1, texto: mes })), []);
  const anios = useMemo(() => {
    const primero = hoy.anio - ANIOS_ATRAS;
    const todos = Array.from({ length: ANIOS_ATRAS + ANIOS_ADELANTE + 1 }, (_, i) => primero + i);
    if (elegida && !todos.includes(elegida.anio)) todos.push(elegida.anio);
    return todos.sort((a, b) => a - b).map(anio => ({ valor: anio, texto: String(anio) }));
  }, [hoy.anio, elegida]);

  const abrir = () => {
    setBorrador(partirFecha(valor) ?? hoy);
    setAbierta(true);
  };
  const cambiar = (parte: Partial<FechaPartida>) => setBorrador(previo => ajustarDia({ ...previo, ...parte }));
  const confirmar = () => {
    alCambiar(armarFecha(ajustarDia(borrador)));
    setAbierta(false);
  };

  const texto = elegida ? fechaEnPalabras(elegida) : '';

  return (
    <View>
      <Presionable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${texto || 'sin elegir'}`}
        accessibilityHint="Abre las ruedas de día, mes y año"
        style={[estilos.campo, { borderColor: hayError ? c.danger : c.borderStrong, backgroundColor: c.cardBgAlt }]}
      >
        <Icon name="calendar" size={20} color={c.goldInk} />
        <Text
          numberOfLines={1}
          style={[t.body, estilos.valor, texto ? { color: c.textStrong, fontFamily: fuentes.media } : { color: c.tabInactive }]}
        >
          {texto || 'Elige la fecha'}
        </Text>
        <Icon name="chevron" size={16} color={c.chevron} />
      </Presionable>

      <HojaDesdeAbajo
        visible={abierta}
        alCerrar={() => setAbierta(false)}
        titulo="Elige la fecha"
        subtitulo={fechaEnPalabras(borrador)}
        etiquetaCerrar="Cerrar sin cambiar la fecha"
        pie={<GoldButton label="LISTO" onPress={confirmar} />}
      >
        <View style={estilos.ruedas}>
          <View style={[estilos.franja, { backgroundColor: c.goldWash }]} />
          <RuedaDeValores etiqueta="Día" opciones={dias} valor={borrador.dia} alCambiar={dia => cambiar({ dia })} flex={0.8} />
          <RuedaDeValores etiqueta="Mes" opciones={meses} valor={borrador.mes} alCambiar={mes => cambiar({ mes })} flex={1.5} />
          <RuedaDeValores etiqueta="Año" opciones={anios} valor={borrador.anio} alCambiar={anio => cambiar({ anio })} flex={1} />
        </View>
      </HojaDesdeAbajo>
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    gap: 12,
  },
  valor: { flex: 1, fontSize: 16 },
  ruedas: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, gap: 4 },
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
