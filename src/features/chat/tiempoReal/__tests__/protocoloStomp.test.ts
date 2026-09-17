import { describe, expect, it } from '@jest/globals';

import { FIN_DE_TRAMA, armarTrama, leerTramas } from '../protocoloStomp';

/**
 * Las tres formas conocidas de romper un cliente STOMP escrito a mano:
 *
 * 1. tratar cada `onmessage` del WebSocket como una trama entera (se pierden mensajes cuando
 *    llegan dos juntos, y se corrompen cuando llega uno partido);
 * 2. confundir un latido con una trama vacía;
 * 3. cortar las cabeceras por el primer `:` sin desescapar.
 *
 * Cada una tiene su prueba acá.
 */
describe('protocolo STOMP', () => {
  describe('armarTrama', () => {
    it('arma CONNECT con sus cabeceras y cierra con NUL', () => {
      const trama = armarTrama('CONNECT', { 'accept-version': '1.2', 'heart-beat': '10000,10000' });

      expect(trama).toBe('CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n\n\u0000');
      expect(trama.endsWith(FIN_DE_TRAMA)).toBe(true);
    });

    it('escapa los dos puntos del destino para que no partan la cabecera', () => {
      const trama = armarTrama('SUBSCRIBE', { destination: 'a:b' });

      expect(trama).toContain('destination:a\\cb');
    });

    it('una trama sin cabeceras ni cuerpo sigue siendo válida', () => {
      expect(armarTrama('DISCONNECT')).toBe('DISCONNECT\n\n\u0000');
    });
  });

  describe('leerTramas', () => {
    it('lee una trama con cuerpo', () => {
      const entrada = 'MESSAGE\ndestination:/topic/x\nsubscription:sub-0\n\n{"a":1}\u0000';

      const { tramas, resto } = leerTramas(entrada);

      expect(resto).toBe('');
      expect(tramas).toHaveLength(1);
      expect(tramas[0].comando).toBe('MESSAGE');
      expect(tramas[0].cabeceras.destination).toBe('/topic/x');
      expect(tramas[0].cuerpo).toBe('{"a":1}');
    });

    it('lee DOS tramas que llegaron pegadas en el mismo evento', () => {
      const entrada =
        'MESSAGE\ndestination:/topic/x\n\n{"n":1}\u0000' +
        'MESSAGE\ndestination:/topic/x\n\n{"n":2}\u0000';

      const { tramas, resto } = leerTramas(entrada);

      expect(tramas.map(t => t.cuerpo)).toEqual(['{"n":1}', '{"n":2}']);
      expect(resto).toBe('');
    });

    it('devuelve como resto la trama partida a la mitad, y la completa en la vuelta siguiente', () => {
      const completa = 'MESSAGE\ndestination:/topic/x\n\n{"texto":"hola"}\u0000';
      const corte = 20;

      const primera = leerTramas(completa.slice(0, corte));
      expect(primera.tramas).toHaveLength(0);
      expect(primera.resto).toBe(completa.slice(0, corte));

      const segunda = leerTramas(primera.resto + completa.slice(corte));
      expect(segunda.tramas).toHaveLength(1);
      expect(segunda.tramas[0].cuerpo).toBe('{"texto":"hola"}');
      expect(segunda.resto).toBe('');
    });

    it('descarta los latidos que viajan pegados delante de una trama', () => {
      const entrada = '\n\n\nMESSAGE\ndestination:/topic/x\n\nhola\u0000';

      const { tramas } = leerTramas(entrada);

      expect(tramas).toHaveLength(1);
      expect(tramas[0].comando).toBe('MESSAGE');
    });

    it('un latido suelto no produce ninguna trama', () => {
      expect(leerTramas('\n').tramas).toHaveLength(0);
      expect(leerTramas('\n\u0000').tramas).toHaveLength(0);
    });

    it('desescapa las cabeceras en vez de cortarlas por el primer dos puntos', () => {
      const entrada = 'MESSAGE\nclave:a\\cb\n\ncuerpo\u0000';

      const { tramas } = leerTramas(entrada);

      expect(tramas[0].cabeceras.clave).toBe('a:b');
    });

    it('un cuerpo con dos puntos y llaves no se rompe', () => {
      const cuerpo = '{"event":"PRESENCE","userId":"abc","online":true}';
      const entrada = `MESSAGE\ndestination:/topic/x\n\n${cuerpo}\u0000`;

      expect(leerTramas(entrada).tramas[0].cuerpo).toBe(cuerpo);
    });

    it('una trama sin cuerpo se lee con cuerpo vacío', () => {
      const { tramas } = leerTramas('CONNECTED\nversion:1.2\n\n\u0000');

      expect(tramas[0].comando).toBe('CONNECTED');
      expect(tramas[0].cabeceras.version).toBe('1.2');
      expect(tramas[0].cuerpo).toBe('');
    });

    it('lo que se arma se puede volver a leer', () => {
      const cuerpo = JSON.stringify({ event: 'MESSAGE', text: 'con: dos puntos y \\ barra' });
      const armada = armarTrama('SEND', { destination: '/app/x', 'content-type': 'application/json' }, cuerpo);

      const { tramas } = leerTramas(armada);

      expect(tramas[0].comando).toBe('SEND');
      expect(tramas[0].cabeceras.destination).toBe('/app/x');
      expect(tramas[0].cuerpo).toBe(cuerpo);
    });
  });
});
