export type Palette = {
  canvas: string;
  bg: string;
  cardBg: string;
  cardBgAlt: string;
  border: string;
  borderStrong: string;
  divider: string;
  text: string;
  textStrong: string;
  textSoft: string;
  micro: string;
  gold: string;
  /* Acento dorado seguro para TEXTO e ICONOS. `gold` se mantiene para superficies
     (rellenos, barras, sombras, bordes), donde puede ser mas claro sin penalizar la
     lectura. Separarlos es lo que permite subir el contraste en claro sin apagar la marca. */
  goldInk: string;
  goldGrad: [string, string, string];
  onGold: string;
  tabInactive: string;
  ring1: string;
  ring2: string;
  ring3: string;
  /* Estado semantico. Antes eran literales repartidos por las pantallas ('#E06A66',
     '#70d2a0', '#4E9F76'...), elegidos mirando el tema oscuro y reutilizados igual en el
     claro, donde TODOS caian por debajo de AA (medido: 1.79-3.19 sobre #FDFCFA). */
  success: string;
  successWash: string;
  danger: string;
  dangerWash: string;
  /* Lavado dorado para superficies suaves; sustituye a los 'rgba(212,160,23,0.0x)' sueltos,
     que ademas usaban un dorado (#D4A017) que no esta en la paleta. */
  goldWash: string;
  chevron: string;
  placeholderA: string;
  placeholderB: string;
};

export const light: Palette = {
  canvas: '#E8E5E0',
  bg: '#FCFBF9',
  cardBg: '#FDFCFA',
  cardBgAlt: '#FFFFFF',
  border: '#E2DCD2',
  borderStrong: '#D6C9B0',
  divider: '#EDE7DC',
  text: '#1E1B18',
  textStrong: '#11100D',
  textSoft: '#4A453D',
  micro: '#856C35',
  gold: '#B2924F',
  goldInk: '#856C35',
  goldGrad: ['#D8BE85', '#C2A263', '#A8873F'],
  onGold: '#1A1509',
  tabInactive: '#736C60',
  success: '#2E7D52',
  successWash: 'rgba(46,125,82,0.10)',
  danger: '#C0392B',
  dangerWash: 'rgba(192,57,43,0.08)',
  goldWash: 'rgba(178,146,79,0.10)',
  ring1: 'rgba(178,146,79,0.10)',
  ring2: 'rgba(178,146,79,0.14)',
  ring3: 'rgba(178,146,79,0.20)',
  chevron: '#847A68',
  placeholderA: '#EFEAE1',
  placeholderB: '#F7F3EC',
};

export const dark: Palette = {
  canvas: '#0A0908',
  bg: '#0C0B09',
  cardBg: '#161513',
  cardBgAlt: '#201F1C',
  border: 'rgba(198,164,92,0.20)',
  borderStrong: 'rgba(198,164,92,0.38)',
  divider: 'rgba(255,255,255,0.08)',
  text: '#F6F4EE',
  textStrong: '#FFFFFF',
  textSoft: '#C5BEB3',
  micro: '#D4AF37',
  gold: '#C6A45C',
  goldInk: '#C6A45C',
  goldGrad: ['#E5C689', '#C09A4F', '#9C7A34'],
  onGold: '#1A1509',
  tabInactive: '#968E82',
  success: '#70D2A0',
  successWash: 'rgba(112,210,160,0.12)',
  danger: '#E06A66',
  dangerWash: 'rgba(224,106,102,0.12)',
  goldWash: 'rgba(198,164,92,0.12)',
  ring1: 'rgba(198,164,92,0.08)',
  ring2: 'rgba(198,164,92,0.14)',
  ring3: 'rgba(198,164,92,0.22)',
  chevron: '#8F8678',
  placeholderA: '#14130F',
  placeholderB: '#1B1915',
};

export const type = {
  screenTitle: { fontFamily: 'Jost_400Regular', fontSize: 22, letterSpacing: 2.5 },
  sectionTitle: { fontFamily: 'Jost_500Medium', fontSize: 12, letterSpacing: 1.8 },
  sectionSub: { fontFamily: 'Jost_400Regular', fontSize: 13, letterSpacing: 0.3 },
  micro: { fontFamily: 'Jost_500Medium', fontSize: 10, letterSpacing: 1.6 },
  cardTitle: { fontFamily: 'Jost_500Medium', fontSize: 16 },
  body: { fontFamily: 'Jost_400Regular', fontSize: 15 },
  small: { fontFamily: 'Jost_400Regular', fontSize: 13 },
  metric: { fontFamily: 'Jost_400Regular', fontSize: 26 },
  hero: { fontFamily: 'Jost_400Regular', fontSize: 34, letterSpacing: 8 },
  tab: { fontFamily: 'Jost_500Medium', fontSize: 11, letterSpacing: 0 },
};

export const space = { screenX: 24, cardPad: 17, gap: 16, radius: 16, radiusSm: 14 };