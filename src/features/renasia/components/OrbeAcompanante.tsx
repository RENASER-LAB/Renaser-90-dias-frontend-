import React, { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { FenixDeSer, type FenixDeSerHandle } from "../../fenix/components/FenixDeSer";
import { FenixDeSerQuieto } from "../../fenix/components/FenixDeSerQuieto";
import type { FaseDeVoz } from "../hooks/useConversacionPorVoz";
import { useOrbeALaVista } from "../hooks/useOrbeALaVista";

const ETIQUETA: Record<FaseDeVoz, string> = {
  reposo: "Hablarle a tu acompañante",
  escuchando: "Terminé de hablar",
  pensando: "Tu acompañante está pensando",
  hablando: "Callar a tu acompañante",
};

/** El dibujo del fénix deja aire alrededor (sombra, brasas): se dibuja más grande que el área de toque. */
const ESCALA_DEL_FENIX = 1.2;

type Props = {
  fase: FaseDeVoz;
  /** Diámetro del área del orbe (~140 en Hoy). Es también el área de toque. */
  diametro: number;
  onTocar: () => void;
  /** Mantener presionado: cierra la conversación en vivo (E-458). Sin conversación abierta no viene. */
  onMantener?: () => void;
  deshabilitado?: boolean;
};

/**
 * El acompañante en el centro de Hoy: tocarlo y hablarle (`useConversacionPorVoz`). Desde el 2026-10-06 (pedido del
 * dueño) su cara es el **fénix vivo** (`FenixDeSer`), el único de la app: ánimo del semáforo, vida autónoma, la fase de
 * la voz, el saludo, el toque, el asentir al cumplir un hábito y la celebración de los hitos.
 *
 * **Funciona igual que el orbe**: el mismo botón, el mismo tamaño de toque, las mismas etiquetas por fase, mantener
 * presionado para cerrar, deshabilitado y la opacidad al apoyar. Mientras la voz está activa queda el aro dorado fino
 * de antes y, debajo, un halo que late con el ritmo de la fase (dice «te escucho» sin texto).
 *
 * Cuando Hoy no se ve (otra pestaña, app en segundo plano: `useOrbeALaVista`) el fénix pasa a la foto fija del ánimo:
 * el lienzo Rive no dibuja para nadie (entrega v3.3 §8.9; el mismo motivo por el que el orbe se pausaba).
 *
 * > **Corregido 2026-10-06.** Era la nube de puntos de `expo-thinking-orbs` (`OrbeDePuntos`, con tope de cuadros por
 * > el lag del Xiaomi, 2026-09-26) y, en la web o si fallaba Skia, un disco dorado con micrófono (`OrbeSimple`). En
 * > la web ahora se ve la foto del ánimo. `OrbeDePuntos`, `orbes.ts` y `ritmoDelOrbe.ts` quedan sin usar.
 */
export function OrbeAcompanante({ fase, diametro, onTocar, onMantener, deshabilitado }: Props) {
  const aLaVista = useOrbeALaVista();
  const fenix = useRef<FenixDeSerHandle>(null);
  const lado = Math.round(diametro * ESCALA_DEL_FENIX);
  const centrado = { left: (diametro - lado) / 2, top: (diametro - lado) / 2 };

  return (
    <Pressable
      onPress={onTocar}
      onPressIn={() => fenix.current?.tocado()}
      onLongPress={onMantener}
      accessibilityHint={onMantener ? "Mantén presionado para cerrar la conversación" : undefined}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={ETIQUETA[fase]}
      style={({ pressed }) => [
        styles.contenedor,
        { width: diametro, height: diametro, opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {/* La vista Rive se queda con los toques: sin `pointerEvents="none"`, tocar el fénix no llegaba al botón. */}
      <View pointerEvents="none" style={[styles.fenix, centrado]}>
        {aLaVista ? (
          <FenixDeSer ref={fenix} estado={fase} size={lado} etiqueta="Fénix, tu acompañante" />
        ) : (
          <FenixDeSerQuieto size={lado} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: "center", justifyContent: "center" },
  fenix: { position: "absolute" },
});
