import { obtenerTracksDeHoy } from '../../habits/api/habitsApi';
import { alCumplirUnHabito } from '../../habits/eventos/habitoCumplido';
import { descripcionDeFase, type ClaveDeFase } from '../../home/hooks/useResumenHome';
import { leerAnimalesDeFase } from '../../yo/api/animalesDeFaseApi';
import { ANIMAL_DE_FASE } from '../../yo/data/animalesDeFase';
import { animalConfigurado } from '../../yo/utils/animalConfigurado';
import { tomarCelebracionDeHoy } from './celebracionDelDia';
import { momentoGrandeActual, publicarMomentoGrande, type FaseDelMomento } from './momentoGrande';

/**
 * Decide la pantalla completa de celebración con lo que dijo `/home` (2026-10-07). La piden Hoy y Yo al leer `/home`, y
 * el anfitrión después de cada hábito cumplido, esté donde esté la persona.
 *
 * Lo que la pantalla muestra lo trae el servidor: la racha de `/home`, los puntos de hoy como la suma de
 * `puntosOtorgados` de `GET /habit-tracks/today` y el animal configurado de la fase (D-258). Si una de esas lecturas
 * falla, ese dato no se muestra; la celebración sale igual.
 */
export type ResumenParaCelebrar = {
  rachaActual: number | null;
  habitosHoy: { completados: number; total: number } | null;
  fase: string | null;
};

/** Lo que espera la pantalla después de un hábito: que su momento chico (check, «+N pts», ~820 ms) se vea entero. */
export const ESPERA_TRAS_UN_HABITO_MS = 1000;

let ultimoHabitoEn = 0;
/** Las decisiones van de a una: Hoy y el anfitrión pueden pedir a la vez, y las dos leerían el día libre. */
let cola: Promise<unknown> = Promise.resolve();

alCumplirUnHabito(() => {
  ultimoHabitoEn = Date.now();
});

async function puntosDeHoy(): Promise<number | null> {
  try {
    const tracks = await obtenerTracksDeHoy();
    return tracks.reduce((suma, t) => suma + (t.puntosOtorgados > 0 ? t.puntosOtorgados : 0), 0);
  } catch {
    return null;
  }
}

async function faseDelMomento(clave: string | null): Promise<FaseDelMomento | null> {
  const descripcion = descripcionDeFase(clave);
  if (!descripcion) return null;
  const configurados = await leerAnimalesDeFase().catch(() => []);
  const configurado = configurados.find(a => a.fase === descripcion.numero);
  const animal = animalConfigurado(ANIMAL_DE_FASE[clave as ClaveDeFase], configurado);
  return { numero: descripcion.numero, nombre: descripcion.nombre, animal };
}

const esperar = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function decidir(usuarioId: string, resumen: ResumenParaCelebrar, hoy: Date): Promise<void> {
  if (momentoGrandeActual()) return;
  const faseNumero = descripcionDeFase(resumen.fase)?.numero ?? null;
  const celebracion = await tomarCelebracionDeHoy(usuarioId, { ...resumen, faseNumero }, hoy).catch(() => null);
  if (!celebracion) return;
  const [puntosHoy, fase] = await Promise.all([
    puntosDeHoy(),
    celebracion.principal === 'fase' ? faseDelMomento(resumen.fase) : Promise.resolve(null),
  ]);
  const falta = ultimoHabitoEn + ESPERA_TRAS_UN_HABITO_MS - Date.now();
  if (falta > 0) await esperar(falta);
  publicarMomentoGrande({ ...celebracion, rachaActual: resumen.rachaActual, puntosHoy, fase });
}

/**
 * Mira los hitos del día con lo que dijo `/home` y, si hay uno libre hoy, muestra la pantalla. Nunca falla: sin
 * almacenamiento o sin red, simplemente no celebra.
 */
export function revisarHitosDelDia(usuarioId: string, resumen: ResumenParaCelebrar, hoy: Date = new Date()): Promise<void> {
  const turno = cola.then(() => decidir(usuarioId, resumen, hoy)).catch(() => undefined);
  cola = turno;
  return turno;
}

/** Solo para pruebas. */
export function reiniciarRevisionParaPruebas(): void {
  ultimoHabitoEn = 0;
  cola = Promise.resolve();
}
