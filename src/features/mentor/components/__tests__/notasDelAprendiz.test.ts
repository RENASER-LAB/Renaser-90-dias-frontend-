import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import type { NotaDelMentor, OrigenDeLasNotas } from '../../api/mentorApi';
import { altoDelToque, hayTocable, montar, porTestID, porTipo, tocable, tocar, todoElTexto } from '../../__tests__/ayudasDeLasPantallas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HojaDesdeAbajo: ({ visible, titulo, subtitulo, children }: { visible: boolean; titulo: string; subtitulo?: string; children: React.ReactNode }) =>
      visible ? R.createElement(View, null, R.createElement(Text, null, `TITULO: ${titulo}`), R.createElement(Text, null, `SUBTITULO: ${subtitulo ?? ''}`), children) : null,
  };
});

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => {
  const actual = jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient');
  return { ...actual, apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones) };
});

import { BotonDeNota } from '../IconosDeLaCabecera';
import { HojaDeNotas, ACLARACION_DEL_MENTOR } from '../HojaDeNotas';
import { NotasDeLectura } from '../NotasDeLectura';
import { SIN_RED_AL_GUARDAR, useNotasDelAprendiz } from '../../hooks/useNotasDelAprendiz';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const nota = (id: string, texto: string, extra: Partial<NotaDelMentor> = {}): NotaDelMentor => ({
  id,
  texto,
  autor: { id: 'm-1', nombre: 'Marta Mentora' },
  creadoEn: '2026-11-12T15:30:00Z',
  corregidoEn: null,
  puedeCorregir: false,
  ...extra,
});
const crudo = (n: NotaDelMentor) => ({ ...n, puedeCorregir: n.puedeCorregir });

const guardar = jest.fn<(t: string) => Promise<boolean>>();
const corregir = jest.fn<(id: string, t: string) => Promise<boolean>>();
const hoja = (extra: Partial<React.ComponentProps<typeof HojaDeNotas>> = {}) =>
  montar(
    React.createElement(HojaDeNotas, {
      visible: true,
      alCerrar: () => undefined,
      nombre: 'Ana',
      soloLectura: false,
      notas: [],
      cargando: false,
      fallo: null,
      guardando: false,
      falloAlGuardar: null,
      onGuardar: guardar,
      onCorregir: corregir,
      ...extra,
    }),
  );
const escribir = async (r: ReactTestRenderer, texto: string) => {
  await act(async () => {
    porTipo(r, TextInput)[0].props.onChangeText(texto);
  });
};

beforeEach(() => {
  guardar.mockReset().mockResolvedValue(true);
  corregir.mockReset().mockResolvedValue(true);
  mockApiFetch.mockReset();
});

describe('el lápiz y la hoja de notas', () => {
  it('el lápiz lleva un puntito solo si hay al menos una nota', async () => { // spec 055 FR-024
    const sin = await montar(React.createElement(BotonDeNota, { nombre: 'Ana', conNotas: false, onPress: () => undefined }));
    const con = await montar(React.createElement(BotonDeNota, { nombre: 'Ana', conNotas: true, onPress: () => undefined }));
    expect(porTestID(sin, 'puntito-de-notas')).toHaveLength(0);
    expect(porTestID(con, 'puntito-de-notas')).toHaveLength(1);
    expect(altoDelToque(tocable(con, 'Notas sobre Ana'))).toBeGreaterThanOrEqual(48);
  });

  it('se abre con «Nota sobre <nombre>», la aclaración de quién la ve, el campo y las notas anteriores con fecha y autor', async () => { // spec 055 FR-027
    const r = await hoja({ notas: [nota('n2', 'Quedamos en hablar el lunes'), nota('n1', 'Primera conversación')] });
    const texto = todoElTexto(r);
    expect(texto).toContain('TITULO: Nota sobre Ana');
    expect(texto).toContain(`SUBTITULO: ${ACLARACION_DEL_MENTOR}`);
    expect(ACLARACION_DEL_MENTOR).toBe('Solo la ven tú, tu líder y Administración');
    expect(porTipo(r, TextInput)).toHaveLength(1);
    expect(texto.indexOf('Quedamos en hablar el lunes')).toBeLessThan(texto.indexOf('Primera conversación'));
    expect(texto).toMatch(/12 nov 2026, \d\d:\d\d · Marta Mentora/);
  });

  it('«Guardar nota» guarda el texto escrito y limpia el campo cuando el servidor lo confirma', async () => { // spec 055 FR-023
    const r = await hoja();
    await escribir(r, '  Hablamos de su rutina  ');
    await tocar(r, 'Guardar nota');
    expect(guardar).toHaveBeenCalledWith('  Hablamos de su rutina  ');
    expect(porTipo(r, TextInput)[0].props.value).toBe('');
  });

  it('una nota vacía o de solo espacios no se guarda y dice qué falta', async () => { // spec 055 FR-026
    const r = await hoja();
    await tocar(r, 'Guardar nota');
    expect(guardar).not.toHaveBeenCalled();
    expect(todoElTexto(r)).toContain('Escribe la nota antes de guardarla.');
    await escribir(r, '     ');
    await tocar(r, 'Guardar nota');
    expect(guardar).not.toHaveBeenCalled();
  });

  it('una nota de más de 2000 caracteres no se guarda y lo dice', async () => { // spec 055 FR-026
    const r = await hoja();
    await escribir(r, 'a'.repeat(2001));
    await tocar(r, 'Guardar nota');
    expect(guardar).not.toHaveBeenCalled();
    expect(todoElTexto(r)).toContain('La nota puede tener hasta 2000 caracteres');
  });

  it('si no se pudo guardar, el texto sigue en el campo y se dice por qué', async () => { // spec 055 FR-024
    guardar.mockResolvedValue(false);
    const r = await hoja({ falloAlGuardar: SIN_RED_AL_GUARDAR });
    await escribir(r, 'Importante');
    await tocar(r, 'Guardar nota');
    expect(porTipo(r, TextInput)[0].props.value).toBe('Importante');
    expect(todoElTexto(r)).toContain('Tu texto sigue aquí');
  });

  it('mientras se guarda, el botón no vuelve a pedir nada (un toque, un pedido)', async () => { // spec 055 FR-024
    const r = await hoja({ guardando: true });
    await escribir(r, 'Importante');
    await tocar(r, 'Guardar nota');
    expect(guardar).not.toHaveBeenCalled();
  });

  it('solo se corrigen las notas con `puedeCorregir` (las propias de hoy); las demás solo se leen', async () => { // spec 055 FR-025
    const r = await hoja({ notas: [nota('n2', 'De hoy', { puedeCorregir: true }), nota('n1', 'De ayer')] });
    expect(r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel?.startsWith('Corregir la nota'))).not.toHaveLength(0);
    await tocar(r, 'Corregir la nota');
    expect(porTipo(r, TextInput)[0].props.value).toBe('De hoy');
    expect(todoElTexto(r)).toContain('Guardar corrección');
    await escribir(r, 'De hoy, corregida');
    await tocar(r, 'Guardar corrección');
    expect(corregir).toHaveBeenCalledWith('n2', 'De hoy, corregida');
    expect(guardar).not.toHaveBeenCalled();
    /* Ninguna nota se borra: no hay ningún control para eso. */
    expect(hayTocable(r, 'Borrar') || hayTocable(r, 'Eliminar')).toBe(false);
  });

  it('el líder y Administración solo leen: sin campo, sin botón y sin corregir (aunque el servidor dijera lo contrario)', async () => { // spec 055 FR-024
    const r = await hoja({ soloLectura: true, notas: [nota('n1', 'Una nota', { puedeCorregir: true })] });
    expect(porTipo(r, TextInput)).toHaveLength(0);
    expect(hayTocable(r, 'Guardar nota')).toBe(false);
    expect(todoElTexto(r)).not.toContain('Corregir');
    expect(todoElTexto(r)).toContain('Una nota');
  });

  it('cada toque de la hoja mide al menos 48 de alto', async () => { // spec 055 FR-029
    const r = await hoja({ notas: [nota('n1', 'De hoy', { puedeCorregir: true })] });
    for (const parte of ['Guardar nota', 'Corregir la nota']) expect(altoDelToque(tocable(r, parte))).toBeGreaterThanOrEqual(48);
  });

  it('sin notas lo dice en una línea, para quien escribe y para quien solo lee', async () => { // spec 055 FR-027
    expect(todoElTexto(await hoja())).toContain('Todavía no escribiste notas sobre Ana.');
    expect(todoElTexto(await hoja({ soloLectura: true }))).toContain('Todavía no hay notas sobre Ana.');
  });
});

describe('las notas contra el servidor', () => {
  let api!: ReturnType<typeof useNotasDelAprendiz>;
  function Probador({ origen }: { origen: OrigenDeLasNotas | null }) {
    api = useNotasDelAprendiz(origen);
    return null;
  }
  const abrir = (origen: OrigenDeLasNotas | null) =>
    act(async () => {
      TestRenderer.create(React.createElement(Probador, { origen }));
    });
  const mentor: OrigenDeLasNotas = { quien: 'mentor', grupoId: 'g-1', aprendizId: 'a-1' };

  it('lee de la más nueva a la más vieja y, al guardar, la nota confirmada por el servidor entra arriba', async () => { // spec 055 FR-023
    mockApiFetch.mockResolvedValueOnce({ notas: [crudo(nota('n1', 'Vieja'))] });
    await abrir(mentor);
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/mentor/groups/g-1/learners/a-1/notas');
    mockApiFetch.mockResolvedValueOnce(crudo(nota('n2', 'Nueva', { puedeCorregir: true })));
    let salio = false;
    await act(async () => {
      salio = await api.guardar('  Nueva ');
    });
    expect(salio).toBe(true);
    expect(mockApiFetch.mock.calls[1]).toEqual(['/api/v1/mentor/groups/g-1/learners/a-1/notas', { method: 'POST', body: { texto: 'Nueva' } }]);
    expect(api.notas.map(n => n.id)).toEqual(['n2', 'n1']);
    expect(api.hayNotas).toBe(true);
  });

  it('dos toques seguidos hacen un solo pedido', async () => { // spec 055 FR-024
    mockApiFetch.mockResolvedValueOnce({ notas: [] });
    await abrir(mentor);
    let resolver!: (v: unknown) => void;
    mockApiFetch.mockImplementationOnce(() => new Promise(r => (resolver = r)));
    await act(async () => {
      void api.guardar('Una');
      void api.guardar('Una');
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2); // la lectura y UN solo guardado
    await act(async () => resolver(crudo(nota('n1', 'Una'))));
  });

  it('sin internet avisa que no se guardó y devuelve false para que el texto se conserve', async () => { // spec 055 FR-024
    mockApiFetch.mockResolvedValueOnce({ notas: [] });
    await abrir(mentor);
    mockApiFetch.mockRejectedValueOnce(new ApiError(0, 'Sin conexión'));
    let salio = true;
    await act(async () => {
      salio = await api.guardar('Texto');
    });
    expect(salio).toBe(false);
    expect(api.falloAlGuardar).toBe(SIN_RED_AL_GUARDAR);
    expect(api.notas).toEqual([]);
  });

  it('un rechazo del servidor (ya no lo acompaña, otro día) se muestra con su motivo', async () => { // spec 055 FR-028
    mockApiFetch.mockResolvedValueOnce({ notas: [crudo(nota('n1', 'Vieja', { puedeCorregir: true }))] });
    await abrir(mentor);
    mockApiFetch.mockRejectedValueOnce(new ApiError(409, 'Esta nota ya no se puede corregir: solo se corrige el día en que se escribe.', { codigo: 'YA_NO_SE_PUEDE_CORREGIR' }));
    await act(async () => {
      await api.corregir('n1', 'Cambio');
    });
    expect(api.falloAlGuardar).toContain('ya no se puede corregir');
    mockApiFetch.mockRejectedValueOnce(new ApiError(403, 'Ya no acompañas a este aprendiz.', { codigo: 'NO_ACOMPANA' }));
    await act(async () => {
      await api.guardar('Otra');
    });
    expect(api.falloAlGuardar).toContain('Ya no acompañas a este aprendiz');
  });

  it('corregir cambia la nota en su lugar con lo que confirmó el servidor', async () => { // spec 055 FR-025
    mockApiFetch.mockResolvedValueOnce({ notas: [crudo(nota('n1', 'Antes', { puedeCorregir: true }))] });
    await abrir(mentor);
    mockApiFetch.mockResolvedValueOnce(crudo(nota('n1', 'Después', { puedeCorregir: true, corregidoEn: '2026-11-12T16:00:00Z' })));
    await act(async () => {
      await api.corregir('n1', 'Después');
    });
    expect(mockApiFetch.mock.calls[1]).toEqual(['/api/v1/mentor/groups/g-1/learners/a-1/notas/n1', { method: 'PATCH', body: { texto: 'Después' } }]);
    expect(api.notas).toHaveLength(1);
    expect(api.notas[0].texto).toBe('Después');
  });

  it('el líder y Administración leen por sus puertas y nunca pueden corregir ni escribir', async () => { // spec 055 FR-024
    mockApiFetch.mockResolvedValue({ notas: [crudo(nota('n1', 'Una', { puedeCorregir: true }))] });
    await abrir({ quien: 'lider', personaId: 'p-1' });
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/leadership/people/p-1/notas');
    expect(api.notas[0].puedeCorregir).toBe(false);
    let salio = true;
    await act(async () => {
      salio = await api.guardar('No debería');
    });
    expect(salio).toBe(false);
    mockApiFetch.mockClear();
    await abrir({ quien: 'admin', aprendizId: 'a-9' });
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/admin/trainees/a-9/notas');
  });

  it('en las fichas del líder y de Administración el lápiz no se dibuja si el servidor no deja leerlas, y se dibuja si hay notas', async () => { // spec 055 FR-024
    mockApiFetch.mockRejectedValueOnce(new ApiError(403, 'No puedes ver las notas de esta persona.'));
    const sin = await montar(React.createElement(NotasDeLectura, { origen: { quien: 'lider', personaId: 'p-1' }, nombre: 'Ana' }));
    expect(hayTocable(sin, 'Notas sobre')).toBe(false);
    mockApiFetch.mockResolvedValueOnce({ notas: [crudo(nota('n1', 'Una'))] });
    const con = await montar(React.createElement(NotasDeLectura, { origen: { quien: 'admin', aprendizId: 'a-1' }, nombre: 'Ana' }));
    expect(hayTocable(con, 'Notas sobre Ana')).toBe(true);
    expect(porTestID(con, 'puntito-de-notas')).toHaveLength(1);
  });
});
