import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { lookupBarcode } from '../services/pantryService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (itemName: string, photoUrl?: string) => void;
}

const { width: W, height: H } = Dimensions.get('window');
const BOX = Math.round(W * 0.65);
const TOP_H = Math.round((H - BOX) * 0.35);
const CORNER = 22;
const OVERLAY = 'rgba(0,0,0,0.62)';

type Stage = 'scanning' | 'looking' | 'found' | 'notfound';

export default function BarcodeScannerModal({ visible, onClose, onAdd }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>('scanning');
  const [foundItem, setFoundItem] = useState<{ name: string; photoUrl: string | null } | null>(null);
  const [manualInput, setManualInput] = useState('');
  const processingRef = useRef(false);

  function reset() {
    processingRef.current = false;
    setStage('scanning');
    setFoundItem(null);
    setManualInput('');
  }

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  async function handleBarcodeScan({ data }: BarcodeScanningResult) {
    if (processingRef.current) return;
    processingRef.current = true;
    setStage('looking');
    try {
      const result = await lookupBarcode(data);
      if (result) {
        setFoundItem(result);
        setStage('found');
      } else {
        setStage('notfound');
      }
    } catch {
      setStage('notfound');
    }
  }

  function handleConfirmAdd() {
    if (!foundItem) return;
    onAdd(foundItem.name.toLowerCase(), foundItem.photoUrl ?? undefined);
    onClose();
  }

  function handleManualAdd() {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    onAdd(trimmed.toLowerCase());
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        {!permission?.granted ? (
          <View style={styles.permWrap}>
            <Text style={styles.permText}>Camera access is needed to scan barcodes.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Camera only active while scanning or looking */}
            {(stage === 'scanning' || stage === 'looking') && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={stage === 'scanning' ? handleBarcodeScan : undefined}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                }}
              />
            )}

            {/* Top overlay */}
            <View style={[styles.overlayBlock, { height: TOP_H }]} />

            {/* Middle row */}
            <View style={[styles.middleRow, { height: BOX }]}>
              <View style={styles.overlaySide} />
              <View style={{ width: BOX, height: BOX }}>
                <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
                <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
                <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
                <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
              </View>
              <View style={styles.overlaySide} />
            </View>

            {/* Bottom panel */}
            <View style={styles.bottomOverlay}>
              {stage === 'looking' && (
                <View style={styles.statusRow}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.statusText}>Looking up product…</Text>
                </View>
              )}

              {stage === 'found' && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultLabel}>Product found</Text>
                  <Text style={styles.resultName} numberOfLines={2}>{foundItem?.name ?? ''}</Text>
                  <View style={styles.resultBtns}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
                      <Text style={styles.cancelBtnText}>Scan again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={handleConfirmAdd}>
                      <Text style={styles.addBtnText}>Add to Pantry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {stage === 'notfound' && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultLabel}>Product not found</Text>
                  <Text style={styles.notFoundSub}>Enter the name manually:</Text>
                  <TextInput
                    style={styles.manualInput}
                    value={manualInput}
                    onChangeText={setManualInput}
                    placeholder="e.g. pasta roni"
                    placeholderTextColor="#9bb4c2"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleManualAdd}
                  />
                  <View style={styles.resultBtns}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
                      <Text style={styles.cancelBtnText}>Scan again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addBtn, !manualInput.trim() && { opacity: 0.45 }]}
                      onPress={handleManualAdd}
                      disabled={!manualInput.trim()}
                    >
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {stage === 'scanning' && (
                <Text style={styles.instruction}>Point at a barcode</Text>
              )}
            </View>

            {/* Close button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'black' },

  overlayBlock: { width: '100%', backgroundColor: OVERLAY },
  middleRow: { flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: OVERLAY },

  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: 'white',
    borderWidth: 0,
  },

  bottomOverlay: {
    flex: 1,
    backgroundColor: OVERLAY,
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
  },

  instruction: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { color: 'white', fontSize: 14, fontWeight: '600' },

  resultBox: { width: '100%', alignItems: 'center' },
  resultLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  resultName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  notFoundSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 12,
  },
  manualInput: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  resultBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cancelBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  addBtn: {
    flex: 1,
    backgroundColor: '#2e86ab',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  permWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permBtn: {
    backgroundColor: '#2e86ab',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  permBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  cancelLink: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
});
