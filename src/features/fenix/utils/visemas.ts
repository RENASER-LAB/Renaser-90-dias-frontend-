/**
 * Visemas sintéticos para la boca del fénix (`director.speak([{ t, mouth }])`, contrato §3: `mouth` 0 cerrado … 3
 * abierto). La voz del acompañante llega como audio sin marcas de tiempo por sílaba, así que no hay visemas reales:
 * se arma un patrón natural de habla, sílabas de 110–190 ms que abren (vocal) y cierran (consonante), con un respiro
 * entre palabras y una pausa más larga cada tanto. El `rng` se inyecta para que las pruebas sean deterministas.
 */
export type Visema = { t: number; mouth: number };

const SILABA_MIN_MS = 110;
const SILABA_MAX_MS = 190;
const ENTRE_PALABRAS_MS = 90;
const PAUSA_DE_FRASE_MS = 260;

export function visemasNaturales(duracionMs: number, rng: () => number = Math.random): Visema[] {
  const pista: Visema[] = [];
  let t = 0;
  let palabrasEnLaFrase = 0;
  while (t < duracionMs) {
    const silabas = 1 + Math.floor(rng() * 3);
    for (let s = 0; s < silabas && t < duracionMs; s++) {
      const dur = SILABA_MIN_MS + rng() * (SILABA_MAX_MS - SILABA_MIN_MS);
      pista.push({ t: Math.round(t), mouth: rng() < 0.55 ? 3 : 2 });          // vocal: abre
      pista.push({ t: Math.round(t + dur * 0.6), mouth: rng() < 0.5 ? 0 : 1 }); // consonante: cierra
      t += dur;
    }
    palabrasEnLaFrase++;
    const finDeFrase = palabrasEnLaFrase >= 4 && rng() < 0.35;
    if (finDeFrase) palabrasEnLaFrase = 0;
    t += finDeFrase ? PAUSA_DE_FRASE_MS : ENTRE_PALABRAS_MS;
  }
  return pista.filter(v => v.t < duracionMs);
}
