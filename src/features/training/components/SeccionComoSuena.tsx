import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InterruptorGrande, type ValorDelInterruptorGrande } from '../../../components/InterruptorGrande';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { HabitoConVoz } from '../../alarmas/vozDeLosHabitos';
import type { ClaveDeLaCombinacion } from '../../habits/notificaciones/utils/combinacionDeAlarma';
import {
  filasDeComoSuena,
  vozDeshabilitada,
  type EstadosDeLaSeccion,
  type FilaDeComoSuena,
  type MensajesEnLinea,
  type MotivoDeAtenuacion,
} from '../utils/comoSuena';

/**
 * «Cómo suena» (spec 009): cuatro filas con un interruptor grande —Sonido, Vibración, Voz que dice el hábito y
 * Repetir si no la atiendo—, debajo del recordatorio del editor de Planificar. Es el último bloque de la hoja, en el
 * orden que se lee de arriba abajo: hora → días → recordatorio → cómo suena → guardar (FR-012).
 *
 * Solo dibuja. Qué muestra cada interruptor, qué pasa al tocarlo y qué se guarda lo decide `utils/comoSuena.ts`.
 *
 * ## Pensada para personas de 40 años en adelante (pedido del dueño)
 *
 * - Cada fila es un `InterruptorGrande`: rótulo a 17 px, explicación a 15, fila entera tocable de 56 o más.
 * - Las reglas se dicen EN LÍNEA, justo debajo de la fila que las causa, a 15 px y con el color del texto (el de
 *   error, en rojo): «La voz necesita el sonido»; «Deja encendido el sonido o la vibración…». Nada de diálogos.
 * - Sin aviso (o con el hábito apagado ese día) la sección no tiene qué decidir: se ve atenuada, sin poder tocarse, y
 *   una línea a contraste pleno dice por qué y qué hacer.
 * - La fila «Voz» dice lo que de verdad va a sonar: el nombre del hábito si tiene voz propia, o la frase general
 *   («Tu hábito está por empezar») si es propio, renombrado o nuevo y aún no tiene audio (`filasDeComoSuena`).
 */

export function SeccionComoSuena({
  titulo,
  habito,
  filas,
  mostrados,
  mensajes,
  vozPorElTono = false,
  atenuada,
  alTocar,
}: {
  /** El rótulo del bloque: «Cómo suena», o «Cómo suena de sáb, dom» con días marcados. */
  titulo: string;
  /** El hábito que se edita (id y nombre que ve la persona): de él depende si la voz dice su nombre o la frase general. */
  habito?: HabitoConVoz;
  /**
   * Spec 010: las cuatro filas, si no son las de un hábito. Las acciones de los objetivos no tienen voz propia: su fila
   * «Voz» dice la frase de objetivos. Sin esto, las de `filasDeComoSuena(habito)`, como siempre.
   */
  filas?: ReadonlyArray<FilaDeComoSuena>;
  mostrados: EstadosDeLaSeccion;
  mensajes: MensajesEnLinea;
  /** El tono de Yo → Alarmas ya es «Voz»: la voz está encendida por él y no se cambia desde acá. */
  vozPorElTono?: boolean;
  /** Por qué no se puede usar ahora, o `null`. */
  atenuada: MotivoDeAtenuacion | null;
  alTocar: (clave: ClaveDeLaCombinacion) => void;
}) {
  const { c } = useTheme();

  /** El mensaje de regla que va bajo la fila `clave`, y su color. */
  const mensajeDe = (clave: ClaveDeLaCombinacion): { texto: string; color: string; vivo: boolean } | null => {
    if (clave === 'sonido' && mensajes.sonido) return { texto: mensajes.sonido, color: c.text, vivo: false };
    if (clave === 'vibracion' && mensajes.sonidoOVibracion) return { texto: mensajes.sonidoOVibracion, color: c.danger, vivo: true };
    if (clave === 'voz' && mensajes.voz) return { texto: mensajes.voz, color: c.text, vivo: false };
    return null;
  };

  return (
    <View testID="como-suena" style={estilos.seccion}>
      <View style={estilos.rotulo}>
        <MicroLabel>{titulo}</MicroLabel>
      </View>

      {atenuada && (
        <View style={estilos.motivo} accessibilityLiveRegion="polite">
          <Text style={[estilos.motivoTitulo, { color: c.text }]}>{atenuada.titulo}</Text>
          <Text style={[estilos.motivoAyuda, { color: c.textSoft }]}>{atenuada.ayuda}</Text>
        </View>
      )}

      {(filas ?? filasDeComoSuena(habito)).map(({ clave, etiqueta, descripcion }, i) => {
        const esVoz = clave === 'voz';
        const valor: ValorDelInterruptorGrande = esVoz && vozPorElTono && mostrados.sonido === true ? true : mostrados[clave];
        const sinTocar = atenuada !== null || (esVoz && (vozDeshabilitada(mostrados) || vozPorElTono));
        const mensaje = atenuada ? null : mensajeDe(clave);
        return (
          <View
            key={clave}
            style={[i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider }]}
          >
            <InterruptorGrande
              testID={`como-suena-${clave}`}
              etiqueta={etiqueta}
              descripcion={descripcion}
              valor={valor}
              deshabilitado={sinTocar}
              onCambiar={() => alTocar(clave)}
            />
            {mensaje && (
              <Text
                style={[estilos.mensaje, { color: mensaje.color }]}
                accessibilityLiveRegion={mensaje.vivo ? 'polite' : undefined}
              >
                {mensaje.texto}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { marginTop: 22 },
  rotulo: { minHeight: 24, justifyContent: 'center', marginBottom: 2 },
  motivo: { paddingVertical: 8, gap: 2 },
  motivoTitulo: { fontSize: 16, lineHeight: 22, fontFamily: fuentes.negrita, letterSpacing: 0 },
  motivoAyuda: { fontSize: 15, lineHeight: 21, fontFamily: fuentes.regular, letterSpacing: 0 },
  // La regla en línea: a 15 px, pegada a la fila que la causa y sin ícono de más.
  mensaje: { fontSize: 15, lineHeight: 21, fontFamily: fuentes.media, letterSpacing: 0, paddingBottom: 10, marginTop: -2 },
});
