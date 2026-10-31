import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { anotarRutaDeAviso, consumirRutaPendiente } from '../../features/mentor/notificaciones/rutaDeAviso';
import { usePublicarSemaforoDeHoy } from '../../features/semaforo/estado/useSemaforoVigente';

/**
 * El semáforo propio pasa de Hoy a Yo (2026-10-31, pedido del dueño): en Yo, la tarjeta de Hoy tal cual ocupa el lugar del gráfico
 * «Tu cumplimiento · últimos 7 días»; en Hoy desaparece. Tocarla abre el detalle desde Yo; el aviso del sábado (`/semaforo`) sigue
 * abriéndolo (ahora por `abrirAviso`); y el fénix de Hoy sigue recibiendo el color. Las pantallas montan medio app: se lee el código sin comentarios y se
 * prueba aparte el comportamiento que importa (el color que publica Hoy).
 */
const RAIZ = path.resolve(__dirname, '..', '..');
const sinComentarios = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const leer = (r: string) => sinComentarios(fs.readFileSync(path.join(RAIZ, r), 'utf-8'));
const YO = leer('screens/YoScreen.tsx');
const HOY = leer('screens/HoyScreen.tsx');
const PANELES = leer('features/paneles-de-rol/utils/avisosDeLosPaneles.ts') + leer('features/paneles-de-rol/hooks/usePanelesDeRol.ts');

describe('Yo muestra la tarjeta del semáforo', () => {
  it('es la de Hoy, tal cual, en el lugar del gráfico, y solo si /home trae `semaforo` (y la entrada no está apagada)', () => {
    expect(YO).toMatch(/\{resumen\?\.semaforo && esDisponible\(CLAVES\.semaforo\) \? \(\s*<View style=\{\{ marginTop: 14 \}\}>\s*<TarjetaSemaforoHoy/);
    expect(YO).toMatch(/semaforo=\{resumen\.semaforo\}\s*dias=\{diasParaLaTarjeta\(resumen\.semaforo, miSemaforo\.detalle\)\}\s*onAbrir=\{\(\) => setEnSemaforo\(true\)\}/);
    // Va dentro de «Tu evolución», justo después de la tarjeta de fase.
    expect(YO.indexOf('<TarjetaDeFase')).toBeLessThan(YO.indexOf('<TarjetaSemaforoHoy'));
  });

  it('el gráfico de línea viejo no vuelve, ni con semáforo ni sin él', () => {
    expect(YO).not.toMatch(/curvaDeEvolucion|Tu cumplimiento|<Svg|<Circle/);
    expect(fs.existsSync(path.join(RAIZ, 'features/semaforo/utils/curvaDeEvolucion.ts'))).toBe(false);
  });

  it('las barras salen de `semaforo.dias` o de /me/semaforo, con las mismas reglas de siempre (sin pedidos de más)', () => {
    expect(YO).toMatch(/const miSemaforo = useMiSemaforo\(hayQuePedirMiSemaforo\(resumen\?\.semaforo, enSemaforo\)\);/);
    // Yo ya lee /home con useResumenHome: no hay otra lectura de /home.
    expect((YO.match(/useResumenHome\(\)/g) ?? []).length).toBe(1);
  });
});

describe('Hoy ya no tiene la tarjeta del semáforo', () => {
  it('ni la tarjeta, ni su detalle, ni su lectura de /me/semaforo', () => {
    for (const viejo of ['TarjetaSemaforoHoy', 'SemaforoScreen', 'useMiSemaforo', 'diasParaLaTarjeta', 'hayQuePedirMiSemaforo']) {
      expect({ viejo, esta: HOY.includes(viejo) }).toEqual({ viejo, esta: false });
    }
    // `enSemaforoGrupos` (el resumen del líder) es otra cosa y sigue.
    expect(HOY).not.toMatch(/\benSemaforo\b|\bsetEnSemaforo\b/);
  });

  it('ni el resumen por grupos del líder ni las tarjetas de rol: los paneles de rol viven en Yo (2026-10-31)', () => {
    for (const fuera of ['comoAbrirElSemaforoDelGrupo', 'quienAbreElResumenPorGrupos', 'useResumenPorGrupos', 'MiGrupoEnHoy', 'MisMentoresEnHoy', 'CumplimientoDelLiderScreen']) {
      expect({ fuera, esta: HOY.includes(fuera) }).toEqual({ fuera, esta: false });
    }
    for (const sigue of ['comoAbrirElSemaforoDelGrupo', 'quienAbreElResumenPorGrupos']) {
      expect({ sigue, esta: PANELES.includes(sigue) }).toEqual({ sigue, esta: true });
    }
  });
});

describe('el detalle se abre desde Yo', () => {
  it('a pantalla completa, con su flecha de volver y el atrás del sistema de vuelta a Yo', () => {
    expect(YO).toMatch(/if \(enSemaforo\) \{\s*return <SemaforoScreen semaforo=\{miSemaforo\} onVolver=\{\(\) => setEnSemaforo\(false\)\} onPausaCambiada=\{\(\) => void recargarResumen\(\)\} \/>;/);
    const detalle = leer('features/semaforo/screens/SemaforoScreen.tsx');
    expect(detalle).toContain('useSystemBackHandler');
    expect(detalle).toContain('onVolver');
  });

  it('el aviso del sábado `/semaforo` entra por `abrirAviso` (ya no por una escucha de Hoy) y trae a Yo con `abrirSemaforo`; Yo lo abre y lo olvida', () => {
    const abrir = leer('navigation/abrirAviso.ts');
    expect(abrir).toMatch(/case 'semaforo':\s*return \{ pestana: PESTANA\.semaforo, params: \{ abrirSemaforo: true \} \};/);
    expect(abrir).toMatch(/semaforo: 'Yo'/);
    expect(HOY).not.toMatch(/consumirRutaPendiente|alAbrirAviso/);
    expect(YO).toMatch(/abrirSemaforo\?: boolean[\s\S]{0,200}setEnSemaforo\(true\);[\s\S]{0,200}setParams\(\{ abrirSemaforo: undefined \}\)/);
  });

  it('la ruta del aviso no cambió: `/semaforo` sigue siendo una ruta pendiente de clase `semaforo`', () => {
    expect(anotarRutaDeAviso('/semaforo')).toBe(true);
    expect(consumirRutaPendiente('semaforo')).toEqual({ tipo: 'semaforo' });
    expect(consumirRutaPendiente('semaforo')).toBeNull();
  });
});

describe('el fénix de Hoy sigue recibiendo el color del semáforo', () => {
  it('Hoy publica el de /home (sin pedir /me/semaforo) y Yo publica además el del detalle', () => {
    expect(HOY).toContain('usePublicarSemaforoDeHoy(resumen?.semaforo, Boolean(resumen), null);');
    expect(YO).toContain('usePublicarSemaforoDeHoy(resumen?.semaforo, Boolean(resumen), miSemaforo.detalle);');
  });

  it('con el detalle en `null` el hook publica el color de /home cuando /home llegó, y nada antes', () => {
    const almacen = { publicar: jest.fn(), color: () => null, suscribir: () => () => undefined, reiniciar: jest.fn(), habilitar: jest.fn(), alVolverAlFrente: jest.fn(), trasCumplirUnHabito: jest.fn() };
    function Sonda({ home, cargado }: { home: { color: 'ROJO' } | null; cargado: boolean }) {
      usePublicarSemaforoDeHoy(home, cargado, null, almacen as never);
      return null;
    }
    let raiz!: ReturnType<typeof TestRenderer.create>;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    act(() => { raiz = TestRenderer.create(React.createElement(Sonda, { home: null, cargado: false })); });
    expect(almacen.publicar).not.toHaveBeenCalled();
    act(() => raiz.update(React.createElement(Sonda, { home: { color: 'ROJO' }, cargado: true })));
    expect(almacen.publicar).toHaveBeenLastCalledWith('ROJO');
    act(() => raiz.unmount());
  });
});
