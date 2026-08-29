import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { MicroLabel } from './ui';
import { GoldButton } from './GoldButton';

interface DatePickerFieldProps {
  label: string;
  value: string; // "DD/MM/AAAA"
  onChange: (val: string) => void;
  helperText?: string;
  error?: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => String(currentYear - 14 - i)); // 14 to 94 years old

export function DatePickerField({
  label,
  value,
  onChange,
  helperText,
  error,
}: DatePickerFieldProps) {
  const { c, t } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse existing value or default to 15/06/1995
  const parts = value ? value.split('/') : [];
  const [selectedDay, setSelectedDay] = useState(parts[0] || '15');
  const [selectedMonth, setSelectedMonth] = useState(parts[1] ? String(parseInt(parts[1], 10)) : '6');
  const [selectedYear, setSelectedYear] = useState(parts[2] || '1995');

  const handleOpen = () => {
    if (value && value.includes('/')) {
      const p = value.split('/');
      if (p.length === 3) {
        setSelectedDay(p[0]);
        setSelectedMonth(String(parseInt(p[1], 10)));
        setSelectedYear(p[2]);
      }
    }
    setModalVisible(true);
  };

  const handleConfirm = () => {
    const formattedMonth = String(selectedMonth).padStart(2, '0');
    const formattedDay = String(selectedDay).padStart(2, '0');
    onChange(`${formattedDay}/${formattedMonth}/${selectedYear}`);
    setModalVisible(false);
  };

  const monthName = MONTHS[parseInt(selectedMonth, 10) - 1] || 'Mes';
  const displayLabel = value ? `${value} (${selectedDay} de ${monthName} de ${selectedYear})` : '';

  return (
    <View style={styles.container}>
      <View style={styles.labelGroup}>
        <MicroLabel>{label}</MicroLabel>
        {helperText && (
          <Text style={[t.small, { color: c.textSoft, fontSize: 12, lineHeight: 16, marginTop: 2 }]}>
            {helperText}
          </Text>
        )}
      </View>

      {/* Main Touch Input */}
      <Pressable
        onPress={handleOpen}
        style={[
          styles.inputBox,
          {
            borderColor: error ? '#E06A66' : c.borderStrong,
            backgroundColor: c.cardBgAlt,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <Icon name="clock" size={18} color={c.gold} />
        </View>

        <View style={{ flex: 1 }}>
          {value ? (
            <Text style={[t.body, { color: c.textStrong, fontSize: 15, fontWeight: '500' }]}>
              {value}
            </Text>
          ) : (
            <Text style={[t.body, { color: c.tabInactive, fontSize: 15 }]}>
              Selecciona tu fecha de nacimiento
            </Text>
          )}
        </View>

        <View style={[styles.badge, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <Text style={[t.micro, { color: c.gold, fontSize: 10, fontWeight: '700' }]}>
            CALENDARIO ▾
          </Text>
        </View>
      </Pressable>

      {error && (
        <Text style={[t.small, { color: '#E06A66', fontSize: 11.5 }]}>{error}</Text>
      )}

      {/* Modern Date Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.cardBg, borderColor: c.gold }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <Icon name="clock" size={20} color={c.gold} />
              </View>
              <MicroLabel>FECHA DE NACIMIENTO</MicroLabel>
              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18, marginTop: 4 }]}>
                {selectedDay} de {monthName} de {selectedYear}
              </Text>
            </View>

            {/* 3 Column Pickers */}
            <View style={styles.columnsRow}>
              {/* Día */}
              <View style={[styles.colContainer, { borderColor: c.border }]}>
                <Text style={[t.micro, styles.colHeader, { color: c.gold }]}>DÍA</Text>
                <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false}>
                  {DAYS.map(day => {
                    const isSel = selectedDay === day;
                    return (
                      <Pressable
                        key={day}
                        onPress={() => setSelectedDay(day)}
                        style={[
                          styles.itemBtn,
                          isSel && [styles.itemBtnActive, { backgroundColor: c.gold }],
                        ]}
                      >
                        <Text
                          style={[
                            t.body,
                            {
                              color: isSel ? c.onGold : c.text,
                              fontSize: 14,
                              fontWeight: isSel ? '700' : '400',
                            },
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Mes */}
              <View style={[styles.colContainer, { borderColor: c.border, flex: 1.4 }]}>
                <Text style={[t.micro, styles.colHeader, { color: c.gold }]}>MES</Text>
                <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((m, idx) => {
                    const monthNum = String(idx + 1);
                    const isSel = selectedMonth === monthNum;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setSelectedMonth(monthNum)}
                        style={[
                          styles.itemBtn,
                          isSel && [styles.itemBtnActive, { backgroundColor: c.gold }],
                        ]}
                      >
                        <Text
                          style={[
                            t.body,
                            {
                              color: isSel ? c.onGold : c.text,
                              fontSize: 13,
                              fontWeight: isSel ? '700' : '400',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {m}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Año */}
              <View style={[styles.colContainer, { borderColor: c.border, flex: 1.1 }]}>
                <Text style={[t.micro, styles.colHeader, { color: c.gold }]}>AÑO</Text>
                <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false}>
                  {YEARS.map(yr => {
                    const isSel = selectedYear === yr;
                    return (
                      <Pressable
                        key={yr}
                        onPress={() => setSelectedYear(yr)}
                        style={[
                          styles.itemBtn,
                          isSel && [styles.itemBtnActive, { backgroundColor: c.gold }],
                        ]}
                      >
                        <Text
                          style={[
                            t.body,
                            {
                              color: isSel ? c.onGold : c.text,
                              fontSize: 14,
                              fontWeight: isSel ? '700' : '400',
                            },
                          ]}
                        >
                          {yr}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.cancelBtn, { borderColor: c.border }]}
              >
                <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontWeight: '700' }]}>
                  CANCELAR
                </Text>
              </Pressable>

              <GoldButton
                label="CONFIRMAR FECHA"
                onPress={handleConfirm}
                icon="check"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
  },
  labelGroup: {
    gap: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    alignItems: 'center',
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 8,
    height: 200,
  },
  colContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  colHeader: {
    textAlign: 'center',
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(178,146,79,0.2)',
  },
  colScroll: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  itemBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  itemBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
});
