import type { EleccionAlAceptar, OpcionDeRol } from '../api/adminApi';
import type { AceptacionDeSolicitudApi, OpcionesDeAceptacionApi } from '../api/adminSchemas';
import { etiquetaDeDuracion } from '../../formaciones/utils/etiquetaDeDuracion';
import {
  cantidadDeCuotasEnPalabras,
  paraElPedido,
  pagoInicial,
  problemaDelBorrador,
  totalDelBorrador,
  type BorradorDePago,
  type PagoParaElPedido,
} from '../../pagos/utils/borradorDelCronograma';
import { montoConMoneda } from '../../pagos/utils/dinero';
import { nombreCortoDeFormacion } from '../../formaciones/utils/nombreDeFormacion';
import { fechaCorta } from './fechas';
import { etiquetaDeRol } from './rolesAsignables';

/**
 * Aceptar una solicitud eligiendo formación, duración, rol y ficha (spec 025, backend D-302). Todo lo de acá es lógica pura de la hoja «Aceptar»:
 * qué se pide según el rol, qué falta, la frase del resumen y el cuerpo del pedido. **El servidor decide y valida de nuevo** (qué formaciones
 * están activas, qué duraciones ofrece cada una, si hay un diagnóstico publicado): la app solo evita ofrecer lo que sabe que no sirve.
 */

/** A quién se acepta: una persona o varias marcadas a la vez (decisión 025-3 B y C del dueño). */
export type PersonaPorAceptar = { id: string; nombre: string };

/** Cuántas formaciones se piden según el rol: el aprendiz una; mentor, guía y líder una o varias; Administración y Alquimista ninguna. */
export type ModoDeFormacion = 'una' | 'varias' | 'ninguna';

export function modoDeFormacionDelRol(rolBase: string): ModoDeFormacion {
  switch (rolBase) {
    case 'ADMIN':
    case 'ALCHEMIST':
      return 'ninguna';
    case 'MENTOR':
    case 'TRAINEE_GUIDE':
    case 'MENTOR_LEAD':
      return 'varias';
    default:
      return 'una';
  }
}

/** Lo que Administración tiene elegido en la hoja. `rolClave` es la `clave` de la opción de rol (un rol base o uno personalizado). */
export type BorradorDeAceptacion = {
  formaciones: string[];
  duracionDias: number | null;
  rolClave: string;
  conDiagnostico: boolean;
  /** Spec 032: cómo paga. Un aprendiz parte sin elegir (no se anota «pagó completo» por descuido); el personal, con «Sin cronograma». */
  pago: BorradorDePago;
};

/** Solo el aprendiz paga por su programa: cualquier otro rol (mentor, guía, líder, Administración, Alquimista) es personal. */
export const ROL_BASE_DEL_APRENDIZ = 'TRAINEE';

export function esPersonalElRol(rolBase: string): boolean {
  return rolBase !== ROL_BASE_DEL_APRENDIZ;
}

/** Viene marcado (decisión 025-4 B del dueño): Escuela, Aprendiz y sin diagnóstico. */
export const FORMACION_MARCADA_AL_ACEPTAR = 'ESCUELA';
export const ROL_MARCADO_AL_ACEPTAR = 'TRAINEE';

type Formacion = OpcionesDeAceptacionApi['formations'][number];

function formacionDe(opciones: OpcionesDeAceptacionApi, codigo: string): Formacion | undefined {
  return opciones.formations.find(f => f.code === codigo);
}

/** La duración que se aplica sola: la única que ofrece la formación (Escuela y Certificación). Con varias, hay que elegirla. */
function duracionUnica(formacion: Formacion | undefined): number | null {
  return formacion && formacion.durationsDays.length === 1 ? formacion.durationsDays[0] : null;
}

export function borradorInicial(opciones: OpcionesDeAceptacionApi | null): BorradorDeAceptacion {
  const marcada = opciones ? (formacionDe(opciones, FORMACION_MARCADA_AL_ACEPTAR) ?? opciones.formations[0]) : undefined;
  return {
    formaciones: marcada ? [marcada.code] : [],
    duracionDias: duracionUnica(marcada),
    rolClave: ROL_MARCADO_AL_ACEPTAR,
    conDiagnostico: false,
    pago: pagoInicial(false),
  };
}

/**
 * Cambia el rol y ajusta la formación a lo que ese rol pide, conservando lo que siga siendo válido (US2, escenario 4): de mentor con dos
 * formaciones a aprendiz queda la primera; a Administración no queda ninguna; de vuelta a un rol con formación, la marcada por defecto.
 */
export function alElegirRol(
  borrador: BorradorDeAceptacion,
  rol: OpcionDeRol,
  opciones: OpcionesDeAceptacionApi | null,
  /** El rol base que tenía elegido antes: para saber si «Sin cronograma» venía puesto por ser personal (spec 032). */
  rolBaseAnterior?: string,
): BorradorDeAceptacion {
  const modo = modoDeFormacionDelRol(rol.rolBase);
  const siguiente = { ...borrador, rolClave: rol.clave, pago: pagoAlCambiarDeRol(borrador.pago, rol.rolBase, rolBaseAnterior) };
  if (!opciones) return siguiente;
  if (modo === 'ninguna') return { ...siguiente, formaciones: [], duracionDias: null };
  const conservadas = borrador.formaciones.filter(codigo => formacionDe(opciones, codigo));
  const base = conservadas.length > 0 ? conservadas : borradorInicial(opciones).formaciones;
  const formaciones = modo === 'una' ? base.slice(0, 1) : base;
  return { ...siguiente, formaciones, duracionDias: duracionAlCambiarDeFormacion(formaciones, borrador, modo, opciones) };
}

/**
 * Spec 032: el personal viene con «Sin cronograma» y el aprendiz sin elegir. Al cambiar de rol solo se mueve lo que venía puesto por el rol: lo que
 * Administración ya armó («Con cronograma» y sus cuotas) no se pierde, y un «Sin cronograma» del personal no pasa a ser un «pagó completo» del aprendiz
 * sin que nadie lo elija.
 */
function pagoAlCambiarDeRol(pago: BorradorDePago, rolBase: string, rolBaseAnterior: string | undefined): BorradorDePago {
  if (esPersonalElRol(rolBase)) return pago.modo === null ? { ...pago, modo: 'sin' } : pago;
  const veniaDelPersonal = rolBaseAnterior !== undefined && esPersonalElRol(rolBaseAnterior);
  return pago.modo === 'sin' && veniaDelPersonal ? { ...pago, modo: null } : pago;
}

export function alElegirPago(borrador: BorradorDeAceptacion, pago: BorradorDePago): BorradorDeAceptacion {
  return { ...borrador, pago };
}

/** Marca una formación: elige la única (aprendiz) o suma o quita (personal). */
export function alMarcarFormacion(
  borrador: BorradorDeAceptacion,
  modo: ModoDeFormacion,
  codigo: string,
  opciones: OpcionesDeAceptacionApi,
): BorradorDeAceptacion {
  if (modo === 'ninguna') return borrador;
  const formaciones =
    modo === 'una'
      ? [codigo]
      : borrador.formaciones.includes(codigo)
        ? borrador.formaciones.filter(f => f !== codigo)
        : opciones.formations.map(f => f.code).filter(f => f === codigo || borrador.formaciones.includes(f));
  return { ...borrador, formaciones, duracionDias: duracionAlCambiarDeFormacion(formaciones, borrador, modo, opciones) };
}

/**
 * Solo el aprendiz elige duración. Si cambia de formación se vuelve a pedir (o se aplica sola si la nueva ofrece una única): una duración que quedó de la
 * formación anterior no se arrastra en silencio, porque aceptar a alguien por un año cuando se quería por tres meses no se arregla con un toque.
 */
function duracionAlCambiarDeFormacion(
  formaciones: string[],
  anterior: BorradorDeAceptacion,
  modo: ModoDeFormacion,
  opciones: OpcionesDeAceptacionApi,
): number | null {
  if (modo !== 'una' || formaciones.length !== 1) return null;
  const formacion = formacionDe(opciones, formaciones[0]);
  if (!formacion) return null;
  const sigueEnLaMisma = anterior.formaciones.length === 1 && anterior.formaciones[0] === formaciones[0];
  if (sigueEnLaMisma && anterior.duracionDias !== null && formacion.durationsDays.includes(anterior.duracionDias)) return anterior.duracionDias;
  return duracionUnica(formacion);
}

export function alElegirDuracion(borrador: BorradorDeAceptacion, dias: number): BorradorDeAceptacion {
  return { ...borrador, duracionDias: dias };
}

export function alElegirFicha(borrador: BorradorDeAceptacion, conDiagnostico: boolean): BorradorDeAceptacion {
  return { ...borrador, conDiagnostico };
}

/** Las duraciones entre las que se elige (solo el aprendiz de una formación con más de una); vacío si no hay nada que elegir. */
export function duracionesParaElegir(borrador: BorradorDeAceptacion, modo: ModoDeFormacion, opciones: OpcionesDeAceptacionApi | null): number[] {
  if (!opciones || modo !== 'una' || borrador.formaciones.length !== 1) return [];
  const formacion = formacionDe(opciones, borrador.formaciones[0]);
  return formacion && formacion.durationsDays.length > 1 ? formacion.durationsDays : [];
}

/** Cómo se dice una duración de esa formación: lo que mandó el servidor («3 meses», «1 año») o, si no, la regla de la app. */
export function etiquetaDeLaDuracion(formacion: Formacion | undefined, dias: number): string {
  const indice = formacion ? formacion.durationsDays.indexOf(dias) : -1;
  const delServidor = indice >= 0 ? formacion?.durationLabels[indice] : undefined;
  return delServidor && delServidor.trim() ? delServidor : etiquetaDeDuracion(dias);
}

/** Lo que falta para poder aceptar, en una frase para el pie de la hoja; `null` si ya se puede. */
export function loQueFalta(borrador: BorradorDeAceptacion, modo: ModoDeFormacion, opciones: OpcionesDeAceptacionApi | null): string | null {
  if (!opciones) return null;
  if (modo !== 'ninguna' && borrador.formaciones.length === 0) {
    return modo === 'una' ? 'Elige la formación.' : 'Elige al menos una formación.';
  }
  if (duracionesParaElegir(borrador, modo, opciones).length > 0 && borrador.duracionDias === null) {
    return 'Elige la duración del programa.';
  }
  // Spec 032: solo si este servidor anota el pago. Un aprendiz tiene que elegir cómo paga; con cronograma, que esté completo.
  if (opciones.paymentScheduleAvailable) return problemaDelBorrador(borrador.pago);
  return null;
}

/**
 * Lo que se manda del pago (spec 032): «Con cronograma» siempre; «Sin cronograma (pagó completo)» solo para un aprendiz. Para el personal, dejar «Sin
 * cronograma» (lo que viene puesto) **no anota nada**: no verá «Tu pago fue cancelado» por algo que nunca pagó. Sin este servidor, nada.
 */
export function pagoParaElPedido(
  borrador: BorradorDeAceptacion,
  rolBase: string,
  opciones: OpcionesDeAceptacionApi | null,
): PagoParaElPedido | null {
  if (!opciones?.paymentScheduleAvailable) return null;
  if (borrador.pago.modo === 'sin' && esPersonalElRol(rolBase)) return null;
  return paraElPedido(borrador.pago);
}

/** El cuerpo del pedido. Sin opciones del servidor no se manda nada de formación (ver `leerOpcionesDeAceptacion`). */
export function eleccionParaElPedido(
  borrador: BorradorDeAceptacion,
  opciones: OpcionesDeAceptacionApi | null,
  /** El rol base con el que entra, para decidir si «Sin cronograma» se anota (solo para el aprendiz). */
  rolBase: string = ROL_BASE_DEL_APRENDIZ,
): EleccionAlAceptar | null {
  if (!opciones) return null;
  return {
    formaciones: borrador.formaciones,
    duracionDias: borrador.duracionDias,
    conDiagnostico: borrador.conDiagnostico,
    pago: pagoParaElPedido(borrador, rolBase, opciones),
  };
}

/** Lo que dice el bloque «Pago» cerrado: «Sin elegir», «Sin cronograma» o «Con cronograma · 3 cuotas · US$ 3 000». */
export function valorDelPago(borrador: BorradorDeAceptacion): string {
  const pago = borrador.pago;
  if (pago.modo === null) return 'Sin elegir';
  if (pago.modo === 'sin') return 'Sin cronograma';
  if (pago.filas.length === 0) return 'Con cronograma';
  const total = totalDelBorrador(pago);
  const monto = pago.moneda && total > 0 ? ` · ${montoConMoneda(total, pago.moneda)}` : '';
  return `Con cronograma · ${cantidadDeCuotasEnPalabras(pago.filas.length)}${monto}`;
}

/** La parte de la frase del resumen que habla del pago: « y con cronograma de 3 cuotas», « y pagó completo» o nada (todavía sin elegir; el personal sin cronograma). */
function fraseDelPago(borrador: BorradorDeAceptacion, rol: OpcionDeRol, opciones: OpcionesDeAceptacionApi): string {
  if (!opciones.paymentScheduleAvailable) return '';
  const { modo, filas } = borrador.pago;
  if (modo === 'con') return filas.length > 0 ? ` y con cronograma de ${cantidadDeCuotasEnPalabras(filas.length)}` : ' y con cronograma';
  if (modo === 'sin' && !esPersonalElRol(rol.rolBase)) return ' y pagó completo';
  return '';
}

function nombreDeFormacion(opciones: OpcionesDeAceptacionApi, codigo: string): string {
  return formacionDe(opciones, codigo)?.name ?? nombreCortoDeFormacion(codigo);
}

/**
 * La frase del resumen (FR-007): «María entrará al Diplomado Renaser de 1 año como Aprendiz, con diagnóstico.» Con varias personas, «Las 3
 * personas entrarán …». Con el servidor sin formaciones, solo el rol.
 */
export function frase(
  quien: string,
  plural: boolean,
  borrador: BorradorDeAceptacion,
  rol: OpcionDeRol,
  opciones: OpcionesDeAceptacionApi | null,
  /** `true` una vez aceptada: «entró» en lugar de «entrará» (el aviso de cuando ya se hizo). */
  yaEntro = false,
): string {
  const verbo = yaEntro ? (plural ? 'entraron' : 'entró') : plural ? 'entrarán' : 'entrará';
  const comoRol = `como ${rol.nombre}`;
  if (!opciones) return `${quien} ${verbo} ${comoRol}.`;
  const ficha = borrador.conDiagnostico ? 'con diagnóstico' : 'sin diagnóstico';
  const modo = modoDeFormacionDelRol(rol.rolBase);
  if (modo === 'ninguna') return `${quien} ${verbo} ${comoRol} y ve las tres formaciones, ${ficha}${fraseDelPago(borrador, rol, opciones)}.`;
  const nombres = borrador.formaciones.map(codigo => conArticulo(nombreDeFormacion(opciones, codigo)));
  const donde = nombres.length === 0 ? 'a ninguna formación' : aLa(unir(nombres));
  const unica = borrador.formaciones.length === 1 ? formacionDe(opciones, borrador.formaciones[0]) : undefined;
  const duracion =
    modo === 'una' && borrador.duracionDias !== null && unica && unica.durationsDays.length > 1
      ? ` de ${etiquetaDeLaDuracion(unica, borrador.duracionDias)}`
      : '';
  return `${quien} ${verbo} ${donde}${duracion} ${comoRol}, ${ficha}${fraseDelPago(borrador, rol, opciones)}.`;
}

/** «la Escuela Renaser», «el Diplomado Renaser»: el artículo que lleva cada nombre de fábrica. Un nombre que Administración cambió va sin artículo. */
function conArticulo(nombre: string): string {
  if (/^(Escuela|Certificación)\b/.test(nombre)) return `la ${nombre}`;
  if (/^Diplomado\b/.test(nombre)) return `el ${nombre}`;
  return nombre;
}

/** «a la Escuela», pero «al Diplomado» (a + el). */
function aLa(lista: string): string {
  return lista.startsWith('el ') ? `al ${lista.slice(3)}` : `a ${lista}`;
}

function unir(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

// ── Lo que se muestra de una solicitud ya decidida (US4) ──────────────────────────────────────────────────────────────────

/**
 * «Diplomado 1 año · Aprendiz · con diagnóstico»: lo que se eligió, en una línea. `null` si no hay nada que decir (una pendiente, o un backend
 * anterior que no manda `acceptance`). Las aceptadas antes de las formaciones dicen «Escuela · sin diagnóstico», sin rol ni duración.
 */
export function descripcionDeLaAceptacion(aceptacion: AceptacionDeSolicitudApi | null | undefined): string | null {
  if (!aceptacion) return null;
  const partes: string[] = [];
  if (aceptacion.formations.length === 0) {
    partes.push('Ve las tres formaciones');
  } else {
    const nombres = aceptacion.formations.map(nombreCortoDeFormacion);
    const duracion = aceptacion.durationDays ? ` ${etiquetaDeDuracion(aceptacion.durationDays)}` : '';
    partes.push(`${unir(nombres)}${aceptacion.formations.length === 1 ? duracion : ''}`);
  }
  if (aceptacion.customRoleName) {
    partes.push(aceptacion.role ? `${aceptacion.customRoleName} (${etiquetaDeRol(aceptacion.role)})` : aceptacion.customRoleName);
  } else if (aceptacion.role) {
    partes.push(etiquetaDeRol(aceptacion.role));
  }
  partes.push(aceptacion.withDiagnosis ? 'con diagnóstico' : 'sin diagnóstico');
  return partes.join(' · ');
}

/**
 * Lo que dice una persona ya aceptada: «Aceptada por Ana el 31 de octubre» y, debajo, lo que se eligió. La usan la lista de «Aceptadas» y la ficha de la
 * persona, para que digan exactamente lo mismo (spec 025, US4).
 */
export function textoDeLaAceptada(quien: string | null | undefined, cuando: string | null | undefined, aceptacion: AceptacionDeSolicitudApi | null | undefined): {
  titulo: string;
  detalle: string | null;
} {
  const fecha = cuando ? ` el ${fechaCorta(cuando)}` : '';
  const por = quien ? ` por ${quien}` : '';
  return { titulo: `Aceptada${por}${fecha}`, detalle: descripcionDeLaAceptacion(aceptacion) };
}

// ── La misma que la última (US5, P3) ─────────────────────────────────────────────────────────────────────────────────────

let ultima: BorradorDeAceptacion | null = null;

/** Recuerda lo que se acaba de aceptar, solo en esta sesión de la app: no se guarda en ningún lado. */
export function recordarLaUltima(borrador: BorradorDeAceptacion): void {
  ultima = copiaDelBorrador(borrador);
}

export function laUltimaEleccion(): BorradorDeAceptacion | null {
  return ultima ? copiaDelBorrador(ultima) : null;
}

function copiaDelBorrador(borrador: BorradorDeAceptacion): BorradorDeAceptacion {
  return { ...borrador, formaciones: [...borrador.formaciones], pago: { ...borrador.pago, filas: borrador.pago.filas.map(f => ({ ...f })) } };
}

export function olvidarLaUltima(): void {
  ultima = null;
}
