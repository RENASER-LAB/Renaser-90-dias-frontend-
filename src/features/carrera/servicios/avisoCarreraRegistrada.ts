/**
 * Aviso de que una carrera cambió los km del día en el servidor (spec 042, issue #133). Training lo escucha para volver a leer su
 * agenda: la carrera vive sobre el navegador (`AnfitrionDeLaCarrera`), así que la pestaña nunca pierde el foco y, sin esto, la fila
 * de «Kilómetros diarios» se quedaba con los km de antes cuando la carrera SUMABA (`ACTUALIZADO`) o se enviaba después desde la cola.
 *
 * Solo para lo que cambia la agenda (`CERRADO` o `ACTUALIZADO`) y nunca en una respuesta repetida. Sin AsyncStorage: Training lo
 * importa sin arrastrar la cola.
 */

type Oyente = () => void;
const oyentes = new Set<Oyente>();

export function escucharCarreraRegistrada(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** ¿Esta respuesta del servidor cambió los km del día? */
export function cambiaLosKmDelDia(respuesta: { repetida: boolean; habito: { resultado: string } | null }): boolean {
  return !respuesta.repetida && (respuesta.habito?.resultado === 'CERRADO' || respuesta.habito?.resultado === 'ACTUALIZADO');
}

export function avisarCarreraRegistrada(): void {
  for (const oyente of [...oyentes]) {
    try {
      oyente();
    } catch {
      /* la carrera ya quedó guardada: un oyente roto no la deshace */
    }
  }
}
