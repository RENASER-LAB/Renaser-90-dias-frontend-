/**
 * La línea bajo el nombre de un aprendiz en su ficha del mentor: solo lo que se sabe.
 *
 * > **Corregido 2026-09-26 (S-1).** Decía «Día por confirmar» cuando el día llegaba en `null`, y
 * > llega SIEMPRE en `null` desde la lista del grupo (`mentorApi.ts`). Una frase que se repite igual
 * > en todas las personas no informa: ahora, sin dato, no se dice nada.
 *
 * `null` = no hay nada que decir y la pantalla no dibuja la línea.
 */
export function subtituloDelAlumno(diaPrograma: number | null, diasSinActividad: number | null): string | null {
  const partes: string[] = [];
  if (diaPrograma !== null) {
    partes.push(diaPrograma <= 0 ? 'Todavía no arrancó su programa' : `Día ${diaPrograma} de 90`);
  }
  if (diasSinActividad !== null) {
    partes.push(
      `última actividad hace ${
        diasSinActividad === 0 ? 'menos de un día' : diasSinActividad === 1 ? '1 día' : `${diasSinActividad} días`
      }`,
    );
  }
  if (partes.length === 0) return null;
  const texto = partes.join(' · ');
  return texto[0].toUpperCase() + texto.slice(1);
}
