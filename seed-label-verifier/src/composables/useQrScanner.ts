import { ref, onUnmounted } from 'vue';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

export function useQrScanner() {
  const scanning = ref(false);
  const scannedResult = ref<string | null>(null);
  const error = ref<string | null>(null);
  const codeReader = ref<BrowserMultiFormatReader | null>(null);
  const videoElement = ref<HTMLVideoElement | null>(null);
  const stream = ref<MediaStream | null>(null);

  async function startScan(videoRef: HTMLVideoElement) {
    try {
      scanning.value = true;
      error.value = null;
      scannedResult.value = null;
      videoElement.value = videoRef;

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      stream.value = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.srcObject = stream.value;
      await videoRef.play();

      codeReader.value = new BrowserMultiFormatReader();

      const decodeFromVideo = async () => {
        if (!scanning.value || !videoRef || !codeReader.value) return;

        try {
          if (videoRef.readyState === videoRef.HAVE_ENOUGH_DATA) {
            try {
              const reader = codeReader.value as unknown as {
                decodeFromVideoElement: (el: HTMLVideoElement) => Promise<{ getText: () => string }>;
              };
              const result = await reader.decodeFromVideoElement(videoRef);
              if (result) {
                scannedResult.value = result.getText();
                stopScan();
                return;
              }
            } catch (e) {
              if (!(e instanceof NotFoundException)) {
                console.error('Decode error:', e);
              }
            }
          }
        } catch (e) {
          console.error('Capture error:', e);
        }

        if (scanning.value) {
          setTimeout(decodeFromVideo, 100);
        }
      };

      decodeFromVideo();
    } catch (e) {
      error.value = '无法访问摄像头，请确保已授权摄像头权限';
      scanning.value = false;
      console.error('Camera error:', e);
    }
  }

  function stopScan() {
    scanning.value = false;

    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop());
      stream.value = null;
    }

    if (videoElement.value) {
      videoElement.value.srcObject = null;
    }

    if (codeReader.value) {
      codeReader.value.reset();
      codeReader.value = null;
    }
  }

  function clearResult() {
    scannedResult.value = null;
    error.value = null;
  }

  onUnmounted(() => {
    stopScan();
  });

  return {
    scanning,
    scannedResult,
    error,
    startScan,
    stopScan,
    clearResult
  };
}
