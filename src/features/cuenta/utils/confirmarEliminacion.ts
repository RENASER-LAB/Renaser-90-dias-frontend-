import { Alert } from '../../../components/Alerta';

/**
 * La última pregunta antes de eliminar, con el botón destructivo «Eliminar mi cuenta».
 *
 * Usa `Alert` de `components/Alerta` y no `window.confirm`: en el teléfono es el diálogo del sistema
 * y en la web uno propio (el `Alert` de react-native-web no ejecuta los `onPress`, E-144). Cerrar el
 * diálogo sin elegir equivale a cancelar.
 */
export function confirmarEliminacion(titulo: string, mensaje: string, textoDelBoton = 'Eliminar mi cuenta'): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: textoDelBoton, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
