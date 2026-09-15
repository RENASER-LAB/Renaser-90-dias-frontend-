/**
 * Las frases de confrontación de Renaser.
 *
 * **El texto es del cliente, no mío.** Sale de la *Guía de confrontación Renaser*, sección
 * "Frases y principios extraídos". No se reescriben, no se suavizan y no se agregan frases nuevas:
 * confrontar sin humillar es una decisión de método que ya está tomada, y una frase inventada acá
 * rompería el tono que la guía define con precisión ("atacar el comportamiento, la excusa y el
 * patrón, manteniendo el respeto absoluto por la dignidad de la persona").
 *
 * Lo único que se tocó es la **forma**, no el contenido: la guía escribe una de ellas como
 * "Lo RECONOCES, Lo CORRIGES, CONTINÚAS" y acá va en caja de frase, por la misma razón por la que
 * el resto de la app dejó las versales espaciadas — gritar no es énfasis. Las palabras son las
 * mismas.
 *
 * ## Por qué nueve y no siete
 *
 * El pedido fue **una frase por día, siete distintas por semana**. Con nueve en ciclo eso se
 * cumple igual —dentro de cualquier semana se ven siete frases distintas— y además la semana 2 no
 * repite el mismo orden que la 1, que es lo que pasaría con exactamente siete. Nueve son las que
 * la guía trae; no se rellenó hasta un múltiplo de siete para no inventar texto.
 */

export interface FraseConfrontacion {
  /** Estable y único. Sirve como `key` de lista y para no depender del índice al ordenar. */
  readonly id: string;
  /** El texto, tal cual lo dice la guía. */
  readonly texto: string;
}

export const FRASES_DE_CONFRONTACION: readonly FraseConfrontacion[] = [
  { id: 'revela', texto: 'Esta semana no te transforma. Te revela. La transformación empieza cuando ves tu verdad.' },
  { id: 'observa', texto: 'No te juzgues. Obsérvate. El juicio cierra puertas. La observación las abre.' },
  { id: 'reconoce', texto: 'Si fallaste en algo: lo reconoces, lo corriges, continúas. No te castigas.' },
  { id: 'postear', texto: 'Postear cada día es un acto de no victimismo: es sostener tu proceso públicamente.' },
  { id: 'abundancia', texto: 'La abundancia no llega por pensar positivo. Llega cuando dejas de sabotearte.' },
  { id: 'desordenado', texto: 'No eres débil. Estabas desordenado. No eras incapaz. Estabas distraído.' },
  { id: 'controla', texto: 'Todo lo que no se observa… te controla.' },
  { id: 'excusas', texto: 'Esta etapa no vino a darte respuestas. Vino a quitarte excusas.' },
  { id: 'disena', texto: 'Las personas promedio reaccionan al día. Las personas extraordinarias diseñan su día.' },
] as const;
