import { tituloEnTipoOracion } from '../utils/tituloEnTipoOracion';
import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { GoldButton } from '../../../components/GoldButton';
import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useAltoMaximoDelCuerpo } from '../../../components/hojaDesdeAbajo/altoDelCuerpo';
import { tacto } from '../../../utils/tacto';
import {
  HORAS,
  MINUTOS,
  aDosDigitos,
  armarHora,
  enRenglones,
  momentoDelDia,
  partirHora,
} from '../utils/horaDelSelector';

/**
 * Selector de hora táctil, pensado para un público de 40+ años (palabras del dueño del
 * producto): nada de escribir texto libre ("05:00 AM" a mano invita a errores de formato que
 * un aprendiz mayor no tiene por qué saber corregir). Se elige la hora y el minuto tocando
 * botones grandes, como el resto de los selectores de este mismo diseño (días de la semana,
 * momento del día).
 *
 * Antes de construir esto se revisó `package.json`: el proyecto no trae ningún selector de hora
 * nativo (`@react-native-community/datetimepicker` no está instalado), así que sumar uno hubiera
 * significado una dependencia nueva con código nativo — riesgo y tiempo de build que no hacen
 * falta cuando el propio diseño ya resuelve selección con grillas de botones en todos lados.
 *
 * Los minutos se ofrecen en pasos de 5 (12 opciones) en vez de los 60 posibles: con un dedo
 * grande y una lista de 60 botones, elegir el minuto exacto es más difícil, no más preciso en la
 * práctica — los horarios reales del catálogo ya son casi todos en punto o en :30.
 *
 * ## Corrección — 2026-11-02 — sin huecos y con las 24 horas a la vista (issue #97)
 *
 * Era una tarjeta centrada en un `Modal` con dos `ScrollView horizontal` (una fila de horas y otra
 * de minutos). Un `ScrollView` trae `flexGrow: 1`, y en React Native una caja con alto automático
 * que lleva hijos con `flexGrow` los estira hasta lo que el contenedor tenga disponible: los dos
 * carriles se llevaban TODO el alto de la pantalla y dejaban ~500 px en blanco entre «Hora» y
 * «Minutos» y hasta el botón. Además la fila de horas mostraba solo de 00 a 05: para llegar a las
 * 11 había que arrastrarla de lado. (Los otros carriles horizontales de la app, el de meses de
 * `PlanDelMesModal` y el de íconos de Planificar, ya llevan `flexGrow: 0` por lo mismo.)
 *
 * Ahora es una `HojaDesdeAbajo` del alto de su contenido, como el selector de fecha de nacimiento:
 * la hora elegida en grande, las 24 horas en una grilla de 4 renglones de 6, los minutos en 2
 * renglones de 6 y el botón fijo abajo. Todo a la vista y sin desplazar de lado; solo la cuenta de
 * «cabe o no cabe» (pantalla baja, letra grande del sistema) la cubre UN `ScrollView` vertical con
 * `flexGrow: 0` y tope de alto, para que el botón nunca quede fuera. Lo que se devuelve no cambió:
 * `HH:mm`, horas de 00 a 23 y minutos de 5 en 5. Las props tampoco.
 */

/** Lo que ocupan la cabecera de la hoja (agarradera, título y subtítulo) y su pie (botón e inferior seguro). */
const RESERVA_CABECERA_Y_PIE = 200;

interface HoraPickerModalProps {
  visible: boolean;
  tituloHabito: string;
  /** `HH:mm` (24h) o cadena vacía si el hábito todavía no tiene hora de disparo. */
  horaInicial: string;
  onConfirmar: (hora: string) => void;
  onCerrar: () => void;
}

export function HoraPickerModal({
  visible,
  tituloHabito,
  horaInicial,
  onConfirmar,
  onCerrar,
}: HoraPickerModalProps) {
  const { c } = useTheme();
  const altoMaximo = useAltoMaximoDelCuerpo(RESERVA_CABECERA_Y_PIE);
  const [borrador, setBorrador] = useState(() => partirHora(horaInicial));
  const [abiertoCon, setAbiertoCon] = useState<string | null>(null);

  // Arranca desde la hora que ya tenía quien lo abre cada vez que se abre, no desde un valor fijo. Se ajusta
  // DURANTE el dibujo (y no en un efecto) para que la grilla nazca ya con la hora marcada, sin un cuadro con la anterior.
  const claveDeApertura = visible ? horaInicial : null;
  if (claveDeApertura !== abiertoCon) {
    setAbiertoCon(claveDeApertura);
    if (visible) setBorrador(partirHora(horaInicial));
  }
  const { hora, minuto } = borrador;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      titulo="Elegir hora"
      subtitulo={tituloEnTipoOracion(tituloHabito)}
      etiquetaCerrar="Cerrar el selector de hora"
      pie={
        <GoldButton
          label="GUARDAR HORA"
          icon="check"
          iconPosition="left"
          onPress={() => onConfirmar(armarHora(hora, minuto))}
        />
      }
    >
      {/* `flexGrow: 0`: el `ScrollView` crece por defecto y llenaría la pantalla (el hueco de antes). Aquí mide lo que
          lleva y solo desplaza —UN solo scroll, vertical— si no entra. */}
      <ScrollView
        style={{ flexGrow: 0, maxHeight: altoMaximo }}
        contentContainerStyle={estilos.cuerpo}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={estilos.horaGrande}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Hora elegida: ${armarHora(hora, minuto)}, ${momentoDelDia(hora)}`}
        >
          <Text style={[estilos.horaGrandeTexto, { color: c.textStrong }]}>{armarHora(hora, minuto)}</Text>
          <Text style={[estilos.momento, { color: c.textSoft }]}>{momentoDelDia(hora)}</Text>
        </View>

        <View style={estilos.seccion}>
          <MicroLabel>Hora</MicroLabel>
          <GrillaDeNumeros
            valores={HORAS}
            elegido={hora}
            unidad="horas"
            onElegir={h => setBorrador(b => ({ ...b, hora: h }))}
          />
        </View>

        <View style={estilos.seccion}>
          <MicroLabel>Minutos</MicroLabel>
          <GrillaDeNumeros
            valores={MINUTOS}
            elegido={minuto}
            unidad="minutos"
            onElegir={m => setBorrador(b => ({ ...b, minuto: m }))}
          />
        </View>
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

/**
 * Una grilla de botones de dos cifras en renglones de seis: una pila de filas, cada botón con `flex: 1`. Nada se
 * desplaza ni se envuelve (`flexWrap`): el ancho se reparte parejo y el alto es el de los botones.
 *
 * Elegir no se anima (se toca decenas de veces): el cambio de fondo es en el acto, el botón se hunde al apretar
 * (`Presionable`) y vibra el «tic» de selección una vez por cambio.
 */
function GrillaDeNumeros({
  valores,
  elegido,
  unidad,
  onElegir,
}: {
  valores: readonly number[];
  elegido: number;
  /** Para el lector de pantalla: «09 horas», «30 minutos». */
  unidad: string;
  onElegir: (valor: number) => void;
}) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={estilos.grilla}>
      {enRenglones(valores).map(renglon => (
        <View key={renglon[0]} style={estilos.renglon}>
          {renglon.map(valor => {
            const seleccionado = valor === elegido;
            return (
              <Presionable
                key={valor}
                contenedorStyle={estilos.celda}
                onPress={() => {
                  if (!seleccionado) tacto.seleccion();
                  onElegir(valor);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: seleccionado }}
                accessibilityLabel={`${aDosDigitos(valor)} ${unidad}`}
                style={[
                  estilos.boton,
                  {
                    borderColor: seleccionado ? c.gold : c.border,
                    backgroundColor: seleccionado ? c.gold : c.cardBgAlt,
                  },
                ]}
              >
                <Text style={[estilos.numero, { color: seleccionado ? c.onGold : c.textStrong }]}>
                  {aDosDigitos(valor)}
                </Text>
              </Presionable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 16,
  },
  horaGrande: {
    alignItems: 'center',
    gap: 2,
  },
  horaGrandeTexto: {
    fontFamily: fuentes.regular,
    fontSize: 44,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
  },
  momento: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  seccion: {
    gap: 8,
  },
  grilla: {
    gap: 6,
  },
  renglon: {
    flexDirection: 'row',
    gap: 6,
  },
  celda: {
    flex: 1,
  },
  boton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {
    fontFamily: fuentes.media,
    fontSize: 17,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
});
