import { describe, expect, it } from '@jest/globals';
import { tituloDeAvisos } from '../tituloDeAvisos';

describe('título de los avisos del mentor', () => {
  it('con varios grupos aclara que son de todos', () => {
    expect(tituloDeAvisos(18, true)).toBe('18 avisos de todos tus grupos');
  });
  it('con un grupo queda como antes', () => {
    expect(tituloDeAvisos(1, false)).toBe('1 aviso');
    expect(tituloDeAvisos(3, false)).toBe('3 avisos');
  });
});
