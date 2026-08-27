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
  goldGrad: [string, string, string];
  onGold: string;
  tabInactive: string;
  ring1: string;
  ring2: string;
  ring3: string;
  chevron: string;
  placeholderA: string;
  placeholderB: string;
};

export const light: Palette = {
  canvas: '#E8E5E0',
  bg: '#FCFBF9',
  cardBg: '#FDFCFA',
  cardBgAlt: '#FFFFFF',
  border: '#EDE8DF',
  borderStrong: '#E2D8C4',
  divider: '#F0EBE2',
  text: '#302D28',
  textStrong: '#2F2C27',
  textSoft: '#6F685C',
  micro: '#A79E90',
  gold: '#B2924F',
  goldGrad: ['#D8BE85', '#B2924F', '#9C7C3C'],
  onGold: '#FFFFFF',
  tabInactive: '#ADA69A',
  ring1: 'rgba(178,146,79,0.10)',
  ring2: 'rgba(178,146,79,0.14)',
  ring3: 'rgba(178,146,79,0.20)',
  chevron: '#C2B9A8',
  placeholderA: '#EFEAE1',
  placeholderB: '#F7F3EC',
};

export const dark: Palette = {
  canvas: '#0A0908',
  bg: '#0C0B09',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBgAlt: 'rgba(255,255,255,0.05)',
  border: 'rgba(198,164,92,0.14)',
  borderStrong: 'rgba(198,164,92,0.30)',
  divider: 'rgba(255,255,255,0.05)',
  text: '#F0ECE4',
  textStrong: '#F2EEE6',
  textSoft: '#9D968B',
  micro: '#A8845A',
  gold: '#C6A45C',
  goldGrad: ['#E5C689', '#C09A4F', '#9C7A34'],
  onGold: '#1A1509',
  tabInactive: '#736C62',
  ring1: 'rgba(198,164,92,0.07)',
  ring2: 'rgba(198,164,92,0.12)',
  ring3: 'rgba(198,164,92,0.18)',
  chevron: '#6E675C',
  placeholderA: '#14130F',
  placeholderB: '#1B1915',
};

export const type = {
  screenTitle: { fontFamily: 'Jost_300Light', fontSize: 21, letterSpacing: 3.2 },
  sectionTitle: { fontFamily: 'Jost_400Regular', fontSize: 11, letterSpacing: 2.2 },
  sectionSub: { fontFamily: 'Jost_300Light', fontSize: 12, letterSpacing: 0.4 },
  micro: { fontFamily: 'Jost_400Regular', fontSize: 8.5, letterSpacing: 2.2 },
  cardTitle: { fontFamily: 'Jost_400Regular', fontSize: 15 },
  body: { fontFamily: 'Jost_300Light', fontSize: 14 },
  small: { fontFamily: 'Jost_300Light', fontSize: 11.5 },
  metric: { fontFamily: 'Jost_300Light', fontSize: 24 },
  hero: { fontFamily: 'Jost_200ExtraLight', fontSize: 34, letterSpacing: 10 },
  tab: { fontFamily: 'Jost_400Regular', fontSize: 8, letterSpacing: 1.1 },
};

export const space = { screenX: 24, cardPad: 17, gap: 16, radius: 16, radiusSm: 14 };