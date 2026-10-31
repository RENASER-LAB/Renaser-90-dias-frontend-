import React, { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { ResumenDeGrupos } from '../components/ResumenDeGrupos';
import type { InicioSemanal, LecturaDeGrupos } from '../hooks/useLecturaPorSemana';
import type { GrupoDelResumen } from '../types/semaforo.types';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * El semáforo por grupos del **líder de mentores** (`GET /api/v1/semaforo/groups`, contrato §4.4):
 * los totales y una tarjeta por grupo con su mentor, cuántos aprendices hay en cada color y el
 * promedio. Esta pantalla **no trae nombres**: las personas están un toque más adentro.
 *
 * > **Corregido 2026-10-19 (spec 005).** Decía: «Sin nombres de aprendices (RL-07): las tarjetas no se
 * > abren, y se dice por qué». El dueño pidió que el líder baje del grupo a la persona: con `onAbrirGrupo`,
 * > cada tarjeta que el servidor dice que se puede abrir (`puedeAbrirse`) lleva a la lista de sus personas.
 * > Contra un backend anterior el campo falta, las tarjetas no se abren y el texto es el de siempre.
 *
 * Es estado de Hoy, como la bandeja de tickets —la otra pantalla propia de este rol—, y la abre
 * también el aviso del sábado (`/semaforo/grupos`). Recibe la MISMA lectura con la que Hoy decide
 * si mostrar la entrada; al abrirse vuelve a la ventana vigente y la relee, porque el barrido corre
 * cada hora y la entrada pudo quedar abierta desde temprano.
 *
 * **Spec 018: sin la línea de ayuda bajo «Por grupo»** («Toca un grupo para ver a sus personas.» / «Solo cantidades: …»). Las
 * tarjetas que se abren llevan su chevron y las que no, no lo llevan: la línea repetía lo que ya se ve.
 *
 * Un único scroll, cuerpo de 16 px y controles de 48 px (§5).
 */
export function SemaforoGruposScreen({
  lectura,
  onVolver,
  onAbrirGrupo,
  conservarSemana = false,
}: {
  lectura: LecturaDeGrupos;
  onVolver: () => void;
  /** Abre la lista de personas de un grupo, parada en la misma semana que se está mirando. */
  onAbrirGrupo?: (grupo: GrupoDelResumen, inicio: InicioSemanal) => void;
  /**
   * Al volver de un grupo (spec 005) la pantalla vuelve a montarse; con esto NO regresa a la ventana
   * vigente ni relee: queda en la semana que se estaba mirando.
   */
  conservarSemana?: boolean;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  /* Solo al abrir: la función cambia en cada render y no tiene que volver a correr. */
  const volverAVigente = useRef(lectura.volverAVigente);
  const conservar = useRef(conservarSemana);
  useEffect(() => {
    if (!conservar.current) volverAVigente.current();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* «‹ Título», la misma cabecera que el resto de las pantallas del líder (2026-10-31). */}
      <CabeceraAdmin titulo="Semáforo por grupos" onVolver={onVolver} />

      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 8,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <ResumenDeGrupos
          lectura={lectura}
          onAbrirGrupo={onAbrirGrupo ? grupo => onAbrirGrupo(grupo, lectura.inicio) : undefined}
          soloSiPuedeAbrirse
        />
      </ScrollView>
    </SafeAreaView>
  );
}
