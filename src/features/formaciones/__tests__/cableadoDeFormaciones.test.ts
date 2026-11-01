import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/http/apiClient', () => ({ apiFetch: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from '../../../services/http/apiClient';
import { listarAprendices } from '../../admin/api/adminApi';
import { aGrupoAdmin, formacionDelGrupo } from '../../admin/hooks/useGruposAdmin';
import { llaveDeLaEleccion, useEleccionRecordada } from '../hooks/useEleccionRecordada';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const raizDelRepo = path.resolve(__dirname, '../../../..');
const fuente = (ruta: string) => fs.readFileSync(path.join(raizDelRepo, ruta), 'utf8');

describe('lo que la app recuerda de la elección', () => {
  let raiz: ReactTestRenderer | null = null;
  let valor: ReturnType<typeof useEleccionRecordada>;
  const Sonda = ({ cuenta }: { cuenta: string | null }) => {
    valor = useEleccionRecordada(cuenta);
    return null;
  };
  const montar = async (cuenta: string | null) => {
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(Sonda, { cuenta }));
    });
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
  });

  it('una cuenta que nunca eligió aquí figura como «todavía no eligió», y recordar lo guarda', async () => {
    await montar('u1');
    expect(valor.cargada).toBe(true);
    expect(valor.yaEligio).toBe(false);
    await act(async () => valor.recordar());
    expect(valor.yaEligio).toBe(true);
    expect(await AsyncStorage.getItem(llaveDeLaEleccion('u1'))).toBe('1');
  });

  it('otra vez en el mismo teléfono ya no pregunta; otra cuenta sí', async () => {
    await AsyncStorage.setItem(llaveDeLaEleccion('u1'), '1');
    await montar('u1');
    expect(valor.yaEligio).toBe(true);
    act(() => raiz?.unmount());
    await montar('u2');
    expect(valor.yaEligio).toBe(false);
  });

  it('sin cuenta no hay nada que preguntar', async () => {
    await montar(null);
    expect(valor.yaEligio).toBe(true);
  });
});

describe('Administración con el filtro «Formación»', () => {
  const pedido = apiFetch as jest.MockedFunction<typeof apiFetch>;

  it('el padrón pide al servidor solo la formación elegida (?formation=) y sin ella trae todas', async () => {
    pedido.mockResolvedValue({ content: [], total: 0, page: 0, size: 20 });
    await listarAprendices({ pagina: 0, tamano: 20, formacion: 'DIPLOMADO' });
    expect(String(pedido.mock.calls.at(-1)?.[0])).toContain('formation=DIPLOMADO');
    await listarAprendices({ pagina: 0, tamano: 20, formacion: null });
    expect(String(pedido.mock.calls.at(-1)?.[0])).not.toContain('formation');
  });

  it('un grupo sin formación dicha (backend anterior) es de la Escuela', () => {
    const base = {
      id: 'g1',
      name: 'Fénix',
      cohortId: 'c1',
      videoCallUrl: null,
      nextSessionAt: null,
      memberCount: 3,
      mentor: null,
    };
    expect(formacionDelGrupo(aGrupoAdmin(base))).toBe('ESCUELA');
    expect(formacionDelGrupo(aGrupoAdmin({ ...base, formation: 'DIPLOMADO' }))).toBe('DIPLOMADO');
  });
});

/**
 * El cableado que ninguna prueba de pantalla ve: dónde se monta cada pieza. Si alguien quita una línea, esto lo dice.
 */
describe('dónde está cada pieza de las formaciones', () => {
  it('el proveedor de la formación envuelve a toda la app, dentro de la sesión', () => {
    const app = fuente('App.tsx');
    expect(app).toContain("import { FormacionProvider } from './src/features/formaciones/context/FormacionContext'");
    expect(app.indexOf('<AuthProvider>')).toBeLessThan(app.indexOf('<FormacionProvider>'));
    expect(app.indexOf('<FormacionProvider>')).toBeLessThan(app.indexOf('<Shell />'));
  });

  it('al cambiar de formación las pestañas se arman de nuevo (la key lleva la formación activa)', () => {
    const navegador = fuente('src/navigation/RootNavigator.tsx');
    expect(navegador).toContain('<MainTabs key={llaveDeLasVistas(user?.id, formacion)} />');
    expect(navegador).toContain('<SinFormacionScreen />');
    expect(navegador).toContain('<EleccionDeFormacionScreen onElegida={eleccion.recordar} />');
  });

  it('Yo ofrece «Cambiar de formación» solo a quien puede elegir, y Hoy nombra la formación', () => {
    const yo = fuente('src/screens/YoScreen.tsx');
    expect(yo).toContain('formacionDeLaSesion?.puedeElegir');
    expect(yo).toContain('titulo="Cambiar de formación"');
    expect(yo).toContain('<SelectorDeFormacion visible={eligiendoFormacion}');
    expect(fuente('src/screens/HoyScreen.tsx')).toContain('<NombreDeLaFormacion />');
  });

  it('Administración tiene «Formaciones» en la raíz y la pila abre su detalle y las listas ya filtradas', () => {
    expect(fuente('src/features/admin/screens/AdminInicioScreen.tsx')).toContain("clave: 'formaciones', titulo: 'Formaciones'");
    const admin = fuente('src/features/admin/screens/AdminScreen.tsx');
    expect(admin).toContain("entrar({ nombre: 'formacion', codigo })");
    expect(admin).toContain("entrar({ nombre: 'personas', soloSinGrupo: false, formacion: codigo })");
    expect(admin).toContain("entrar({ nombre: 'grupos', formacion: codigo })");
  });

  it('la ficha muestra la formación y «Equipo y roles» las formaciones del personal', () => {
    expect(fuente('src/features/admin/screens/FichaAprendizScreen.tsx')).toContain('<FormacionDeLaPersona');
    const equipo = fuente('src/features/admin/screens/StaffRolesScreen.tsx');
    expect(equipo).toContain('<FormacionesDelPersonal personaId={persona.id}');
    expect(equipo).toContain("new Set(['MENTOR', 'TRAINEE_GUIDE', 'MENTOR_LEAD'])");
  });

  it('el día y las fases salen de la duración de cada persona, no de un 90 escrito', () => {
    expect(fuente('src/screens/YoScreen.tsx')).toContain('faseEnCurso(resumen?.fase, resumen?.diaPrograma, resumen?.duracionDias)');
    /* Hoy ya no cuenta «los días que quedan»: lo hacía la tarjeta del Mapa de Renacimiento, que se retiró (spec 026). Plan sí lee la duración. */
    expect(fuente('src/screens/PlanScreen.tsx')).toContain('resumen?.duracionDias');
  });

  it('ninguna pantalla de las formaciones escribe un nombre de fuente (solo los roles de fuentes.ts)', () => {
    const carpeta = path.join(raizDelRepo, 'src/features/formaciones');
    const archivos = fs
      .readdirSync(carpeta, { recursive: true })
      .map(String)
      .filter(f => /\.(ts|tsx)$/.test(f) && !f.includes('__tests__'));
    expect(archivos.length).toBeGreaterThan(10);
    for (const archivo of archivos) {
      expect(fs.readFileSync(path.join(carpeta, archivo), 'utf8')).not.toMatch(/Inter_|Jost_|Fraunces_|fontFamily:\s*['"]/);
    }
  });
});
