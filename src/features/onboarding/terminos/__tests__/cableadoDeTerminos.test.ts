import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const raiz = path.resolve(__dirname, '../../../../..');
const fuente = (ruta: string) => fs.readFileSync(path.join(raiz, ruta), 'utf8');

/** El cableado de los términos editables (spec 027): lo que ninguna prueba de lógica pura ve si alguien lo desconecta. */
describe('los términos editables están conectados', () => {
  it('la pantalla que bloquea se monta en la navegación raíz y deja cerrar sesión', () => {
    const navegador = fuente('src/navigation/RootNavigator.tsx');
    expect(navegador).toContain('useTerminosAlAbrir(');
    expect(navegador).toContain('debeAceptarAntesDeEntrar(terminos.terminos)');
    expect(navegador).toContain('<TerminosActualizadosScreen');
    expect(navegador).toContain('alCerrarSesion={logout}');
    // y la app de siempre sigue armándose igual cuando no hay nada que aceptar
    expect(navegador).toContain('<MainTabs key={llaveDeLasVistas(user?.id, formacion)} />');
  });

  it('la pantalla de Términos del onboarding usa el texto del servidor, con el de la app de respaldo, y manda la versión que leyó', () => {
    const pantalla = fuente('src/features/onboarding/screens/TerminosScreen.tsx');
    expect(pantalla).toContain('useMisTerminos()');
    expect(pantalla).toContain('TERMINOS_DE_LA_APP');
    expect(pantalla).toContain('versionId');
    expect(pantalla).toContain('<ContenidoDeLosTerminos');
    expect(fuente('src/features/onboarding/terminos/hooks/useSellarTerminos.ts')).toContain('aceptarTerminos(datos.versionId)');
  });

  it('la constancia no se ignora si falla: aceptarTerminos devuelve el desenlace y quien llama no avanza', () => {
    const hook = fuente('src/features/onboarding/hooks/usePersistenciaOnboarding.ts');
    expect(hook).toContain('const aceptarTerminos = useCallback');
    expect(hook).toContain("esConflicto) return { ok: false, cambiaron: true }");
  });

  it('Administración: Más opciones y el centro de Formaciones llevan a los términos, y la ficha de la persona muestra su constancia', () => {
    const admin = fuente('src/features/admin/screens/AdminScreen.tsx');
    expect(admin).toContain("nombre: 'terminos'");
    expect(admin).toContain('<EditorDeTerminosScreen');
    expect(admin).toContain('onAbrirTerminos=');
    expect(admin).toContain('onVerTerminos=');
    expect(fuente('src/features/admin/screens/MasOpcionesScreen.tsx')).toContain("titulo: 'Términos y condiciones'");
    expect(fuente('src/features/formaciones/screens/FormacionDetalleAdminScreen.tsx')).toContain('Ficha y términos');
    expect(fuente('src/features/admin/screens/FichaAprendizScreen.tsx')).toContain('<ConstanciaDeTerminos personaId={aprendiz.id} />');
  });

  it('la hoja «Aceptar» de la 025 apaga la formación sin términos publicados', () => {
    const hoja = fuente('src/features/admin/components/AceptarSolicitudSheet.tsx');
    expect(hoja).toContain('formacion.termsPublished === false');
    expect(hoja).toContain('Todavía no tiene términos publicados.');
  });
});
