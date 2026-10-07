import React from 'react';
import { Text, View } from 'react-native';

import { Card, MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { useProgramaPersonal } from '../../mentor/hooks/useProgramaPersonal';
import { useDiaUnoPorElegir } from '../hooks/useDiaUnoPorElegir';
import { entradaAlProgramaPropio } from '../utils/entradaAlProgramaPropio';
import { BotonElegirDiaUno } from './BotonElegirDiaUno';
import { InvitacionProgramaPropio } from './InvitacionProgramaPropio';

/**
 * La entrada al programa propio en Hoy y en Yo (D-260).
 *
 * - Fila sin Día 1 → «Todavía no elegiste tu Día 1» con «Elegir mi Día 1» (el selector del
 *   onboarding). Antes no había ninguna: la invitación de Hoy se esconde a quien ya tiene fila.
 * - Sin fila → «Hacer mi programa de 90 días». En Hoy, con «Ahora no»; en Yo, siempre que el
 *   servidor diga que puede empezar, sin «Ahora no»: es la entrada para volver después de
 *   posponerlo (antes «Ahora no» la escondía para siempre).
 */
export function EntradaAlProgramaPropio({
  lugar,
  activo,
  usuarioId,
  inscrito,
  diaPrograma,
}: {
  lugar: 'hoy' | 'yo';
  /** Si esta cuenta puede tener un programa opcional (personal). Para el aprendiz, `false`. */
  activo: boolean;
  usuarioId: string | null;
  inscrito: boolean | undefined;
  diaPrograma: number | undefined;
}) {
  const programa = useProgramaPersonal(activo, usuarioId);
  const diaUno = useDiaUnoPorElegir(inscrito, diaPrograma);
  const entrada = entradaAlProgramaPropio({
    diaUnoPorElegir: diaUno.porElegir,
    puedeEmpezar: lugar === 'hoy' ? programa.visible : programa.puedeActivar,
  });

  if (entrada === 'ELEGIR_DIA_UNO') return <TarjetaElegirDiaUno onActivado={diaUno.alElegir} />;
  if (entrada === 'EMPEZAR') return <InvitacionProgramaPropio programa={programa} conAhoraNo={lugar === 'hoy'} />;
  return null;
}

function TarjetaElegirDiaUno({ onActivado }: { onActivado: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card>
      <MicroLabel>Tu programa</MicroLabel>
      <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 8 }]}>Todavía no elegiste tu Día 1</Text>
      <Text style={[t.body, { color: c.textSoft, marginTop: 8 }]}>
        Elige en qué día quieres empezar tus 90 días. Tu programa arranca ese día.
      </Text>
      <View style={{ marginTop: 18 }}>
        <BotonElegirDiaUno onActivado={onActivado} />
      </View>
    </Card>
  );
}
