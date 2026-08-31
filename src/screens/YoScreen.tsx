import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useAuth } from '../context/AuthContext';
import { Card, MicroLabel, ScreenHeader } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

const EVOLUCION = [
  [6, 66], [38, 58], [70, 62], [102, 46], [134, 50],
  [166, 34], [198, 38], [230, 24], [262, 26], [294, 12], [314, 8],
];

export default function YoScreen() {
  const { c, t, mode, toggle } = useTheme();
  const { rs, isTablet } = useResponsive();
  const { user, fichaData, logout, restartOnboarding } = useAuth();

  const [fichaExpanded, setFichaExpanded] = useState(true);
  const [firmasExpanded, setFirmasExpanded] = useState(false);

  const evoPath = 'M' + EVOLUCION.map(p => p[0] + ' ' + p[1]).join(' L');

  const STATS = [
    { k: 'DISCIPLINA', v: '87' },
    { k: 'ENFOQUE', v: '92' },
    { k: 'ENERGÍA', v: '81' },
    { k: 'CONSISTENCIA', v: '94' },
  ];

  const handleVerFichaCompleta = () => {
    Alert.alert(
      'Ficha Inicial Registrada',
      'Tus datos de Identidad, Salud y Consentimiento están encriptados y sincronizados con tu mentor.'
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="YO" right="dots" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: isTablet ? 600 : undefined,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header de Perfil del Guerrero */}
        <View style={[styles.profileHeroCard, { backgroundColor: c.cardBg, borderColor: c.borderStrong }]}>
          <View style={[styles.profileAvatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <Icon name="spark" size={28} color={c.gold} />
          </View>

          <View style={styles.profileInfoBlock}>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 19, textAlign: 'center' }]}>
              {user?.name || 'Sebastián Arango'}
            </Text>
            <Text style={[t.micro, { color: c.textSoft, fontSize: 12, marginTop: 2, textAlign: 'center' }]}>
              {user?.email || 'sebastian@renaser.com'}
            </Text>

            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <View style={[styles.rankBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <Icon name="award" size={13} color={c.gold} />
                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                  GUERRERO FÉNIX · NIVEL 3
                </Text>
              </View>

              <View style={[styles.rankBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                <Icon name="fire" size={13} color={c.gold} />
                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                  RACHA: 37 DÍAS
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: FICHA SOMÁTICA Y DE IDENTIDAD GUARDADA                         */}
        {/* ========================================================================= */}
        <Card style={{ gap: 12 }}>
          <Pressable
            onPress={() => setFichaExpanded(!fichaExpanded)}
            style={styles.accordionHeaderRow}
          >
            <View style={{ flex: 1 }}>
              <MicroLabel>DATOS FUNDACIONALES</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 2 }]}>
                Ficha Somática y de Identidad
              </Text>
            </View>
            <Icon name={fichaExpanded ? 'chevron' : 'chevron'} size={14} color={c.chevron} />
          </Pressable>

          {fichaExpanded && (
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 10 }}>
              <View style={styles.dataGridRow}>
                <View style={[styles.dataBlock, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                  <Text style={[t.micro, { color: c.gold, fontSize: 10 }]}>UBICACIÓN</Text>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 13, fontWeight: '600', marginTop: 2 }]}>
                    {fichaData?.identidad.pais || 'Perú'} · {fichaData?.identidad.ciudad || 'Arequipa'}
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 1 }]}>
                    {fichaData?.identidad.distrito || 'Cayma'}
                  </Text>
                </View>

                <View style={[styles.dataBlock, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                  <Text style={[t.micro, { color: c.gold, fontSize: 10 }]}>WHATSAPP & DOC</Text>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 13, fontWeight: '600', marginTop: 2 }]}>
                    {fichaData?.identidad.whatsapp || '+51 954 123 456'}
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 1 }]}>
                    Doc: {fichaData?.identidad.numeroDocumento || '48291038'}
                  </Text>
                </View>
              </View>

              <View style={styles.dataGridRow}>
                <View style={[styles.dataBlock, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                  <Text style={[t.micro, { color: c.gold, fontSize: 10 }]}>SUEÑO PROMEDIO</Text>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 13, fontWeight: '600', marginTop: 2 }]}>
                    {fichaData?.salud.horasSueno || '7.5'} Horas/día
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 1 }]}>
                    Calidad: {fichaData?.salud.calidadSueno || 8}/10
                  </Text>
                </View>

                <View style={[styles.dataBlock, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
                  <Text style={[t.micro, { color: c.gold, fontSize: 10 }]}>MEDICACIÓN REGULAR</Text>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 13, fontWeight: '600', marginTop: 2 }]}>
                    {fichaData?.salud.tomaMedicacionRegular ? 'Sí, declarada' : 'No toma medicación'}
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 1 }]}>
                    {fichaData?.salud.tomaMedicacionRegular ? fichaData.salud.especificacionMedicacion : 'Sin contraindicaciones'}
                  </Text>
                </View>
              </View>

              <GoldButton
                label="VER RESUMEN COMPLETO"
                onPress={handleVerFichaCompleta}
                variant="outline"
                style={{ marginTop: 4 }}
              />
            </View>
          )}
        </Card>

        {/* ========================================================================= */}
        {/* SECCIÓN 2: VISOR DE FIRMAS DIGITALES SOLEMNES                             */}
        {/* ========================================================================= */}
        <Card style={{ gap: 12 }}>
          <Pressable
            onPress={() => setFirmasExpanded(!firmasExpanded)}
            style={styles.accordionHeaderRow}
          >
            <View style={{ flex: 1 }}>
              <MicroLabel>PACTOS Y CONTRATOS</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 2 }]}>
                Firmas Solemnes Registradas
              </Text>
            </View>
            <Icon name="doc" size={16} color={c.gold} />
          </Pressable>

          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 10 }}>
            {/* Firma 1: Términos y Condiciones */}
            <View style={[styles.firmaStatusCard, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
              <View style={[styles.firmaIconCircle, { borderColor: c.gold }]}>
                <Icon name="check" size={12} color={c.gold} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 13.5, fontWeight: '600' }]}>
                  Términos y Condiciones (22 Cláusulas)
                </Text>
                <Text style={[t.micro, { color: c.gold, fontSize: 10.5, marginTop: 1 }]}>
                  ✓ Firma Digital 1 Registrada y Sellada
                </Text>
              </View>
            </View>

            {/* Firma 2: Código I de Renaser: VERDAD */}
            <View style={[styles.firmaStatusCard, { backgroundColor: c.cardBgAlt, borderColor: c.gold }]}>
              <View style={[styles.firmaIconCircle, { borderColor: c.gold, backgroundColor: c.gold }]}>
                <Icon name="check" size={12} color="#1E1B18" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 13.5, fontWeight: '700' }]}>
                  Código I de Renaser: VERDAD
                </Text>
                <Text style={[t.micro, { color: c.gold, fontSize: 10.5, marginTop: 1 }]}>
                  ✓ Firma Digital 2 Solemne "SER VERDAD"
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* SECCIÓN 3: ESTADÍSTICAS Y EVOLUCIÓN A 90 DÍAS                            */}
        {/* ========================================================================= */}
        <Card style={{ gap: 12 }}>
          <View style={styles.cardHeaderRow}>
            <View>
              <MicroLabel>MÉTRICAS DE RENDIMIENTO</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 2 }]}>
                Consistencia & Disciplina
              </Text>
            </View>
            <Icon name="spark" size={16} color={c.gold} />
          </View>

          {/* Svg Evolution Chart */}
          <Svg width="100%" height={74} viewBox="0 0 320 74" style={{ marginVertical: 6 }}>
            <Path d={evoPath} stroke={c.gold} strokeWidth={1.8} strokeLinecap="round" fill="none" />
            {EVOLUCION.map(([x, y]) => (
              <Circle key={x} cx={x} cy={y} r={3} fill="#FFFFFF" stroke={c.gold} strokeWidth={1.5} />
            ))}
          </Svg>

          {/* 4 Stats Grid */}
          <View style={styles.statsGridRow}>
            {STATS.map(s => (
              <View
                key={s.k}
                style={[styles.statBox, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
              >
                <Text style={[t.micro, { color: c.textSoft, fontSize: 8.5 }]}>{s.k}</Text>
                <Text style={{ fontFamily: 'Jost_700Bold', fontSize: 20, color: c.textStrong, marginTop: 4 }}>
                  {s.v}<Text style={{ fontSize: 11, color: c.gold }}>%</Text>
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* SECCIÓN 4: AJUSTES Y CONFIGURACIÓN                                       */}
        {/* ========================================================================= */}
        <Card style={{ gap: 10 }}>
          <MicroLabel>CONFIGURACIÓN DE CUENTA</MicroLabel>

          {/* Toggle Modo Oscuro / Claro */}
          <Pressable
            onPress={toggle}
            style={[styles.settingRow, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
          >
            <View style={[styles.settingIconBadge, { borderColor: c.borderStrong }]}>
              <Icon name={mode === 'light' ? 'moon' : 'sun'} size={15} color={c.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.body, { color: c.textStrong, fontSize: 13.5, fontWeight: '600' }]}>
                Tema Visual
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                Modo actual: {mode === 'light' ? 'Claro' : 'Oscuro'}
              </Text>
            </View>
            <Icon name="chevron" size={12} color={c.chevron} />
          </Pressable>

          {/* Botón de Reiniciar / Probar Onboarding */}
          <Pressable
            onPress={restartOnboarding}
            style={[styles.settingRow, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
          >
            <View style={[styles.settingIconBadge, { borderColor: c.gold }]}>
              <Icon name="doc" size={15} color={c.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.body, { color: c.gold, fontSize: 13.5, fontWeight: '700' }]}>
                Probar / Reiniciar Onboarding
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                Volver a vivir el flujo completo de 3 fases y firmas
              </Text>
            </View>
            <Icon name="arrow" size={12} color={c.gold} />
          </Pressable>

          {/* Botón Cerrar Sesión */}
          <Pressable
            onPress={logout}
            style={[styles.settingRow, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
          >
            <View style={[styles.settingIconBadge, { borderColor: c.borderStrong }]}>
              <Icon name="logout" size={15} color="#E06A66" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.body, { color: '#E06A66', fontSize: 13.5, fontWeight: '600' }]}>
                Cerrar Sesión
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                Desconectar este dispositivo de tu cuenta
              </Text>
            </View>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 16,
  },
  profileHeroCard: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfoBlock: {
    alignItems: 'center',
    width: '100%',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  accordionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dataBlock: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  firmaStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  firmaIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  settingIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});