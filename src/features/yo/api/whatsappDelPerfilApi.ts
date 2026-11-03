import { obtenerCatalogoPreguntas } from '../../onboarding/data/catalogoPreguntas';
import { PREGUNTA_WHATSAPP } from '../../onboarding/data/mapaPreguntas';
import * as onboardingApi from '../../onboarding/api/onboardingApi';
import { whatsappDeLasRespuestas } from '../utils/whatsappDelPerfil';

/**
 * Lee el WhatsApp de la Ficha Inicial de la persona (`GET /onboarding/answers?flow=ficha_inicial`). `null` si todavía no hay uno. Un fallo (sin
 * red, un 5xx, la función apagada) se lanza: quien llama decide qué decir.
 */
export async function leerWhatsappDelPerfil(): Promise<string | null> {
  return whatsappDeLasRespuestas(await onboardingApi.obtenerRespuestas('ficha_inicial'));
}

/**
 * Guarda el WhatsApp en la MISMA respuesta de la ficha (`POST /onboarding/answers`, upsert por persona y pregunta: mandar el número otra vez
 * lo actualiza, nunca lo duplica, así que reintentar es seguro). El `id` de la pregunta sale del catálogo del servidor, nunca escrito a mano
 * (ver `catalogoPreguntas`). A diferencia del guardado del onboarding, aquí un fallo NO se encola: se lanza, para que Perfil avise y la persona
 * vuelva a tocar «Guardar cambios».
 */
export async function guardarWhatsappDelPerfil(numero: string): Promise<void> {
  const catalogo = await obtenerCatalogoPreguntas();
  const resolucion = catalogo.idDe(PREGUNTA_WHATSAPP.clave, PREGUNTA_WHATSAPP.tipo);
  if (!resolucion.ok) throw new Error(resolucion.motivo);
  await onboardingApi.guardarRespuesta({ questionId: resolucion.id, textValue: numero });
}
