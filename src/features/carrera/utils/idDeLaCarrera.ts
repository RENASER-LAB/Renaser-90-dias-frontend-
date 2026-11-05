/**
 * La `carreraId` (FR-002): un UUID v4 hecho en el teléfono al empezar. Es la clave de idempotencia del único envío. Se usa
 * `expo-crypto` (ya en la app); si no estuviera, un v4 armado con `Math.random` (la clave solo tiene que no repetirse para la misma
 * persona, el servidor la acota por participante).
 */
export function nuevaCarreraId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto') as { randomUUID?: () => string };
    const id = Crypto.randomUUID?.();
    if (id && esUuid(id)) return id;
  } catch {
    // Sin el módulo nativo: el respaldo de abajo.
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function esUuid(texto: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(texto);
}
