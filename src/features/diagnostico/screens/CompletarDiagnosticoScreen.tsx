import React from 'react';

import { DiagnosticoConectado } from '../components/DiagnosticoConectado';
import { QUE_SIGUE_DENTRO_DE_LA_APP } from '../utils/textosDelDiagnostico';

/**
 * «Completa tu diagnóstico» para quien YA estaba dentro de la app (spec 026, FR-026-9: Administración le asignó el diagnóstico
 * después): el mismo recorrido, abierto desde la tarjeta de Hoy o desde Yo. No pasa por Términos ni por el Día 1; al terminar, su
 * cierre dice que en Plan revise y confirme sus objetivos, y «Continuar» llama a `onTerminado` (quien lo abrió decide a dónde sigue).
 *
 * Las pantallas de aviso (cargando, «todavía no tienes un diagnóstico», sin conexión) llevan la cabecera «‹ Diagnóstico»; el
 * recorrido, la suya: «Salir» en la portada y la flecha con la barra de avance en los pasos. Todo sale por `onBack`.
 */
export function CompletarDiagnosticoScreen({ onBack, onTerminado }: { onBack: () => void; onTerminado: () => void }) {
  return (
    <DiagnosticoConectado
      onSalir={onBack}
      onTerminado={onTerminado}
      tituloDeLaCabecera="Diagnóstico"
      textoQueSigue={QUE_SIGUE_DENTRO_DE_LA_APP}
    />
  );
}
