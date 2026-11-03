import { describe, expect, it } from '@jest/globals';

import { MAXIMO_CARACTERES } from '../../config/configRadar';
import {
  huboDictado,
  marcarDictado,
  marcasDelBorrador,
  soltarCamposVacios,
  sumarDictado,
  textoMientrasDicta,
  type RespuestasDelRadar,
} from '../dictadoDelRadar';

/**
 * Las reglas puras del dictado del Código Renaser (spec 030): lo dictado se suma, no se pasa de 2 000 y el registro solo
 * dice «dictado» si algo dictado sigue en el texto.
 */

const vacias: RespuestasDelRadar = { whatAmIDoing: '', whatAmIThinking: '', whatAmIFeeling: '', whatAmIAvoiding: '' };

describe('sumarDictado', () => {
  it('lo dictado se suma al final de lo escrito y no lo borra (escenario 2)', () => {
    expect(sumarDictado('Estoy en casa,', 'viendo el correo')).toBe('Estoy en casa, viendo el correo');
  });

  it('sin nada escrito queda solo lo dictado, sin espacios de sobra', () => {
    expect(sumarDictado('', '  me siento tranquila ')).toBe('me siento tranquila');
  });

  it('un dictado vacío no cambia lo escrito', () => {
    expect(sumarDictado('lo que escribí', '   ')).toBe('lo que escribí');
  });

  it('se corta en los mismos 2 000 caracteres que el servidor (escenario 5)', () => {
    const casiLleno = 'a'.repeat(MAXIMO_CARACTERES - 5);
    const resultado = sumarDictado(casiLleno, 'palabras que no caben');
    expect(resultado).toHaveLength(MAXIMO_CARACTERES);
    expect(resultado.startsWith(casiLleno)).toBe(true);
  });

  it('un campo lleno no recibe nada más', () => {
    const lleno = 'a'.repeat(MAXIMO_CARACTERES);
    expect(sumarDictado(lleno, 'más')).toBe(lleno);
  });
});

describe('textoMientrasDicta', () => {
  it('mientras habla, el campo muestra lo escrito más lo que el reconocedor va entendiendo', () => {
    expect(textoMientrasDicta('Hola', 'ya estoy')).toBe('Hola ya estoy');
  });

  it('sin nada entendido todavía, el campo es lo escrito', () => {
    expect(textoMientrasDicta('Hola', '')).toBe('Hola');
  });
});

describe('las respuestas dictadas', () => {
  it('marcar un campo no repite', () => {
    expect(marcarDictado(marcarDictado([], 'whatAmIFeeling'), 'whatAmIFeeling')).toEqual(['whatAmIFeeling']);
    expect(marcarDictado(['whatAmIFeeling'], 'whatAmIDoing')).toEqual(['whatAmIFeeling', 'whatAmIDoing']);
  });

  it('un campo que la persona dejó vacío ya no cuenta como dictado; corregir una palabra, sí', () => {
    const marcas = ['whatAmIFeeling', 'whatAmIDoing'] as const;
    expect(soltarCamposVacios(marcas, { ...vacias, whatAmIDoing: 'algo', whatAmIFeeling: '   ' })).toEqual(['whatAmIDoing']);
    expect(soltarCamposVacios(marcas, { ...vacias, whatAmIDoing: 'algo', whatAmIFeeling: 'otra cosa' })).toBe(marcas);
  });

  it('el registro dice «dictado» solo si algún texto dictado sigue ahí', () => {
    expect(huboDictado([], { ...vacias, whatAmIDoing: 'escrito' })).toBe(false);
    expect(huboDictado(['whatAmIDoing'], { ...vacias, whatAmIDoing: 'dictado' })).toBe(true);
    expect(huboDictado(['whatAmIDoing'], { ...vacias, whatAmIDoing: '  ' })).toBe(false);
  });
});

describe('marcasDelBorrador', () => {
  const campos = ['whatAmIDoing', 'whatAmIThinking', 'whatAmIFeeling', 'whatAmIAvoiding'] as const;

  it('un borrador anterior, sin marcas, se lee como ninguna', () => {
    expect(marcasDelBorrador(undefined, campos)).toEqual([]);
    expect(marcasDelBorrador('basura', campos)).toEqual([]);
  });

  it('solo vuelven campos que existen, sin repetir', () => {
    expect(marcasDelBorrador(['whatAmIFeeling', 'inventado', 'whatAmIFeeling'], campos)).toEqual(['whatAmIFeeling']);
  });
});
