import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/finpulse-theme';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';

export type GlossaryEntry = { term: string; body: string; why: string };

/** The "tap an underlined term for plain English" bottom sheet. */
export function GlossarySheet({
  entry,
  onClose,
}: {
  entry: GlossaryEntry | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!entry} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {entry && (
          <View style={styles.sheet}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>IN PLAIN ENGLISH</Text>
                <Text style={styles.term}>{entry.term}</Text>
              </View>
              <IconButton onPress={onClose} bordered>
                <CloseIcon size={14} strokeWidth={3} color={Colors.text} />
              </IconButton>
            </View>
            <View style={styles.hr} />
            <Text style={styles.body}>{entry.body}</Text>
            <View style={styles.whyBox}>
              <Text style={styles.whyText}>
                <Text style={styles.whyLabel}>Why it matters here: </Text>
                {entry.why}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(32,30,29,0.45)',
  },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopWidth: 3,
    borderTopColor: Colors.text,
    padding: 20,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  kicker: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.accentText,
    marginBottom: 6,
  },
  term: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  hr: {
    height: 2,
    backgroundColor: Colors.divider,
    marginBottom: 14,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
    marginBottom: 14,
  },
  whyBox: {
    borderWidth: 2,
    borderColor: Colors.divider,
    padding: 14,
  },
  whyLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.text,
  },
  whyText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.neutral800,
  },
});
