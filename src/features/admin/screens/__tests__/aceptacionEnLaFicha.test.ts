import { describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { aceptacionDeSolicitudSchema, detalleAprendizSchema, solicitudSchema } from '../../api/adminSchemas';
import { AceptacionDeLaPersona } from '../../components/AceptacionDeLaPersona';
import { textoDeLaAceptada } from '../../utils/aceptarSolicitud';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ACEPTACION = {
  formations: ['DIPLOMADO'],
  durationDays: 365,
  role: 'TRAINEE',
  customRoleId: 'r-1',
  customRoleName: 'Aprendiz becado',
  withDiagnosis: true,
};

const textos = (r: TestRenderer.ReactTestRenderer) => r.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''));

/**
 * Spec 025, US4 escenario 1: la ficha de la persona en Administración dice lo que se decidió al aceptarla, con las mismas palabras que la lista de
 * «Aceptadas»: las dos usan `textoDeLaAceptada`.
 */
describe('la ficha dice cómo entró la persona', () => {
  it('el servidor manda la misma forma en la lista y en la ficha, y la app la lee igual', () => {
    const enLaLista = solicitudSchema.parse({ id: 's-1', fullName: 'Ana', email: 'a@r.pe', status: 'APPROVED', reviewedByName: 'Luis', reviewedAt: '2026-10-31T15:00:00Z', acceptance: ACEPTACION });
    const enLaFicha = detalleAprendizSchema.parse({ id: 'u-1', programDay: 0, acceptance: ACEPTACION, acceptedByName: 'Luis', acceptedAt: '2026-10-31T15:00:00Z' });

    expect(enLaFicha.acceptance).toEqual(enLaLista.acceptance);
    expect(textoDeLaAceptada(enLaFicha.acceptedByName, enLaFicha.acceptedAt, enLaFicha.acceptance)).toEqual(
      textoDeLaAceptada(enLaLista.reviewedByName, enLaLista.reviewedAt, enLaLista.acceptance),
    );
  });

  it('un backend anterior o una forma rara no tumban la ficha: sin aceptación no hay sección', () => {
    expect(detalleAprendizSchema.parse({ id: 'u-1', programDay: 3 }).acceptance).toBeUndefined();
    expect(detalleAprendizSchema.parse({ id: 'u-1', programDay: 3, acceptance: 'raro' }).acceptance).toBeNull();
    expect(aceptacionDeSolicitudSchema.parse({ formations: ['ESCUELA'], customRoleName: 5 }).customRoleName).toBeNull();
  });

  it('dibuja quién la aceptó, cuándo, y la formación, la duración, el rol personalizado y el diagnóstico', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(React.createElement(AceptacionDeLaPersona, { aceptacion: ACEPTACION, aceptadaPor: 'Luis', aceptadaEn: '2026-10-31T15:00:00Z' }));
    });
    expect(textos(r)).toEqual(['Cómo entró', 'Aceptada por Luis el 31 de octubre', 'Diplomado 1 año · Aprendiz becado (Aprendiz) · con diagnóstico']);
  });

  it('sin aceptación no dibuja nada', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(React.createElement(AceptacionDeLaPersona, { aceptacion: null, aceptadaPor: null, aceptadaEn: null }));
    });
    expect(r.toJSON()).toBeNull();
  });

  it('la lista y la ficha usan la misma función, y la ficha monta la sección', () => {
    const leer = (...ruta: string[]) => readFileSync(join(__dirname, '..', '..', ...ruta), 'utf8');
    expect(leer('screens', 'SolicitudesAdminScreen.tsx')).toMatch(/return textoDeLaAceptada\(solicitud\.reviewedByName, solicitud\.reviewedAt, solicitud\.acceptance\);/);
    expect(leer('components', 'AceptacionDeLaPersona.tsx')).toMatch(/textoDeLaAceptada\(aceptadaPor, aceptadaEn, aceptacion\)/);
    expect(leer('screens', 'FichaAprendizScreen.tsx')).toMatch(
      /<AceptacionDeLaPersona\s+aceptacion=\{programa\.detalle\?\.acceptance\}\s+aceptadaPor=\{programa\.detalle\?\.acceptedByName\}\s+aceptadaEn=\{programa\.detalle\?\.acceptedAt\}/,
    );
  });
});
