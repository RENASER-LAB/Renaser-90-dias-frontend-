/**
 * Parche seguro de JSON al deserializar una firma (AGENTS.md §3).
 *
 * Vive en su propio módulo, separado de `SignatureCanvas.tsx`, para poder probarse: el componente
 * arrastra `ThemeContext` -> AsyncStorage, que es un módulo nativo y no carga bajo Jest. Es el
 * mismo criterio que ya siguen `theme/modoDeTema.ts` y los `utils/` de cada feature. `SignatureCanvas`
 * lo sigue reexportando, así que para quien lo importa no cambió nada.
 *
 * Nunca lanza, a propósito: `data` no siempre es el JSON de los trazos. Desde el modo dual una
 * firma electrónica guarda ahí el NOMBRE pelado de la persona, y las firmas viejas pueden llegar
 * sin `type`. Una excepción acá se comería la pantalla entera del Pacto al abrirse.
 */
export function safeParsePaths(data: string | undefined | null): string[] {
  if (!data || typeof data !== 'string' || data.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
