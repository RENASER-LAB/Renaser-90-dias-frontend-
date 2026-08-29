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
  border: '#E2DCD2',
  borderStrong: '#D6C9B0',
  divider: '#EDE7DC',
  text: '#1E1B18',
  textStrong: '#11100D',
  textSoft: '#4A453D',
  micro: '#8F753C',
  gold: '#B2924F',
  goldGrad: ['#D8BE85', '#B2924F', '#9C7C3C'],
  onGold: '#FFFFFF',
  tabInactive: '#8A8275',
  ring1: 'rgba(178,146,79,0.10)',
  ring2: 'rgba(178,146,79,0.14)',
  ring3: 'rgba(178,146,79,0.20)',
  chevron: '#A89E8D',
  placeholderA: '#EFEAE1',
  placeholderB: '#F7F3EC',
};

export const dark: Palette = {
  canvas: '#0A0908',
  bg: '#0C0B09',
  cardBg: 'rgba(255,255,255,0.04)',
  cardBgAlt: 'rgba(255,255,255,0.07)',
  border: 'rgba(198,164,92,0.20)',
  borderStrong: 'rgba(198,164,92,0.38)',
  divider: 'rgba(255,255,255,0.08)',
  text: '#F6F4EE',
  textStrong: '#FFFFFF',
  textSoft: '#C5BEB3',
  micro: '#D4AF37',
  gold: '#C6A45C',
  goldGrad: ['#E5C689', '#C09A4F', '#9C7A34'],
  onGold: '#1A1509',
  tabInactive: '#968E82',
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
  hero: { fontFamily: 'Jost_300Light', fontSize: 34, letterSpacing: 8 },
  tab: { fontFamily: 'Jost_500Medium', fontSize: 9.5, letterSpacing: 0.8 },
};

export const space = { screenX: 24, cardPad: 17, gap: 16, radius: 16, radiusSm: 14 };