import { Alert } from '../../components/Alerta';
import { cuentaDeLaSesion, leerCola } from './colaSinRed';

/**
 * Spec 048 (FR-009, D11): al cerrar sesión se borra lo que esperaba enviarse. Si hay algo, se avisa antes cuántas cosas se
 * perderían; si no, sale sin preguntar.
 */
export function textoDelAvisoDeSalida(pendientes: number): string {
  const cosas = pendientes === 1 ? '1 cosa que todavía no se envió' : `${pendientes} cosas que todavía no se enviaron`;
  return `Tienes ${cosas}. Si sales ahora se pierden. Espera a tener señal para no perderlas.`;
}

export async function salirAvisandoPendientes(salir: () => void): Promise<void> {
  const cuenta = cuentaDeLaSesion();
  const pendientes = cuenta ? (await leerCola(cuenta)).length : 0;
  if (pendientes === 0) {
    salir();
    return;
  }
  Alert.alert('Tienes cosas sin enviar', textoDelAvisoDeSalida(pendientes), [
    { text: 'Quedarme', style: 'cancel' },
    { text: 'Salir igual', style: 'destructive', onPress: salir },
  ]);
}
