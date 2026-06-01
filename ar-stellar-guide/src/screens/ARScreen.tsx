import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { DeviceMotion } from 'expo-sensors';
import Constellation from '../components/Constellation';
import starsData from '../../assets/stars.json';
import { StarsDatabase } from '../utils/StarMath';

const IS_WEB = Platform.OS === 'web';

const DEFAULT_LONGITUDE = 116.4;

type CameraState = 'loading' | 'granted' | 'denied' | 'skipped' | 'unavailable' | 'error';

const ARScreen: React.FC = () => {
  const [cameraState, setCameraState] = useState<CameraState>('loading');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [showOverlay, setShowOverlay] = useState(true);
  const [motionAvailable, setMotionAvailable] = useState(true);
  const [webStreamReady, setWebStreamReady] = useState(false);
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [userLongitude] = useState(DEFAULT_LONGITUDE);

  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const subscriptionRef = useRef<any>(null);
  const lastUpdateRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDraggingRef = useRef(false);
  const lastDragRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateRotation = useCallback((rot: { x: number; y: number; z: number }) => {
    rotationRef.current = rot;
    setRotation(rot);
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.style.display = 'none';
    }
    setWebStreamReady(false);
  }, []);

  const skipCamera = useCallback(() => {
    stopCameraStream();
    setCameraState('skipped');
  }, [stopCameraStream]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    isDraggingRef.current = true;
    lastDragRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastDragRef.current.x;
    const dy = e.clientY - lastDragRef.current.y;
    lastDragRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.005;
    const current = rotationRef.current;
    updateRotation({
      x: current.x + dy * sensitivity,
      y: current.y + dx * sensitivity,
      z: current.z,
    });
  }, [updateRotation]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastDragRef.current.x;
    const dy = e.touches[0].clientY - lastDragRef.current.y;
    lastDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    const sensitivity = 0.005;
    const current = rotationRef.current;
    updateRotation({
      x: current.x + dy * sensitivity,
      y: current.y + dx * sensitivity,
      z: current.z,
    });
  }, [updateRotation]);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleFilePick = useCallback(() => {
    if (IS_WEB && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setBackgroundImageUri(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const clearBackground = useCallback(() => {
    setBackgroundImageUri(null);
  }, []);

  useEffect(() => {
    if (IS_WEB) {
      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.style.position = 'absolute';
      videoEl.style.top = '0';
      videoEl.style.left = '0';
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.style.zIndex = '0';
      videoEl.style.display = 'none';
      videoRef.current = videoEl;
      document.body.appendChild(videoEl);

      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        if (videoEl.parentNode) {
          videoEl.parentNode.removeChild(videoEl);
        }
        videoRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (IS_WEB) {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.style.display = 'block';
              await videoRef.current.play().catch(() => {});
            }
            setWebStreamReady(true);
            setCameraState('granted');
          } else {
            setCameraState('unavailable');
          }
        } else {
          const { status } = await Camera.requestCameraPermissionsAsync();
          if (status === 'granted') {
            setCameraState('granted');
          } else {
            setCameraState('denied');
          }
        }
      } catch (e: any) {
        setCameraError(IS_WEB ? 'Camera access denied or not available' : 'Failed to request camera permission');
        setCameraState('error');
      }
    })();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const subscribeNativeMotion = async () => {
      try {
        const isAvailable = await DeviceMotion.isAvailableAsync();
        if (cancelled) return;

        if (!isAvailable) {
          setMotionAvailable(false);
          return;
        }

        subscriptionRef.current = DeviceMotion.addListener(
          (motionData: any) => {
            const now = Date.now();
            if (now - lastUpdateRef.current < 16) return;
            lastUpdateRef.current = now;

            if (motionData && motionData.rotation) {
              const { alpha, beta, gamma } = motionData.rotation;
              const alphaRad = ((alpha ?? 0) * Math.PI) / 180;
              const betaRad = ((beta ?? 0) * Math.PI) / 180;
              const gammaRad = ((gamma ?? 0) * Math.PI) / 180;
              const adjustedBeta = betaRad - Math.PI / 2;

              updateRotation({
                x: adjustedBeta,
                y: -alphaRad,
                z: -gammaRad,
              });
            }
          }
        );

        DeviceMotion.setUpdateInterval(16);
      } catch (e) {
        if (!cancelled) {
          console.warn('DeviceMotion setup error:', e);
          setMotionAvailable(false);
        }
      }
    };

    const setupWebMotion = async () => {
      const DMEvent = (window as any).DeviceMotionEvent;
      if (!DMEvent) {
        setMotionAvailable(false);
        return;
      }

      if (typeof DMEvent.requestPermission === 'function') {
        try {
          const permissionState = await DMEvent.requestPermission();
          if (permissionState !== 'granted') {
            setMotionAvailable(false);
            return;
          }
        } catch {
          setMotionAvailable(false);
          return;
        }
      }

      const handler = (e: DeviceMotionEvent) => {
        const now = Date.now();
        if (now - lastUpdateRef.current < 16) return;
        lastUpdateRef.current = now;

        if (e.rotationRate && (e.rotationRate.alpha !== null || e.rotationRate.beta !== null)) {
          const alpha = e.rotationRate.alpha ?? 0;
          const beta = e.rotationRate.beta ?? 0;
          const gamma = e.rotationRate.gamma ?? 0;

          const alphaRad = (alpha * Math.PI) / 180;
          const betaRad = (beta * Math.PI) / 180;
          const gammaRad = (gamma * Math.PI) / 180;

          const current = rotationRef.current;
          updateRotation({
            x: current.x + betaRad * 0.05,
            y: current.y + alphaRad * 0.05,
            z: current.z + gammaRad * 0.05,
          });
        }
      };

      window.addEventListener('devicemotion', handler);
      subscriptionRef.current = {
        remove: () => window.removeEventListener('devicemotion', handler),
      };
    };

    if (IS_WEB) {
      setupWebMotion();
    } else {
      subscribeNativeMotion();
    }

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, [updateRotation]);

  useEffect(() => {
    if (IS_WEB) {
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const toggleOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const resetRotation = useCallback(() => {
    updateRotation({ x: 0, y: 0, z: 0 });
  }, [updateRotation]);

  const showCameraPrompt =
    cameraState === 'denied' || cameraState === 'error' || cameraState === 'unavailable';

  if (cameraState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4FC3F7" />
        <Text style={styles.loadingText}>Initializing AR Stellar Guide...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!IS_WEB && cameraState === 'granted' && (
        <CameraView style={styles.camera} facing="back" />
      )}

      {IS_WEB && webStreamReady && cameraState === 'granted' && (
        <View style={styles.camera} pointerEvents="none" />
      )}

      {showOverlay && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Constellation
            starsDatabase={starsData as StarsDatabase}
            rotation={rotation}
            threshold={35}
            longitudeDeg={userLongitude}
            backgroundImageUri={backgroundImageUri}
          />
        </View>
      )}

      {showCameraPrompt && (
        <View style={styles.promptOverlay}>
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>
              {cameraState === 'denied'
                ? 'Camera Access Denied'
                : cameraState === 'error'
                  ? 'Camera Error'
                  : 'Camera Not Available'}
            </Text>
            <Text style={styles.promptText}>
              {cameraError || 'You can still explore the sky in simulation mode with a static star map.'}
            </Text>
            <View style={styles.promptButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={skipCamera}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Continue Without Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.infoOverlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Text style={styles.appTitle}>AR Stellar Guide</Text>
          <View style={styles.topButtons}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={resetRotation}
              activeOpacity={0.7}
            >
              <Text style={styles.smallButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleOverlay}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleButtonText}>
                {showOverlay ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {IS_WEB && (
          <View style={styles.simBar}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleFilePick}
              activeOpacity={0.7}
            >
              <Text style={styles.uploadButtonText}>Upload Starry Image</Text>
            </TouchableOpacity>
            {backgroundImageUri && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={clearBackground}
                activeOpacity={0.7}
              >
                <Text style={styles.uploadButtonText}>Clear Image</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showLegend && (
          <View style={styles.legendCard} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.legendCloseBtn}
              onPress={() => setShowLegend(false)}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={styles.legendCloseText}>×</Text>
            </TouchableOpacity>
            <View style={styles.legendRow}>
              <View style={[styles.legendLine, { backgroundColor: '#4FC3F7', opacity: 1 }]} />
              <Text style={styles.legendText}>Official constellation (solid, constellation color)</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDashed]} />
              <Text style={styles.legendText}>Inferred connection (dashed, mixed color, threshold-based)</Text>
            </View>
          </View>
        )}
        {!showLegend && (
          <TouchableOpacity
            style={styles.legendToggle}
            onPress={() => setShowLegend(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.legendToggleText}>?</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomBar}>
          <Text style={styles.hintText}>
            {cameraState === 'granted'
              ? (IS_WEB
                  ? 'Drag to rotate • ' + (motionAvailable ? 'Motion: ON' : 'Motion: OFF')
                  : motionAvailable
                    ? 'Point your phone at the night sky'
                    : 'Motion sensor unavailable')
              : cameraState === 'skipped'
                ? (IS_WEB ? 'Simulation mode — drag to rotate sky' : 'Simulation mode')
                : 'Waiting for camera access...'}
          </Text>
          <Text style={styles.coordText}>
            X:{rotation.x.toFixed(2)}  Y:{rotation.y.toFixed(2)}  Z:{rotation.z.toFixed(2)}
          </Text>
        </View>
      </View>

      {IS_WEB && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange as any}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000510',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  infoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  toggleButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  simBar: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.4)',
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4FC3F7',
  },
  legendCard: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 5, 16, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 10,
    paddingRight: 28,
    minWidth: 220,
    position: 'relative',
  },
  legendCloseBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCloseText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    gap: 10,
  },
  legendLine: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  legendDashed: {
    width: 28,
    height: 3,
    opacity: 0.8,
    backgroundColor: 'transparent',
    borderTopWidth: 2,
    borderTopColor: '#FFD54F',
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 14,
    flex: 1,
  },
  legendToggle: {
    alignSelf: 'flex-end',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  legendToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coordText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000510',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#4FC3F7',
    marginTop: 16,
    fontSize: 14,
  },
  promptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 5, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  promptCard: {
    backgroundColor: 'rgba(10, 20, 40, 0.95)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.3)',
    maxWidth: 340,
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  promptText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#4FC3F7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000510',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ARScreen;
