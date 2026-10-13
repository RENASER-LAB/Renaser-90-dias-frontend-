import { Alert } from '../../../components/Alerta';
import { textoDelAviso } from './textoDelAviso';
import type { EstadoDeUnaFuncionalidad } from '../estado/evaluacion';

/**
 * Para un botón que dispara algo apagado (grabar una nota de voz, mandar una foto): en vez de empezar y que el servidor
 * lo rechace al final, se dice antes, en un diálogo, con el aviso de Soporte TI (spec 002). Devuelve `true` si avisó
 * (quien llama no sigue). Se usa donde no hay lugar para el aviso grande: un ícono dentro de la barra de escribir.
 *
 *     onPress={() => avisarSiEstaApagada(fotosDelChat) || abrirGaleria()}
 */
export function avisarSiEstaApagada(funcionalidad: EstadoDeUnaFuncionalidad): boolean {
  if (funcionalidad.prendida) return false;
  Alert.alert('En mantenimiento', textoDelAviso(funcionalidad.aviso));
  return true;
}
