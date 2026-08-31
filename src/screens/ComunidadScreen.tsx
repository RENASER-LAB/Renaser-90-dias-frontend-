import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Card, MicroLabel, ScreenHeader } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

interface PostEvidencia {
  id: string;
  author: string;
  time: string;
  category: 'FUERZA' | 'DEEP WORK' | 'GONG' | 'HÁBITO';
  text: string;
  fireCount: number;
  trophyCount: number;
  cheerCount: number;
  userReacted: { fire?: boolean; trophy?: boolean; cheer?: boolean };
}

export default function ComunidadScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet } = useResponsive();

  const [activeTab, setActiveTab] = useState<'celula' | 'muro' | 'ranking'>('muro');
  const [modalPublicarVisible, setModalPublicarVisible] = useState(false);

  // New post form state
  const [newPostCategory, setNewPostCategory] = useState<'FUERZA' | 'DEEP WORK' | 'GONG' | 'HÁBITO'>('FUERZA');
  const [newPostText, setNewPostText] = useState('');

  // Feed posts
  const [posts, setPosts] = useState<PostEvidencia[]>([
    {
      id: '1',
      author: 'Carlos Mendoza',
      time: 'Hace 25 min',
      category: 'FUERZA',
      text: 'Día 37 sellado: 45 min de entrenamiento somático + 30 respiraciones de poder. La fatiga intentó negociar, pero la verdad sostuvo el horario.',
      fireCount: 24,
      trophyCount: 16,
      cheerCount: 12,
      userReacted: { fire: true },
    },
    {
      id: '2',
      author: 'Elena Ramos',
      time: 'Hace 1 hora',
      category: 'DEEP WORK',
      text: 'Bloque de poder de 90 min sin teléfono. Cerré la nueva propuesta comercial para 3 clientes clave. Lo que se programa con verdad, se cumple.',
      fireCount: 19,
      trophyCount: 22,
      cheerCount: 8,
      userReacted: { trophy: true },
    },
    {
      id: '3',
      author: 'Mauricio Silva',
      time: 'Hace 3 horas',
      category: 'GONG',
      text: '¡Gong sonado con el alba! Día 29 ininterrumpido. Agradecido con mi célula por la exigencia implacable de cada día.',
      fireCount: 31,
      trophyCount: 14,
      cheerCount: 18,
      userReacted: {},
    },
  ]);

  const handleToggleReaction = (postId: string, type: 'fire' | 'trophy' | 'cheer') => {
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        const currentActive = post.userReacted[type];
        const delta = currentActive ? -1 : 1;
        return {
          ...post,
          [`${type}Count`]: (post as any)[`${type}Count`] + delta,
          userReacted: {
            ...post.userReacted,
            [type]: !currentActive,
          },
        };
      })
    );
  };

  const handlePublishPost = () => {
    if (!newPostText.trim()) {
      Alert.alert('Texto requerido', 'Por favor escribe tu reflexión o evidencia de victoria.');
      return;
    }
    const newEntry: PostEvidencia = {
      id: Date.now().toString(),
      author: 'Tú (Guerrero Renaser)',
      time: 'Hace un momento',
      category: newPostCategory,
      text: newPostText.trim(),
      fireCount: 1,
      trophyCount: 1,
      cheerCount: 0,
      userReacted: { fire: true },
    };
    setPosts([newEntry, ...posts]);
    setNewPostText('');
    setModalPublicarVisible(false);
    Alert.alert('¡Evidencia Publicada! 🦅', 'Tu victoria de verdad ya inspira a toda la tribu.');
  };

  const COMPANEROS_CELULA = [
    { name: 'Carlos Mendoza', racha: 37, today: '✓ Cumplido', icon: 'fire' as const },
    { name: 'Elena Ramos', racha: 35, today: '✓ Cumplido', icon: 'fire' as const },
    { name: 'Sofía Paredes', racha: 37, today: '✓ Cumplido', icon: 'fire' as const },
    { name: 'Mauricio Silva', racha: 29, today: '⏳ En proceso', icon: 'clock' as const },
  ];

  const RANKING_CELULAS = [
    { rank: '01', name: 'Célula Fénix Alpha', score: '98.5%', racha: '37 Días', badge: '🥇' },
    { rank: '02', name: 'Célula Esparta Verdad', score: '96.2%', racha: '35 Días', badge: '🥈' },
    { rank: '03', name: 'Célula Guerreros de Luz', score: '94.8%', racha: '32 Días', badge: '🥉' },
    { rank: '04', name: 'Célula Vanguardia 90', score: '92.1%', racha: '28 Días', badge: '🦅' },
    { rank: '05', name: 'Célula Renacer Titanes', score: '90.4%', racha: '26 Días', badge: '⚡' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="COMUNIDAD" right="info" />

      {/* Main Tabs Selector */}
      <View style={[styles.tabBarWrap, { backgroundColor: c.cardBg, borderColor: c.border }]}>
        {[
          { id: 'muro', label: 'MURO DE VERDAD' },
          { id: 'celula', label: 'MI CÉLULA' },
          { id: 'ranking', label: 'RANKING' },
        ].map(tTab => (
          <Pressable
            key={tTab.id}
            onPress={() => setActiveTab(tTab.id as any)}
            style={[
              styles.tabBarBtn,
              activeTab === tTab.id && [styles.tabBarBtnActive, { backgroundColor: c.cardBgAlt, borderColor: c.gold }],
            ]}
          >
            <Text
              style={[
                t.micro,
                {
                  color: activeTab === tTab.id ? c.gold : c.textSoft,
                  fontWeight: activeTab === tTab.id ? '700' : '500',
                  fontSize: 11,
                },
              ]}
            >
              {tTab.label}
            </Text>
          </Pressable>
        ))}
      </View>

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
        {/* ========================================================================= */}
        {/* PESTAÑA 1: MURO DE VERDAD (FEED SOCIAL)                                  */}
        {/* ========================================================================= */}
        {activeTab === 'muro' && (
          <View style={{ gap: 14 }}>
            {/* Quick Share Banner Button */}
            <Pressable
              onPress={() => setModalPublicarVisible(true)}
              style={[styles.shareBanner, { backgroundColor: c.cardBgAlt, borderColor: c.gold }]}
            >
              <View style={[styles.shareAvatar, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
                <Icon name="spark" size={16} color={c.gold} />
              </View>
              <Text style={[t.body, { color: c.textSoft, flex: 1, fontSize: 13.5 }]}>
                ¿Cuál fue tu victoria de verdad hoy?...
              </Text>
              <View style={[styles.plusIconBadge, { backgroundColor: c.gold }]}>
                <Icon name="plus" size={13} color="#1E1B18" strokeWidth={2} />
              </View>
            </Pressable>

            {/* Posts List */}
            {posts.map(post => (
              <Card key={post.id} style={{ gap: 12 }}>
                {/* Header */}
                <View style={styles.postHeaderRow}>
                  <View style={[styles.postAuthorAvatar, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                    <Icon name="user" size={16} color={c.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14.5 }]}>
                      {post.author}
                    </Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                      {post.time}
                    </Text>
                  </View>
                  <View style={[styles.postCategoryBadge, { borderColor: c.borderStrong }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                      {post.category}
                    </Text>
                  </View>
                </View>

                {/* Body Text */}
                <Text style={[t.body, { color: c.text, fontSize: 14, lineHeight: 21 }]}>
                  {post.text}
                </Text>

                {/* Reactions Action Bar */}
                <View style={[styles.reactionsBar, { borderTopColor: c.divider }]}>
                  <Pressable
                    onPress={() => handleToggleReaction(post.id, 'fire')}
                    style={[
                      styles.reactionBtn,
                      {
                        borderColor: post.userReacted.fire ? c.gold : c.border,
                        backgroundColor: post.userReacted.fire ? c.cardBgAlt : 'transparent',
                      },
                    ]}
                  >
                    <Icon name="fire" size={14} color={post.userReacted.fire ? c.gold : c.textSoft} />
                    <Text style={[t.micro, { color: post.userReacted.fire ? c.gold : c.textSoft, fontWeight: '700' }]}>
                      {post.fireCount}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleToggleReaction(post.id, 'trophy')}
                    style={[
                      styles.reactionBtn,
                      {
                        borderColor: post.userReacted.trophy ? c.gold : c.border,
                        backgroundColor: post.userReacted.trophy ? c.cardBgAlt : 'transparent',
                      },
                    ]}
                  >
                    <Icon name="trophy" size={14} color={post.userReacted.trophy ? c.gold : c.textSoft} />
                    <Text style={[t.micro, { color: post.userReacted.trophy ? c.gold : c.textSoft, fontWeight: '700' }]}>
                      {post.trophyCount}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleToggleReaction(post.id, 'cheer')}
                    style={[
                      styles.reactionBtn,
                      {
                        borderColor: post.userReacted.cheer ? c.gold : c.border,
                        backgroundColor: post.userReacted.cheer ? c.cardBgAlt : 'transparent',
                      },
                    ]}
                  >
                    <Icon name="award" size={14} color={post.userReacted.cheer ? c.gold : c.textSoft} />
                    <Text style={[t.micro, { color: post.userReacted.cheer ? c.gold : c.textSoft, fontWeight: '700' }]}>
                      {post.cheerCount}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => Alert.alert('Comentarios', 'Zona de retroalimentación de la Célula.')}
                    style={[styles.reactionBtn, { borderColor: c.border }]}
                  >
                    <Icon name="chat" size={14} color={c.textSoft} />
                    <Text style={[t.micro, { color: c.textSoft, fontWeight: '600' }]}>Comentar</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: MI CÉLULA DE VERDAD                                           */}
        {/* ========================================================================= */}
        {activeTab === 'celula' && (
          <View style={{ gap: 14 }}>
            {/* Mentor Card */}
            <Card style={{ gap: 12 }}>
              <MicroLabel>MENTOR ASIGNADO</MicroLabel>
              <View style={styles.mentorRow}>
                <View style={[styles.mentorAvatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                  <Icon name="user" size={24} color={c.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16 }]}>
                    Sebastián Arango
                  </Text>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                    Mentor de Alto Rendimiento Renaser
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, fontStyle: 'italic', marginTop: 4, lineHeight: 17 }]}>
                    "Semana 6: Sostén tu palabra en cada bloque. La verdad te libera del personaje."
                  </Text>
                </View>
              </View>

              <GoldButton
                label="CONTACTAR A MI MENTOR (WHATSAPP)"
                onPress={() => Alert.alert('WhatsApp Mentor', 'Abriendo canal directo con Sebastián Arango.')}
                icon="arrow"
                style={{ marginTop: 4 }}
              />
            </Card>

            {/* Guerreros de la Célula */}
            <Card style={{ gap: 12 }}>
              <MicroLabel>GUERREROS DE TU CÉLULA (5 MIEMBROS)</MicroLabel>
              <View style={{ gap: 8 }}>
                {COMPANEROS_CELULA.map(comp => (
                  <View
                    key={comp.name}
                    style={[styles.celulaGuerreroRow, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                  >
                    <View style={[styles.guerreroAvatar, { borderColor: c.borderStrong }]}>
                      <Icon name="user" size={15} color={c.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.body, { color: c.textStrong, fontSize: 13.5, fontWeight: '600' }]}>
                        {comp.name}
                      </Text>
                      <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                        Racha: {comp.racha} Días Imparable 🔥
                      </Text>
                    </View>
                    <View style={[styles.guerreroStatusBadge, { borderColor: c.borderStrong }]}>
                      <Text style={[t.micro, { color: '#4E9F76', fontWeight: '700', fontSize: 10.5 }]}>
                        {comp.today}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: RANKING DE HONOR                                              */}
        {/* ========================================================================= */}
        {activeTab === 'ranking' && (
          <Card style={{ gap: 14 }}>
            <MicroLabel>TABLA DE HONOR · SEMANA 6</MicroLabel>
            <Text style={[t.cardTitle, { color: c.textStrong }]}>
              Las Células Más Disciplinadas
            </Text>

            <View style={{ gap: 8 }}>
              {RANKING_CELULAS.map(item => (
                <View
                  key={item.rank}
                  style={[styles.rankingRow, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                >
                  <Text style={{ fontSize: 20 }}>{item.badge}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '600' }]}>
                      {item.name}
                    </Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                      Racha colectiva: {item.racha}
                    </Text>
                  </View>
                  <View style={[styles.scoreBadge, { borderColor: c.gold }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 12 }]}>
                      {item.score}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL PARA PUBLICAR EVIDENCIA DE VERDAD                                   */}
      {/* ========================================================================= */}
      <Modal
        visible={modalPublicarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalPublicarVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.cardBg, borderColor: c.gold }]}>
            <View style={styles.modalHeader}>
              <MicroLabel>REGISTRO DE EVIDENCIA</MicroLabel>
              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18, marginTop: 2 }]}>
                Sella Tu Victoria de Hoy
              </Text>
            </View>

            {/* Categoría Selector */}
            <View style={styles.pubCategoryRow}>
              {(['FUERZA', 'DEEP WORK', 'GONG', 'HÁBITO'] as const).map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => setNewPostCategory(cat)}
                  style={[
                    styles.pubCatBtn,
                    {
                      borderColor: newPostCategory === cat ? c.gold : c.border,
                      backgroundColor: newPostCategory === cat ? c.cardBgAlt : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      t.micro,
                      {
                        color: newPostCategory === cat ? c.gold : c.textSoft,
                        fontWeight: newPostCategory === cat ? '700' : '500',
                        fontSize: 10,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Textarea */}
            <View style={[styles.pubTextareaWrap, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <TextInput
                value={newPostText}
                onChangeText={setNewPostText}
                placeholder="Escribe lo que cumpliste hoy con verdad... (ej. Completé 45 min de fuerza y 90 min de ventas sin distracciones)"
                placeholderTextColor={c.tabInactive}
                multiline
                numberOfLines={4}
                style={[styles.pubTextarea, { color: c.textStrong }]}
              />
            </View>

            <GoldButton
              label="✓ PUBLICAR EVIDENCIA EN EL MURO"
              onPress={handlePublishPost}
              style={{ marginTop: 6 }}
            />

            <Pressable
              onPress={() => setModalPublicarVisible(false)}
              style={[styles.closeModalBtn, { borderColor: c.border }]}
            >
              <Text style={[t.micro, { color: c.textSoft, fontWeight: '700', fontSize: 11, textAlign: 'center' }]}>
                CANCELAR
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 16,
  },
  tabBarWrap: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  tabBarBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabBarBtnActive: {
    borderWidth: 1.5,
  },
  shareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  shareAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCategoryBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reactionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mentorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celulaGuerreroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  guerreroAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guerreroStatusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  scoreBadge: {
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    alignItems: 'center',
  },
  pubCategoryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pubCatBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pubTextareaWrap: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    minHeight: 100,
  },
  pubTextarea: {
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  closeModalBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
});