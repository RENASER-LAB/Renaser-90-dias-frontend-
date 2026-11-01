import React from 'react';
import { StyleSheet } from 'react-native';

import { FilaCompacta } from '../../../components/FilaCompacta';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { useFilaDelProgramaPropio } from '../hooks/useFilaDelProgramaPropio';
import { AvisoConsultaDiaUno } from './AvisoConsultaDiaUno';
import { SelectorDelDiaUno, useSelectorDelDiaUno } from './BotonElegirDiaUno';

type ProgramaPropio = ReturnType<typeof useFilaDelProgramaPropio>;

/**
 * La entrada al programa propio, en Hoy y en Plan, como una fila compacta (2026-11-01, pedido del dueño: «ese de los 90 días con menos
 * texto, el tamaño que antes de coherencia y racha»). Reemplaza a la tarjeta grande «Tu programa · Hacer mi programa de 90 días · Puedes
 * recorrerlo tú también… · Elegir mi Día 1 / Ahora no» (`EntradaAlProgramaPropio`, que Yo conserva).
 *
 * Toda la fila abre el selector del Día 1 (el mismo de siempre). «Ahora no» es una ✕ chica a la derecha, de 48 de área, y hace lo mismo
 * que el botón de antes: deja de ofrecer la invitación a esta cuenta en este teléfono, sin borrar nada. Si alguna lectura falló, en su
 * lugar va el aviso de siempre con «Reintentar Día 1».
 *
 * Qué dice cada caso lo decide `vistaDeLaFilaDelPrograma` (pura); qué estado tiene la cuenta, `useFilaDelProgramaPropio`. Acá solo se dibuja.
 *
 * **Movimiento:** ninguno propio. `Presionable` hunde la fila al apoyar el dedo, y la pantalla que la monta la hace entrar con `Aparicion`.
 */
export function FilaDelProgramaPropio({ programa }: { programa: ProgramaPropio }) {
  const { c } = useTheme();
  const { vista, error, alElegirDiaUno, posponer } = programa;
  const selector = useSelectorDelDiaUno(alElegirDiaUno);

  if (error) return <AvisoConsultaDiaUno mensaje={error.mensaje} reintentar={error.reintentar} />;
  if (!vista) return null;

  return (
    <>
      <FilaCompacta
        icono="calendarRange"
        titulo={vista.titulo}
        linea={vista.linea}
        onPress={vista.abreElSelector ? selector.abrir : undefined}
        accessibilityLabel={vista.etiquetaAccesible}
        accionDerecha={
          vista.conAhoraNo ? (
            <Presionable
              onPress={() => void posponer()}
              accessibilityRole="button"
              accessibilityLabel="Ahora no. No se borra nada."
              contenedorStyle={estilos.areaDeAhoraNo}
              style={estilos.ahoraNo}
            >
              <Icon name="close" size={TAMANO_ICONO.chico} color={c.textSoft} />
            </Presionable>
          ) : null
        }
      />
      <SelectorDelDiaUno {...selector} />
    </>
  );
}

const estilos = StyleSheet.create({
  /** El área táctil de la ✕: 48 × 48, como todo lo pulsable (AGENTS.md §4). */
  areaDeAhoraNo: { width: 48, height: 48 },
  ahoraNo: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
