import React from 'react';

import { DiagnosticoConectado } from '../components/DiagnosticoConectado';
import { QUE_SIGUE_EN_EL_INGRESO } from '../utils/textosDelDiagnostico';

/**
 * La ficha de ingreso de quien entra «con diagnóstico» (spec 026): va EN LUGAR de la ficha estándar; al terminar sigue Términos y
 * «Tu programa empieza mañana» (`OnboardingFlow`). «Salir» de la portada y de las pantallas de aviso cierra la sesión, como la ficha estándar.
 * El cierre dice que sigue aceptar los Términos y empezar el programa.
 */
export function DiagnosticoDeLaPersonaScreen({ onTerminado, onSalir }: { onTerminado: () => void; onSalir: () => void }) {
  return <DiagnosticoConectado onSalir={onSalir} onTerminado={onTerminado} textoQueSigue={QUE_SIGUE_EN_EL_INGRESO} />;
}
