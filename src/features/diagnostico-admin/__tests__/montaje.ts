/**
 * Ayudas para las pruebas que MONTAN pantallas del diagnóstico de Administración: leer los textos, encontrar el tocable que
 * contiene un texto y tocarlo. Los dobles de tema, hoja y red van en cada prueba (`jest.mock` se eleva por archivo).
 */
import type { ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { act } from 'react-test-renderer';

export function textosDe(nodos: ReactTestInstance[]): string[] {
  return nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .filter(Boolean);
}

export function crearAyudas(raiz: () => ReactTestRenderer) {
  const textos = () => textosDe(raiz().root.findAll(() => true));
  const hay = (texto: string) => textos().some(t => t.includes(texto));

  /** El tocable más interno que contiene ese texto exacto. */
  function tocableCon(texto: string): ReactTestInstance {
    const t = raiz().root.findAll(n => n.type === 'Text' && textosDe([n]).some(x => x === texto))[0];
    if (!t) throw new Error(`No hay «${texto}»: ${textos().join(' | ')}`);
    const n = raiz().root.findAll(x => typeof x.props.onPress === 'function' && x.findAll(y => y === t).length > 0).at(-1);
    if (!n) throw new Error(`«${texto}» no está dentro de nada tocable`);
    return n;
  }

  /** El tocable con ese nombre accesible. */
  function tocablePorEtiqueta(etiqueta: string): ReactTestInstance {
    const n = raiz().root.findAll(x => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === etiqueta).at(-1);
    if (!n) throw new Error(`No hay un tocable «${etiqueta}»`);
    return n;
  }

  const apagado = (n: ReactTestInstance) => n.props.disabled === true || n.props.accessibilityState?.disabled === true;
  /** Toca como un dedo: un tocable apagado no responde (en la prueba, `onPress` existe aunque `disabled` sea verdadero). */
  const tocarNodo = (n: ReactTestInstance) => act(async () => { if (!apagado(n)) await n.props.onPress(); });
  const tocar = (texto: string) => tocarNodo(tocableCon(texto));
  const tocarPorEtiqueta = (etiqueta: string) => tocarNodo(tocablePorEtiqueta(etiqueta));
  const campo = (etiqueta: string): ReactTestInstance => {
    const n = raiz().root.findAll(x => x.props.accessibilityLabel === etiqueta && typeof x.props.onChangeText === 'function')[0];
    if (!n) throw new Error(`No hay un campo «${etiqueta}»`);
    return n;
  };
  const escribir = (etiqueta: string, valor: string) => act(async () => { campo(etiqueta).props.onChangeText(valor); });

  return { textos, hay, tocableCon, tocablePorEtiqueta, apagado, tocar, tocarPorEtiqueta, tocarNodo, campo, escribir };
}
