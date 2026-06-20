import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { lookupBarcode } from '../services/pantryService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (itemName: string) => void;
}

const { width: W, height: H } = Dimensions.get('window');
const BOX = Math.round(W * 0.65);
const TOP_H = Math.round((H - BOX) * 0.35);
const CORNER = 22;
const OVERLAY = 'rgba(0,0,0,0.62)';

export default function BarcodeScannerModal({ visible, onClose, onAdd }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const processingRef = useRef(false);

  function reset() {
    processingRef.current = false;
    setScanned(false);
    setLooking(false);
    setNotFound(false);
    setManualInput('');
  }

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  function handleClose() {
    onClose();
  }

  async function handleBarcodeScan({ data }: BarcodeScanningResult) {
    if (processingRef.current) return;
    processingRef.current = true;
    setScanned(true);
    setLooking(true);
    try {
      const name = await lookupBarcode(data);
      setLooking(false);
      if (name) {
        Alert.alert('Product found', `"${name}" — add to pantry?`, [
          { text: 'Cancel', style: 'cancel', onPress: reset },
          {
            text: 'Add',
            onPress: () => {
              onAdd(name.toLowerCase());
              handleClose();
            },
          },
        ]);
      } else {
        setNotFound(true);
      }
    } catch {
      setLooking(false);
      setNotFound(true);
    }
  }

  function handleManualAdd() {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    onAdd(trimmed.toLowerCase());
    handleClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>
        {!permission?.granted ? (
          <View style={styles.permWrap}>
            <Text style={styles.permText}>Camera access is needed to scan barcodes.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={{ marginTop: 16 }}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
              }}
            />

            {/* Top overlay */}
            <View style={[styles.overlayBlock, { height: TOP_H }]} />

            {/* Middle row: left shade | scan box | right shade */}
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

            {/* Bottom overlay + UI */}
            <View style={styles.bottomOverlay}>
              {looking ? (
                <View style={styles.statusRow}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.statusText}>Looking up product…</Text>
                </View>
              ) : notFound ? (
                <View style={styles.notFoundBox}>
                  <Text style={styles.notFoundTitle}>Product not found</Text>
                  <Text style={styles.notFoundSub}>Enter the name manually:</Text>
                  <TextInput
                    style={styles.manualInput}
                    value={manualInput}
                    onChangeText={setManualInput}
                    placeholder="e.g. pasta roni"
                    placeholderTextColor="#bbb"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleManualAdd}
                  />
                  <View style={styles.notFoundBtns}>
                    <TouchableOpacity style={styles.tryAgainBtn} onPress={reset}>
                      <Text style={styles.tryAgainText}>Try again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addManualBtn, !manualInput.trim() && { opacity: 0.45 }]}
                      onPress={handleManualAdd}
                      disabled={!manualInput.trim()}
                    >
                      <Text style={styles.addManualBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.instruction}>Point at a barcode</Text>
              )}
            </View>

            {/* Close button */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
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

  notFoundBox: { width: '100%', alignItems: 'center' },
  notFoundTitle: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  notFoundSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 12 },
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
  notFoundBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  tryAgainBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  tryAgainText: { color: 'white', fontWeight: '600', fontSize: 14 },
  addManualBtn: {
    flex: 1,
    backgroundColor: '#2e86ab',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addManualBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

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
