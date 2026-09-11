import { Alert, Platform } from 'react-native';

/**
 * Diálogos que funcionan también en web.
 *
 * En react-native-web 0.21 el módulo `Alert` es literalmente `class Alert { static alert() {} }`
 * —una función vacía—, así que `Alert.alert` NO hace nada en el build web de Expo (el que corre en
 * Vercel): las confirmaciones no disparan su callback y los errores no se ven. En el panel de
 * administración, que se opera desde el navegador, eso dejaba «cambiar rol», «quitar mentor»,
 * «retirar aprendiz» y «rechazar solicitud» tocables pero muertos.
 *
 * En nativo se conserva `Alert.alert`, que ahí sí funciona; solo se desvía el camino de web a las
 * primitivas del navegador.
 */
const ES_WEB = Platform.OS === 'web';

/** Aviso de un solo botón (info o error). */
export function avisar(titulo: string, mensaje?: string): void {
  if (ES_WEB) {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
    }
    return;
  }
  Alert.alert(titulo, mensaje);
}

/**
 * Confirmación sí/no. Resuelve `true` si la persona aceptó.
 *
 * Se usa con `await`: `if (!(await confirmar(...))) return;`. En web cae en `window.confirm`, que
 * es bloqueante y devuelve el booleano directo; en nativo envuelve `Alert.alert` en una promesa.
 */
export function confirmar(
  titulo: string,
  mensaje?: string,
  opciones?: { ok?: string; cancelar?: string; destructivo?: boolean },
): Promise<boolean> {
  const textoOk = opciones?.ok ?? 'Sí';
  const textoCancelar = opciones?.cancelar ?? 'Cancelar';

  if (ES_WEB) {
    const texto = mensaje ? `${titulo}\n\n${mensaje}` : titulo;
    const acepto =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(texto)
        : true; // sin window.confirm (poco probable) no se traba la operación
    return Promise.resolve(acepto);
  }

  return new Promise(resolve => {
    Alert.alert(titulo, mensaje, [
      { text: textoCancelar, style: 'cancel', onPress: () => resolve(false) },
      {
        text: textoOk,
        style: opciones?.destructivo ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
