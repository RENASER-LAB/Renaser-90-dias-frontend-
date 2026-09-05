import { useSyncExternalStore } from 'react';

/**
 * "Hay una conversación de chat ocupando la pantalla ahora mismo" (D-101, D-102).
 *
 * El botón flotante del ACOMPAÑANTE se monta por ENCIMA del navegador (`RenasiaLauncher`), así
 * que no puede saber qué está mostrando la pantalla de abajo. Este módulo es la señal entre los
 * dos: quien abre un chat la enciende mientras está montado, y el flotante se esconde mientras
 * esté encendida.
 *
 * <p>Lo encienden hoy dos pantallas, por el mismo motivo:
 * <ul>
 *   <li>`ChatDelCurso` (Sparkie): dentro de un curso la entrada que corresponde es la del tutor,
 *   y el dueño vio las dos entradas duplicadas en la misma pantalla.</li>
 *   <li>La sala de chat de Comunidad: ahí el flotante se monta justo encima de la barra de
 *   escribir y tapa el botón de enviar. Además es un chat sobre otro chat — la burbuja de la IA
 *   no tiene por qué estar flotando sobre una conversación entre personas.</li>
 * </ul>
 *
 * <p>Antes este archivo se llamaba `chatDeCursoVisible.ts` y hablaba solo del curso. Se
 * generalizó al agregar el segundo caso en vez de duplicar el mecanismo: es exactamente la misma
 * pregunta, y el contador ya soportaba varios emisores.
 *
 * <p>Mismo criterio que `sparkie/events/avisoPrimerPost.ts`: un contador y un `Set` de oyentes en
 * vez de un contexto o una librería.
 */

let montados = 0;
const oyentes = new Set<() => void>();

function avisar(): void {
  oyentes.forEach(o => o());
}

/**
 * Lo llama la pantalla de chat al montarse; devuelve la función para desmontar. Es un contador,
 * no un booleano, así que dos chats montados a la vez (o un desmontaje fuera de orden) no se
 * pisan entre sí.
 */
export function marcarChatMontado(): () => void {
  montados += 1;
  avisar();
  return () => {
    montados = Math.max(0, montados - 1);
    avisar();
  };
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leer(): boolean {
  return montados > 0;
}

/** `true` mientras haya un chat ocupando la pantalla. Lo usa el botón flotante para esconderse. */
export function useHayChatEnPantalla(): boolean {
  return useSyncExternalStore(suscribir, leer, leer);
}
