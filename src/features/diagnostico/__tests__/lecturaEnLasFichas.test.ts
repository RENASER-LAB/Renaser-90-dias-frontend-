import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * «Diagnóstico inicial» montado en las tres fichas de quien acompaña (spec 026, FR-011): la del mentor o la guía, la del líder y
 * la de Administración. Montar las pantallas enteras exige medio programa, así que esta prueba lee el código: la sección está
 * y pide su lectura por la puerta de cada rol. Lo que hace la sección (no dibujar nada con 403/404/ficha estándar, etc.) está
 * probado en `seccionDelDiagnosticoDeLaPersona.test.ts`.
 */

const raiz = join(__dirname, '..', '..');
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8');

describe('la sección del diagnóstico en las fichas', () => {
  it('el mentor (AlumnoScreen) la lee por su puerta, solo si tiene grupo', () => {
    const f = leer('mentor/screens/AlumnoScreen.tsx');
    expect(f).toContain('<SeccionDelDiagnosticoDeLaPersona cargar={cargarDiagnostico} />');
    expect(f).toContain('lecturaParaElMentor(grupoId, alumno.participanteId)');
    expect(f).toMatch(/grupoId \? \(\) => lecturaParaElMentor/);
  });

  it('el líder (PersonaDelLiderScreen) la lee por la puerta del grupo o, sin grupo / desde «Todos», por la de la persona', () => {
    const f = leer('lider-mentores/screens/PersonaDelLiderScreen.tsx');
    expect(f).toContain('<SeccionDelDiagnosticoDeLaPersona cargar={cargarDiagnostico} />');
    expect(f).toContain('lecturaParaElLider(grupoDeRuta, personaId)');
  });

  it('Administración (FichaAprendizScreen) la lee por la persona, con o sin grupo', () => {
    const f = leer('admin/screens/FichaAprendizScreen.tsx');
    expect(f).toContain('<SeccionDelDiagnosticoDeLaPersona cargar={cargarDiagnostico} />');
    expect(f).toContain('lecturaParaAdministracion(aprendiz.id)');
  });

  it('va debajo de lo último que muestra cada ficha (los cierres del día)', () => {
    for (const ruta of ['mentor/screens/AlumnoScreen.tsx', 'lider-mentores/screens/PersonaDelLiderScreen.tsx', 'admin/screens/FichaAprendizScreen.tsx']) {
      const f = leer(ruta);
      expect(f.indexOf('<CierresDelDia')).toBeGreaterThan(-1);
      expect(f.indexOf('<SeccionDelDiagnosticoDeLaPersona')).toBeGreaterThan(f.indexOf('<CierresDelDia'));
    }
  });

  it('la lectura es de solo lectura: ninguna pantalla del diagnóstico de otros escribe al servidor', () => {
    const api = leer('diagnostico/api/diagnosticoLecturaApi.ts');
    expect(api).not.toMatch(/method:\s*'(POST|PUT|PATCH|DELETE)'/);
    const seccion = leer('diagnostico/components/SeccionDelDiagnosticoDeLaPersona.tsx');
    expect(seccion).not.toMatch(/TextInput|onChangeText|FormField/);
  });
});
