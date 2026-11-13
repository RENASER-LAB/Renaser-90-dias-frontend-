import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/** Spec 051: la fila «WhatsApp» de Yo (Ajustes → Perfil) y la hoja que abre, vistas desde el código de la pantalla. */
const SRC = path.join(__dirname, '../..');
const yo = fs.readFileSync(path.join(SRC, 'screens/YoScreen.tsx'), 'utf-8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Yo → Ajustes → Perfil → WhatsApp', () => {
  // spec 051 FR-010
  it('la fila está en el grupo «Perfil», para todos los roles, y solo si el servidor la ofrece y el interruptor está prendido', () => {
    expect(yo).toMatch(
      /whatsappConfirmado\.estado\?\.disponible && esDisponible\(CLAVES\.cuentaWhatsapp\) \? \(\s*<FilaDeAjuste\s+icono="chat"\s+titulo=\{TEXTOS_DEL_WHATSAPP\.fila\}\s+detalle=\{detalleDelWhatsapp\(whatsappConfirmado\.estado\.confirmado\)\}\s+onPress=\{\(\) => setHojaDelWhatsapp\(true\)\}/,
    );
    const grupoPerfil = yo.slice(yo.indexOf('<GrupoDeAjustes titulo="Perfil">'), yo.indexOf('</GrupoDeAjustes>', yo.indexOf('<GrupoDeAjustes titulo="Perfil">')));
    expect(grupoPerfil).toContain('TEXTOS_DEL_WHATSAPP.fila');
    // Ninguna condición de rol: lo ven el personal y los aprendices.
    expect(grupoPerfil.slice(grupoPerfil.indexOf('TEXTOS_DEL_WHATSAPP') - 400, grupoPerfil.indexOf('TEXTOS_DEL_WHATSAPP'))).not.toMatch(/rol|isStaff|esAprendiz|capacidades/);
  });

  // spec 051 FR-011, FR-012
  it('al confirmar, Yo relee el estado del servidor', () => {
    expect(yo).toMatch(/<HojaDelWhatsapp[\s\S]*alConfirmar=\{\(\) => void whatsappConfirmado\.recargar\(\)\}/);
  });

  // spec 051 FR-011
  it('la hoja usa el gesto de volver por pasos, el control de país de la ficha y las casillas del código de siempre', () => {
    const hoja = fs.readFileSync(path.join(SRC, 'features/yo/components/HojaDelWhatsapp.tsx'), 'utf-8');
    expect(hoja).toContain('alVolver={volver}');
    expect(hoja).toContain('<PhoneCountryInput');
    expect(hoja).toContain('<CodigoOtpInput');
    expect(hoja).not.toMatch(/from 'react-native'[^;]*\bAlert\b/);
  });
});
