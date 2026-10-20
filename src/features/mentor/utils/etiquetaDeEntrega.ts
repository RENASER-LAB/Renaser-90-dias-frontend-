/**
 * La entrega de un hábito y su revisión son dos hechos: se dicen los dos, no uno mezclado.
 *
 * El post diario se cumple publicando en el Muro (spec 005, E-628): su entrega es la publicación, sin archivo ni
 * revisión. Sin esta rama, la ficha decía «pendiente de revisión» de algo que nadie revisa (E-629 (c)).
 */
export function etiquetaDeEntrega(entrega: string, revision: string | null, publicacionId: string | null): string {
  if (entrega === 'SIN_ENTREGA') return 'Evidencia sin entregar';
  switch (revision) {
    case 'VALIDA':
      return 'Evidencia entregada · verificada';
    case 'RECHAZADA':
      return 'Evidencia entregada · rechazada';
    case 'REVISION_MANUAL':
      return 'Evidencia entregada · en revisión';
    default:
      return publicacionId ? 'Publicado en el Muro' : 'Evidencia entregada · pendiente de revisión';
  }
}
