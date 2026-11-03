import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Pedido del dueño (03/11): «En perfil, en Yo, configuración, quitas biografía, y en editar perfil jalas los datos del número de WhatsApp que puso;
 * agregas ese campo más.»
 *
 * Se lee el código sin los comentarios: el que cuenta lo que había antes puede nombrar la biografía; lo que no puede es volver a pedirse o a
 * mandarse.
 */
const SRC = path.resolve(__dirname, '..', '..');
const leer = (relativa: string) =>
  fs
    .readFileSync(path.join(SRC, relativa), 'utf-8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('Yo → Ajustes → Perfil sin biografía', () => {
  const yo = leer('screens/YoScreen.tsx');

  it('ya no se pide ni se muestra la biografía', () => {
    expect(yo).not.toMatch(/iografía/);
    expect(yo).not.toContain('profileBio');
    expect(yo).not.toMatch(/\bbio\b/);
  });

  it('Editar perfil no la manda al servidor', () => {
    const llamadas = yo.match(/actualizarPerfil\(\{[^}]*\}\)/g) ?? [];
    expect(llamadas.length).toBeGreaterThan(0);
    for (const llamada of llamadas) expect(llamada).not.toMatch(/\bbio\b/);
    expect(leer('features/auth/api/authApi.ts')).not.toMatch(/\bbio\b/);
  });

  it('el usuario de la app ya no lleva la biografía', () => {
    for (const archivo of ['features/auth/types/auth.types.ts', 'features/auth/api/usuarioMapper.ts', 'features/auth/api/authSchemas.ts']) {
      expect(leer(archivo)).not.toMatch(/\bbio\b/);
    }
  });
});

/** Lo que dibuja y hace la vista «Editar perfil»: de su comienzo a la vista que sigue (El Método). */
const vistaEditarPerfil = (codigo: string) =>
  codigo.slice(codigo.indexOf("activeView === 'editar_perfil' &&"), codigo.indexOf("activeView === 'metodo' &&"));

describe('Editar perfil con el WhatsApp de la ficha', () => {
  const yo = leer('screens/YoScreen.tsx');

  it('Editar perfil monta el campo, que lee al abrir esa vista', () => {
    expect(yo).toContain("useWhatsappDelPerfil(activeView === 'editar_perfil'");
    expect(yo).toContain('<CampoWhatsappDelPerfil');
  });

  it('el campo está en Editar perfil', () => {
    expect(vistaEditarPerfil(yo)).toContain('<CampoWhatsappDelPerfil');
  });

  it('antes de guardar nada se revisa el número, y vaciarlo no se guarda', () => {
    const editar = vistaEditarPerfil(yo);
    expect(editar.indexOf('whatsapp.decidir()')).toBeGreaterThan(-1);
    expect(editar.indexOf('whatsapp.decidir()')).toBeLessThan(editar.indexOf('guardarElPerfil('));
    expect(editar).toContain("decisionWhatsapp.tipo === 'rechazar'");
  });

  it('el campo usa el mismo control de la ficha y la misma pregunta de la ficha', () => {
    expect(leer('features/yo/components/CampoWhatsappDelPerfil.tsx')).toContain('<PhoneCountryInput');
    expect(leer('features/onboarding/components/ChapterIdentidad.tsx')).toContain('<PhoneCountryInput');
    const api = leer('features/yo/api/whatsappDelPerfilApi.ts');
    expect(api).toContain("obtenerRespuestas('ficha_inicial')");
    expect(api).toContain('PREGUNTA_WHATSAPP');
    expect(api).toContain('guardarRespuesta(');
    // Una sola fuente del número: ningún pedido propio de teléfono en el perfil de usuario.
    const authApi = leer('features/auth/api/authApi.ts');
    const perfil = authApi.slice(authApi.indexOf('export type DatosActualizarPerfil'), authApi.indexOf('export async function solicitarUrlAvatar'));
    expect(perfil).toContain("'/api/v1/users/me'");
    expect(perfil).not.toMatch(/phone|telefono|whatsapp/i);
  });

  it('la regla del número es la misma función de la ficha', () => {
    expect(leer('features/yo/utils/whatsappDelPerfil.ts')).toContain('validarWhatsapp');
    expect(leer('features/onboarding/data/pasosFicha.ts')).toMatch(/case 'whatsapp':\s*return validarWhatsapp\(/);
  });
});

describe('la fila «Información» se quitó y el departamento pasó a Editar perfil (03/11)', () => {
  const yo = leer('screens/YoScreen.tsx');

  it('ya no hay fila «Información» ni su sub-vista, ni lo que solo ella usaba', () => {
    for (const viejo of ["'info_perfil'", 'titulo="Información"', 'Guardar información', 'Información guardada']) {
      expect(yo).not.toContain(viejo);
    }
    expect(leer('features/yo/utils/navegacionDeYo.ts')).not.toContain('info_perfil');
  });

  it('Ajustes → Perfil tiene una sola fila, «Editar perfil», que dice lo que se edita ahí', () => {
    const grupo = yo.slice(yo.indexOf('<GrupoDeAjustes titulo="Perfil">'), yo.indexOf('</GrupoDeAjustes>', yo.indexOf('<GrupoDeAjustes titulo="Perfil">')));
    expect(grupo.match(/<FilaDeAjuste/g)).toHaveLength(1);
    expect(grupo).toContain('titulo="Editar perfil"');
    expect(grupo).toContain('detalle="Nombre, foto, WhatsApp y departamento"');
  });

  it('«Departamento o área» está en Editar perfil, debajo del WhatsApp, y se guarda con el mismo botón', () => {
    const editar = vistaEditarPerfil(yo);
    expect(editar).toContain('Departamento o área');
    expect(editar.indexOf('Departamento o área')).toBeGreaterThan(editar.indexOf('<CampoWhatsappDelPerfil'));
    expect(editar).toContain('onChangeText={setProfileDepartment}');
    expect(editar).toMatch(/guardarPerfil: \(\) => actualizarPerfil\(\{[^}]*department: profileDepartment/);
    // Un solo «Guardar cambios» en la pantalla.
    expect(editar.match(/<GoldButton/g)).toHaveLength(1);
  });
});
