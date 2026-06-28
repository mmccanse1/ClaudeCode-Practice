import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';

export interface DropdownOption {
  id: string;
  label: string;
  /** Optional accent dot / text color for the row. */
  color?: string;
  /** Optional secondary line under the label. */
  sublabel?: string;
}

interface Props {
  /** Field label shown above the control. */
  label: string;
  /** Text shown when nothing is selected — this is an action menu, so it stays. */
  placeholder: string;
  options: DropdownOption[];
  onSelect: (option: DropdownOption) => void;
  /** Accent used for the control border / chevron. */
  accentColor?: string;
}

/**
 * Lightweight action dropdown — a labelled control that opens a modal list and
 * fires onSelect for the chosen row. Used on Home for "Choose a Diet" and
 * "Current Menus" so the screen stays compact instead of a long list of cards.
 * No persistent selected state: every pick is an action (navigation).
 */
export default function Dropdown({ label, placeholder, options, onSelect, accentColor = '#2e86ab' }: Props) {
  const [open, setOpen] = useState(false);

  function choose(option: DropdownOption) {
    setOpen(false);
    onSelect(option);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.control, { borderColor: accentColor }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.placeholder}>{placeholder}</Text>
        <Text style={[styles.chevron, { color: accentColor }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.row}
                onPress={() => choose(option)}
                activeOpacity={0.7}
              >
                {option.color && <View style={[styles.dot, { backgroundColor: option.color }]} />}
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, option.color ? { color: option.color } : null]}>
                    {option.label}
                  </Text>
                  {option.sublabel ? <Text style={styles.rowSub}>{option.sublabel}</Text> : null}
                </View>
                <Text style={styles.rowArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5b7a8c',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  placeholder: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  chevron: { fontSize: 16, fontWeight: '700' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 28,
  },
  sheet: {
    backgroundColor: 'white',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5b7a8c',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  rowSub: { fontSize: 13, color: '#5b7a8c', marginTop: 2 },
  rowArrow: { fontSize: 22, fontWeight: '300', color: '#9bb4c2' },
});
