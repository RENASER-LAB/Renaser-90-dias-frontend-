import { NOMBRE_ACOMPANANTE } from '../../renasia/data/agentes';

/**
 * Las vistas de la pestaña Yo y cómo se vuelve de cada una (rediseño del 2026-10-05).
 *
 * Yo no navega con un stack: cambia de vista con un `useState`. Hasta el rediseño, «volver» estaba
 * escrito en cada sub-vista y siempre iba a Ajustes, aunque se hubiera llegado desde Yo (el botón
 * «Mi ficha y Pacto» o las miniaturas de evidencias): se tocaba «volver» y se aparecía en una
 * pantalla que nunca se había abierto. Ahora se recuerda de dónde se vino (`origen`), y la cabecera
 * «‹ título» y el gesto del sistema vuelven al mismo lugar.
 */
export type VistaDeYo =
  | 'main'
  | 'hub'
  | 'editar_perfil'
  | 'info_perfil'
  | 'evidencias'
  | 'onboarding'
  | 'pacto'
  | 'mapa_renacimiento'
  | 'metodo'
  | 'notificaciones'
  | 'alarmas'
  | 'memoria_renasia';

/** Las dos vistas desde las que se abre una sub-vista: Yo y Ajustes. */
export type OrigenDeYo = 'main' | 'hub';

/** Adónde lleva «volver» desde `vista`. `null` en Yo, que es la raíz de la pestaña. */
export function vistaDeRegreso(vista: VistaDeYo, origen: OrigenDeYo): VistaDeYo | null {
  if (vista === 'main') return null;
  if (vista === 'hub') return 'main';
  // El Pacto y el Mapa son etapas de «Mi onboarding»: se vuelve a la lista de etapas.
  if (vista === 'pacto' || vista === 'mapa_renacimiento') return 'onboarding';
  return origen;
}

/**
 * El origen después de pasar de `previa` a otra vista: cambia solo cuando se sale de Yo o de
 * Ajustes; entrar a una etapa (Pacto, Mapa) y volver a la lista no lo pierde.
 */
export function origenTrasCambio(previa: VistaDeYo, origenActual: OrigenDeYo): OrigenDeYo {
  return previa === 'main' || previa === 'hub' ? previa : origenActual;
}

/**
 * El título de la cabecera «‹ título» de cada sub-vista: el de la fila que la abre, en tipo
 * oración. Antes cada una tenía «← VOLVER A AJUSTES» y una píldora con el nombre en versales.
 */
export const TITULO_DE_VISTA: Record<Exclude<VistaDeYo, 'main' | 'mapa_renacimiento'>, string> = {
  hub: 'Ajustes',
  editar_perfil: 'Editar perfil',
  info_perfil: 'Información',
  evidencias: 'Mis evidencias',
  onboarding: 'Mi onboarding',
  pacto: 'El Pacto',
  metodo: 'El Método Renaser',
  notificaciones: 'Notificaciones',
  alarmas: 'Alarmas',
  memoria_renasia: `Lo que ${NOMBRE_ACOMPANANTE} recuerda`,
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * «29 de septiembre de 2026»: el día en que se firmó el Pacto, en la zona del teléfono, a partir de
 * `pactSignedAt` (`GET /api/v1/onboarding/state`). `null` si no hay fecha o no se puede leer: la
 * pantalla dice entonces «Pacto firmado», sin inventar un día.
 *
 * Sin `Intl` a propósito: en Android depende de cómo se compiló Hermes, y una fecha de firma no
 * puede salir en inglés o vacía en un teléfono y bien en otro.
 */
export function fechaDeFirma(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}
