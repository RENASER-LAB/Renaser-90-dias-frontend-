import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { abrirGuiaDeLaMarca } from '../abrirGuiaDeLaMarca';
import { BOTON_DE_LA_GUIA, lineaDeLaGuia, TITULO_DE_LA_GUIA } from '../data/guiasPorMarca';
import { marcaDelTelefono } from '../utils/marcaDelTelefono';

/**
 * Yo → Alarmas: cómo evitar que el teléfono borre las alarmas (D-217, 2026-09-28).
 *
 * Probado en el emulador el 28/09 con `dumpsys alarm`: detener la app a la fuerza —lo que hacen Xiaomi,
 * Samsung, Huawei y Oppo al cerrarla desde recientes o para ahorrar batería— borra la alarma de mañana
 * hasta que se vuelve a abrir la app. En ese estado **tampoco llega el push del servidor**: Android no le
 * entrega nada a una app detenida. Lo único que lo evita es que el teléfono no la detenga.
 *
 * > **Cambiado 2026-10-19 (spec 007).** Decía a todos «en Batería elige “Sin restricciones”», que en Honor
 * > y Huawei no existe: ahí el ajuste está en «Inicio de aplicaciones» → «Gestionar automáticamente». Ahora
 * > la línea es la de la marca del teléfono (`data/guiasPorMarca.ts`) y el botón abre la pantalla de esa
 * > marca si existe; si no, la lista de batería del sistema o los ajustes de Renaser (`abrirGuiaDeLaMarca`).
 * > Una marca desconocida ve el texto de siempre. No se pide la excepción directa de optimización de batería.
 *
 * > **Cambiado 2026-10-31 (alarmas silenciosas, decisión del dueño).** Es ahora el ÚNICO lugar donde se habla de esto: la
 * > hoja «Tu teléfono cerró Renaser» y la oferta de la primera vez en Planificar se retiraron (la app vuelve a poner las
 * > alarmas sola y sin decir nada). El texto va en positivo: título «Para que tus recordatorios suenen siempre», la línea de
 * > la marca y el botón «Revisar» (abre lo mismo que antes). Sin culpar al teléfono ni pedir «no cierres la app a la fuerza».
 * > Quieta, sin animación: se ve de vez en cuando y quien llega aquí la está buscando.
 */
// Se sigue exportando desde acá: es el texto de las marcas desconocidas y lo importan otras pruebas.
export { TEXTO_DE_BATERIA } from '../data/guiasPorMarca';

export function GuiaDeBateria() {
  const { c } = useTheme();
  const linea = useMemo(() => lineaDeLaGuia(marcaDelTelefono()), []);
  if (Platform.OS !== 'android') return null;

  return (
    <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text style={[estilos.titulo, { color: c.textStrong }]}>{TITULO_DE_LA_GUIA}</Text>
      <Text style={[estilos.cuerpo, { color: c.textSoft }]}>{linea}</Text>
      <BotonSecundario etiqueta={BOTON_DE_LA_GUIA} onPress={() => void abrirGuiaDeLaMarca()} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  titulo: { fontFamily: 'Jost_700Bold', fontSize: 19, lineHeight: 25 },
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 17, lineHeight: 24 },
});
