/**
 * Qué frase de confrontación toca hoy.
 *
 * Decisión pura: recibe el día de programa y devuelve la frase. No sabe de pantallas, no llama a
 * ningún servicio y no guarda nada — así se puede razonar y probar sin montar la app.
 *
 * ## Se DERIVA del día; no se guarda ni se avanza
 *
 * La frase es `f(día)`, no un puntero que alguien incrementa cada noche. Es la misma regla que
 * `.claude/rules/02` §2 le impone a todo lo que depende del calendario, y existe por un bug real
 * (E-91): un contador que se incrementa **pierde para siempre** cualquier corrida que no ocurra —
 * una noche con el backend caído y la persona queda desfasada el resto del programa.
 *
 * Derivada, la función es idempotente gratis: abrir la app diez veces el mismo día muestra la
 * misma frase, y abrirla después de tres días sin entrar muestra la que toca hoy, no la que quedó
 * pendiente.
 *
 * ## El día viene del backend, no del reloj del teléfono
 *
 * Se recibe `diaPrograma` —el que `GET /api/v1/home` ya calcula en la zona horaria del
 * participante— y **no** se deriva de `new Date()`. Es deliberado: el padrón vive en
 * `America/Lima` y el teléfono puede estar en cualquier huso. Calcularlo acá volvería a abrir
 * exactamente el agujero de E-91.
 *
 * > **Corregido 2026-11-01.** Eso vale para quien TIENE día de programa. Quien no lo tiene (personal sin programa, Día 0, sin Día 1
 * > elegido) no tiene de dónde sacar un día: para esa persona la frase se elige por la fecha del calendario (ver `fraseDelDia`).
 */
import { FRASES_DE_CONFRONTACION, type FraseConfrontacion } from '../data/frasesDeConfrontacion';

/**
 * Los días enteros desde el 1 de enero de 1970 de una fecha civil `YYYY-MM-DD`, o `null` si no es una fecha.
 *
 * Aritmética en UTC sobre la fecha ya escrita, sin zona del teléfono: la misma fecha da siempre el mismo número. Se comprueba que la
 * fecha exista (el 31 de febrero no es un día), porque `Date.UTC` lo corrige en silencio al 3 de marzo.
 */
function diaDelCalendario(fechaCivil: string | null | undefined): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaCivil ?? '');
  if (!partes) return null;
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return Math.floor(fecha.getTime() / 86_400_000);
}

/**
 * La frase del día.
 *
 * Con día de programa (1 en adelante) es `f(día)`, como siempre. **Sin día de programa** —personal que no hace el suyo, Día 0 (eligió su
 * Día 1 y espera) o quien todavía no lo eligió— se elige por la FECHA del calendario (`fechaDeHoy`, `YYYY-MM-DD`): también es
 * `f(fecha)`, derivada y sin guardar nada, así que abrir la app diez veces el mismo día da la misma frase y no se desfasa por no entrar.
 *
 * > **Corregido 2026-11-01 (pedido del dueño: «recuerda la frase… que salga pese que no inició su programa»).** Antes devolvía `null`
 * > sin día de programa, para no mostrarle la frase del día 1 a quien no empezó. Ahora sí hay frase, pero no es «la del día 1»: es la que
 * > toca por calendario, que no dice dónde está la persona en un programa que no corre. Si ni hay día ni hay fecha (todavía no se sabe),
 * > sigue sin inventar nada: `null`.
 *
 * **La fecha es la del teléfono** (el día civil local), porque `/home` no manda la fecha de hoy. Aquí no es el riesgo de E-91: no hay
 * contador ni nada guardado, y un huso distinto solo cambia cuál de las nueve frases toca ese día.
 */
export function fraseDelDia(
  diaPrograma: number | null | undefined,
  fechaDeHoy?: string | null,
): FraseConfrontacion | null {
  if (typeof diaPrograma === 'number' && Number.isFinite(diaPrograma) && diaPrograma >= 1) {
    return FRASES_DE_CONFRONTACION[Math.floor(diaPrograma - 1) % FRASES_DE_CONFRONTACION.length];
  }
  const dia = diaDelCalendario(fechaDeHoy);
  if (dia === null) return null;
  /* Módulo que nunca es negativo: una fecha anterior a 1970 no rompe el índice. */
  const total = FRASES_DE_CONFRONTACION.length;
  return FRASES_DE_CONFRONTACION[((dia % total) + total) % total];
}
