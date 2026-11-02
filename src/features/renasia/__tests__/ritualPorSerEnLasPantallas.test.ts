/**
 * Spec 038: un ritual que pide SER (el panel del chat y la hoja del orbe de Hoy) abre el registro por TEXTO de Training y no la cámara. Se vigila el
 * cableado en el código fuente, como las otras pruebas de pantallas: cada pantalla decide «¿se escribe?» ANTES de iniciar el registro con foto y
 * monta la misma hoja que Training (`RegistroDeRitualConTexto`) dentro de su propio contenedor.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

const leer = (...partes: string[]) => readFileSync(join(__dirname, '..', '..', '..', ...partes), 'utf8');

describe.each([
  ['el panel de SER', 'features/renasia/screens/RenasiaPanel.tsx', 'registroConFoto.iniciar(solicitudDelPedido(pedido))'],
  ['la hoja del orbe de Hoy', 'screens/HoyScreen.tsx', 'registroConFoto.iniciar(solicitudDelPedido(pedido))'],
])('%s', (_nombre, archivo, iniciaLaFoto) => {
  const fuente = leer(...archivo.split('/'));

  it('decide si el pedido se escribe ANTES de abrir la cámara, y abre la hoja del ritual', () => {
    const dondeSeDecide = fuente.indexOf('seRegistraEscribiendoElPedido(pedido)');
    expect(dondeSeDecide).toBeGreaterThan(-1);
    expect(dondeSeDecide).toBeLessThan(fuente.indexOf(iniciaLaFoto));
    expect(fuente).toContain('ritual.abrir(pedido)');
  });

  it('monta la MISMA hoja de Training, con las props del hook', () => {
    expect(fuente).toContain('<RegistroDeRitualConTexto {...ritual.modal} />');
    expect(fuente).toContain("training/components/RegistroDeRitualConTexto'");
  });

  it('al registrarse marca la tarjeta como registrada «de ritual» (sin foto)', () => {
    expect(fuente).toContain("cambioAlRegistrar('habito', true)");
  });
});

describe('la hoja del orbe', () => {
  it('muestra el lápiz y «Escribir cómo me siento» para un ritual', () => {
    const fuente = leer('features', 'renasia', 'components', 'AccionDelAcompanante.tsx');
    expect(fuente).toContain('seRegistraEscribiendoElPedido(pedido)');
    expect(fuente).toContain("seEscribe ? 'pencil' : 'camera'");
    expect(fuente).toContain('ETIQUETA_DEL_BOTON_DEL_RITUAL');
  });
});
