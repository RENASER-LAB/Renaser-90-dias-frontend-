/**
 * Spec 056 FR-033 (T058): el formulario de un evento NUEVO puede abrir con la audiencia ya elegida (`audienciaPrevia`): la hoja «Programar sesión» de la ficha de
 * un mentor lo abre con ese mentor. Sin la prop, el formulario es el de siempre. Se monta de verdad; la red y lo pesado son dobles.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, logro: () => undefined, error: () => undefined } }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: () => undefined } }));
jest.mock('../../../habits/components/HoraPickerModal', () => ({ HoraPickerModal: () => null }));
jest.mock('../../../academy/components/CursoPortada', () => ({ CursoPortada: () => null }));
jest.mock('../../utils/portadaDelEvento', () => ({ elegirPortada: async () => null }));
jest.mock('../audiencia/ElegirPersonasHoja', () => ({ ElegirPersonasHoja: () => null }));
jest.mock('../../hooks/useDisponibilidadDeMeet', () => ({ useDisponibilidadDeMeet: () => ({ sabido: true, disponibilidad: { disponible: true, motivo: null } }) }));
jest.mock('../../hooks/useVistaPreviaDeAudiencia', () => ({ useVistaPreviaDeAudiencia: () => ({ total: 1, contando: false, fallo: false }) }));

import { SIN_OPCIONES } from '../../api/audienciaSchemas';
import type { OpcionesDeAudiencia } from '../../types/audiencia.types';
import type { AudienciaDelFormulario } from '../../utils/audienciaDelFormulario';
import { formularioVacio } from '../../utils/formularioDeEvento';
import { FormularioDelEvento } from '../FormularioDelEvento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const AHORA = Date.parse('2026-11-18T15:00:00Z');
const montadas: ReactTestRenderer[] = [];
afterEach(() => {
  for (const r of montadas.splice(0)) act(() => r.unmount());
});

const delLider: OpcionesDeAudiencia = { ...SIN_OPCIONES, puedeCrear: true, partes: ['PERSON', 'GROUP', 'MENTORS'], tiposDeEvento: ['SESION_PERSONALIZADA'], todos: false };
const MENTOR = { id: 'm-1', nombre: 'E2E Mentor', fotoUrl: null, rol: 'Mentor', grupo: null };

function montar(extra: object = {}, onGuardar = jest.fn()): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(FormularioDelEvento, {
        inicial: formularioVacio(AHORA, 'America/Lima'),
        original: null,
        error: null,
        guardando: false,
        onVolver: () => undefined,
        onGuardar,
        opciones: delLider,
        ...extra,
      }),
    );
  });
  montadas.push(r);
  return r;
}

const propio = (n: ReactTestInstance) =>
  React.Children.toArray(n.props.children as React.ReactNode)
    .filter(x => typeof x === 'string' || typeof x === 'number')
    .join('');
const textos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'Text').map(propio);
const crear = (r: ReactTestRenderer) => r.root.findAll(n => n.props.accessibilityLabel === 'Crear evento' && typeof n.props.onPress === 'function')[0];

describe('FormularioDelEvento con audienciaPrevia', () => {
  it('abre con la persona ya elegida y se la entrega al guardar, sin «Todos»', () => { // spec 056 FR-033
    const alGuardar = jest.fn();
    const r = montar({ audienciaPrevia: { personas: [MENTOR] } }, alGuardar);
    act(() => crear(r).props.onPress());
    expect(alGuardar).toHaveBeenCalledTimes(1);
    const audiencia = alGuardar.mock.calls[0][2] as AudienciaDelFormulario;
    expect(audiencia.personas.map(p => p.id)).toEqual(['m-1']);
    expect(audiencia.todos).toBe(false);
    expect(audiencia.mentores).toBe(false);
  });

  it('el título automático de la sesión nombra al mentor elegido', () => { // spec 056 FR-033
    const r = montar({ audienciaPrevia: { personas: [MENTOR] } });
    expect(textos(r).join(' | ')).toContain('E2E Mentor');
  });

  it('puede abrir con «todos los mentores» elegido en lugar de una persona', () => { // spec 056 FR-033
    const alGuardar = jest.fn();
    const r = montar({ audienciaPrevia: { mentores: true } }, alGuardar);
    act(() => crear(r).props.onPress());
    const audiencia = alGuardar.mock.calls[0][2] as AudienciaDelFormulario;
    expect(audiencia.mentores).toBe(true);
    expect(audiencia.personas).toEqual([]);
  });

  it('sin la prop el formulario es el de siempre: sin nadie elegido', () => { // spec 056 FR-033
    const alGuardar = jest.fn();
    const r = montar({}, alGuardar);
    act(() => crear(r).props.onPress());
    const audiencia = alGuardar.mock.calls[0][2] as AudienciaDelFormulario;
    expect(audiencia.personas).toEqual([]);
    expect(audiencia.mentores).toBe(false);
  });

  it('sin cabecera no dibuja «Volver sin guardar» ni «Nuevo evento»; con ella, sí', () => { // spec 056 FR-033
    expect(textos(montar({ sinCabecera: true })).join(' | ')).not.toMatch(/Volver sin guardar|Nuevo evento/);
    expect(textos(montar()).join(' | ')).toContain('Nuevo evento');
  });
});
