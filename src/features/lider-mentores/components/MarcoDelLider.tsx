import React from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * El marco de cada pantalla del líder: «‹ Título» arriba y UN solo scroll (AGENTS.md §2), igual
 * que el semáforo por grupos y la bandeja de tickets. El retroceso del sistema vuelve un nivel, nunca
 * cierra la app desde una subpantalla (§6).
 */
export function MarcoDelLider({
  titulo,
  onVolver,
  children,
}: {
  titulo: string;
  onVolver: () => void;
  children: React.ReactNode;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <BarraDelLider titulo={titulo} onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          gap: 16,
          paddingHorizontal: horizontalPadding,
          paddingTop: 8,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * La barra de arriba de cada pantalla del líder: «‹ Título», la misma cabecera de «Mis mentores» y de Administración
 * (`CabeceraAdmin`; 2026-10-31: antes llevaba «← VOLVER» en versalitas y no se parecía a ninguna otra). Es del marco
 * (`MarcoDelLider`) y de la lista de «Todos los aprendices», que tiene su propio scroll (una lista que se pide de a páginas)
 * pero la misma barra. El botón es el de siempre: «Volver», de 48, y lo atiende `onVolver`.
 */
export function BarraDelLider({ titulo, onVolver }: { titulo: string; onVolver: () => void }) {
  return <CabeceraAdmin titulo={titulo} onVolver={onVolver} />;
}

/** Un texto de lectura: 16 px (SDD 002, RL-30). */
export function Linea({ children, fuerte = false }: { children: React.ReactNode; fuerte?: boolean }) {
  const { c, t } = useTheme();
  return (
    <Text style={[t.body, { color: fuerte ? c.textStrong : c.textSoft, fontSize: 16, lineHeight: 23 }]}>{children}</Text>
  );
}
