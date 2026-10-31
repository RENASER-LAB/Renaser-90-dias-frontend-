/**
 * Plan → Objetivos espera al Mapa de Renacimiento (issue #37, 2026-10-27, decisión del dueño: «Bloqueemos objetivos
 * diciendo desde el inicio que debe hacer el Mapa»). La pantalla monta medio app (navegación, contextos, red), así que
 * acá se lee el código fuente sin comentarios y se comprueba QUÉ dibuja y desde dónde decide; la decisión y el aviso se
 * prueban aparte (`puertaDeObjetivos`, `usePuertaDeObjetivos`, `PuertaDelMapa`).
 *
 * Contra el código anterior falla: Objetivos ofrecía «Editar», el mes, la semana y las acciones sin mirar el Mapa.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const leer = (relativo: string) => fs.readFileSync(path.join(RAIZ, relativo), 'utf-8');

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const PLAN = sinComentarios(leer('screens/PlanScreen.tsx'));
const HOY = sinComentarios(leer('screens/HoyScreen.tsx'));

describe('Plan → Objetivos: decide con la puerta del Mapa', () => {
  it('lee el estado del Mapa de esta cuenta, y se vuelve a leer al abrir Objetivos o al volver del Mapa', () => {
    expect(PLAN).toMatch(/const \{ abrir: abrirMapa, abierto: mapaAbierto \} = useMapaRenacimientoAbierto\(\);/);
    expect(PLAN).toMatch(
      /const \{ puerta, reintentar: reintentarPuerta \} = usePuertaDeObjetivos\(\s*user\?\.id \?\? null,\s*`\$\{mapaAbierto\}:\$\{activeSubView\}`,?\s*\);/,
    );
  });

  it('con la puerta cerrada, Objetivos dibuja el aviso y no el selector de eje, el objetivo, el mes ni la semana', () => {
    // Una sola rama: `puerta !== 'abierta'` → aviso; si no, todo lo de siempre, en el mismo ScrollView.
    const inicio = PLAN.indexOf("{puerta !== 'abierta' ? (");
    const separador = PLAN.indexOf(') : (', inicio);
    expect(inicio).toBeGreaterThan(0);
    expect(separador).toBeGreaterThan(inicio);
    const aviso = PLAN.slice(inicio, separador);
    const objetivos = PLAN.slice(separador, PLAN.indexOf('<HojaDesdeAbajo', separador));
    expect(aviso).toMatch(/<PuertaDelMapa puerta=\{puerta\} onHacerMapa=\{abrirMapa\} onReintentar=\{reintentarPuerta\} \/>/);
    for (const editable of ['<ControlSegmentado', 'openEditGoalModal', '<NivelesDelPlan', 'setEditandoMes(true)', 'Tu objetivo de 90 días']) {
      expect({ editable, enElAviso: aviso.includes(editable) }).toEqual({ editable, enElAviso: false });
      expect({ editable, enLosObjetivos: objetivos.includes(editable) }).toEqual({ editable, enLosObjetivos: true });
    }
    // El volver y el título «Objetivos» quedan fuera de la rama: se ven con la puerta cerrada.
    expect(PLAN.indexOf('accessibilityLabel="Volver a Plan"')).toBeLessThan(PLAN.indexOf("{puerta !== 'abierta' ? ("));
  });

  it('sigue habiendo un solo scroll en Objetivos y el volver sigue siendo el de siempre', () => {
    const desde = PLAN.indexOf("{activeSubView === 'objetivos' && (");
    const vista = PLAN.slice(desde, PLAN.indexOf('<HojaDesdeAbajo', desde));
    expect((vista.match(/<ScrollView/g) ?? []).length).toBe(1);
    expect(vista).toMatch(/accessibilityLabel="Volver a Plan"/);
  });

  it('el aviso de «Toca cada una para escribir tu objetivo» solo con la puerta abierta; sin Mapa dice de dónde salen', () => {
    expect(PLAN).toMatch(/puerta === 'abierta' && \(\s*<Text[^>]*>\s*Toca cada una para escribir tu objetivo\./);
    expect(PLAN).toMatch(/puerta === 'espera-al-mapa' && \(\s*<Text[^>]*>\s*Tus objetivos nacen de tu Mapa de Renacimiento\./);
  });

  it('un rechazo `MAPA_PENDIENTE` muestra el mensaje del servidor y ofrece «Hacer mi Mapa»; los demás, como siempre', () => {
    expect(PLAN).toMatch(/const avisarGuardadoFallido = \(resultado: \{ mensaje: string; mapaPendiente: boolean \}\) =>/);
    expect(PLAN).toMatch(/Alert\.alert\('Primero tu Mapa de Renacimiento', resultado\.mensaje, \[/);
    expect(PLAN).toMatch(/text: 'Hacer mi Mapa',\s*onPress: \(\) => \{\s*setEditGoalModalVisible\(false\);\s*abrirMapa\(\);/);
    expect(PLAN).toMatch(/Alert\.alert\('No se pudo guardar', resultado\.mensaje\);/);
    // Los dos guardados (objetivo nuevo y avance) pasan por el mismo aviso.
    expect((PLAN.match(/avisarGuardadoFallido\(resultado\);/g) ?? []).length).toBe(2);
  });
});

describe('Hoy: lo dice desde el inicio, solo con texto', () => {
  it('la tarjeta del Mapa dice que de ahí nacen los objetivos', () => {
    expect(HOY).toContain('`Tu plan para ${lapsoDelMapa} empieza aquí: de este Mapa nacen tus objetivos. 15–20 min.`');
  });

  it('la tarjeta de acciones no manda a definirlo en Plan si el Mapa no está activo: dice que nace del Mapa y abre el Mapa', () => {
    // Desde el 2026-10-31 la tarjeta es `TarjetaAccionDeHoy` y qué muestra lo decide `vistaDeLaAccionDeHoy` (probada aparte).
    const TARJETA = sinComentarios(leer('features/home/components/TarjetaAccionDeHoy.tsx'));
    expect(TARJETA).toContain("titulo = 'Tu objetivo de 90 días nace de tu Mapa de Renacimiento.';");
    expect(TARJETA).toContain("texto: 'Hacer mi Mapa'");
    expect(HOY).not.toContain('Define tu objetivo en Plan para sostener la dirección.');
    expect(HOY).toMatch(/alHacerElMapa=\{abrirMapa\}/);
  });

  it('el Mapa sigue opcional en Hoy: la tarjeta no se vuelve obligatoria ni tapa nada', () => {
    expect(HOY).toContain('const MAPA_DIA7_HABILITADO = mapaHabilitado();');
    expect(HOY).toMatch(/const mostrarMapa = MAPA_DIA7_HABILITADO && !!user;/);
    expect(HOY).toMatch(/<Presionable onPress=\{abrirMapa\}/);
  });
});

describe('La regla de si el Mapa está encendido es una sola', () => {
  it('Hoy y Plan la leen de `mapaHabilitado`, y nadie más la copia', () => {
    const archivos = [
      'screens/PlanScreen.tsx',
      'features/objetivos/hooks/usePuertaDeObjetivos.ts',
      'features/mapa-renacimiento/utils/mapaHabilitado.ts',
    ];
    const conLaVariable = archivos.filter(a => sinComentarios(leer(a)).includes('EXPO_PUBLIC_MAPA_DIA7'));
    expect(conLaVariable).toEqual(['features/mapa-renacimiento/utils/mapaHabilitado.ts']);
    expect(HOY).not.toContain('EXPO_PUBLIC_MAPA_DIA7');
  });
});
