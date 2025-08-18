import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

// Add CSS to ensure QR scanner visibility
const qrScannerStyles = `
  #qr-reader {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 10 !important;
  }
  
  #qr-reader video {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }
  
  #qr-reader__scan_region {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  #qr-reader__scan_region video {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
`;

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  autoStart?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError, autoStart = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isMobileMode, setIsMobileMode] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const [showTapToStart, setShowTapToStart] = useState(false);

  const selectBackCameraId = (devices: any[]): string | null => {
    if (!Array.isArray(devices)) return null;
    const labelHas = (label: string, needles: string[]) => {
      const lower = (label || '').toLowerCase();
      return needles.some((n) => lower.includes(n));
    };
    const backNeedles = ['back', 'rear', 'environment', 'world', 'arrière', 'trasera', 'trás', '后', '뒤'];
    // Prefer labels that indicate back/rear
    const back = devices.find((d) => labelHas(d.label || '', backNeedles));
    if (back) return back.id;
    // Some devices list back camera last
    if (devices.length > 1) return devices[devices.length - 1].id;
    return devices[0]?.id || null;
  };

  useEffect(() => {
    // Inject QR scanner styles
    const styleElement = document.createElement('style');
    styleElement.textContent = qrScannerStyles;
    document.head.appendChild(styleElement);
    
    getCameras();
    return () => {
      stopScanner();
      // Clean up injected styles
      document.head.removeChild(styleElement);
    };
  }, []);

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      
      // Better mobile detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
                      devices.length <= 2;
      
      setIsMobileMode(isMobile);
      
      if (devices.length > 0) {
        const backId = selectBackCameraId(devices);
        setSelectedCamera(backId || devices[0].id);
      }
    } catch (err) {
      console.log('Camera enumeration failed, using mobile fallback:', err);
      setIsMobileMode(true);
    }
  };

  const ensureVideoAttributes = () => {
    const videoElements = document.querySelectorAll('#qr-reader video');
    videoElements.forEach((video) => {
      const v = video as HTMLVideoElement;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('webkit-playsinline', 'true');
      v.muted = true;
      v.autoplay = true;
      v.controls = false;
      v.style.visibility = 'visible';
      v.style.opacity = '1';
      v.style.transform = 'translateZ(0)';
    });
  };

  // Wait until the container exists and has a non-zero size to avoid starting the camera in a hidden/zero-sized element
  const waitForContainerVisible = async (maxMs: number = 3000, intervalMs: number = 100) => {
    const start = Date.now();
    return new Promise<void>((resolve, reject) => {
      const check = () => {
        const el = document.getElementById('qr-reader');
        if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
          resolve();
        } else if (Date.now() - start >= maxMs) {
          console.warn('QRScanner: container not visible within timeout; continuing anyway');
          resolve();
        } else {
          setTimeout(check, intervalMs);
        }
      };
      check();
    });
  };

  const startScanner = useCallback(async () => {
    try {
      setError('');
      setIsStarting(true);
      setIsScanning(true);

      console.log('🎥 Starting QR Scanner...');
      console.log('📱 Mobile mode:', isMobileMode);
      console.log('📷 Available cameras:', cameras.length);

      if (scannerRef.current) {
        await stopScanner();
      }

      // Ensure container is present and visible
      await waitForContainerVisible();

      // Apply a safe minimum height if container is still zero height
      const containerEl = document.getElementById('qr-reader') as HTMLDivElement | null;
      if (containerEl && (containerEl.offsetHeight === 0 || containerEl.clientHeight === 0)) {
        containerEl.style.minHeight = isMobileMode ? '280px' : '320px';
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      console.log('🔧 Scanner container:', document.getElementById('qr-reader'));
      console.log('📐 Container dimensions:', {
        width: document.getElementById('qr-reader')?.offsetWidth,
        height: document.getElementById('qr-reader')?.offsetHeight
      });
      
      // Check for video elements after a short delay
      setTimeout(() => {
        const videoElements = document.querySelectorAll('#qr-reader video');
        console.log('📹 Video elements found:', videoElements.length);
        ensureVideoAttributes();
      }, 2000);

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 1,
      };

      // Try to get user permission first
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (permissionErr) {
        throw new Error('Camera permission denied. Please allow camera access.');
      }

      // Strategy 1: Try environment camera (force back camera on mobile)
      try {
        await html5QrCode.start(
          { facingMode: { exact: "environment" } as any },
          config,
          (decodedText) => {
            console.log('QR Code scanned:', decodedText);
            setIsStarting(false);
            setIsScanning(false);
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            console.log('Scan error:', errorMessage);
            // Don't stop scanning on scan errors, just log them
          }
        );
        setIsStarting(false);
        return;
      } catch (err) {
        console.log('Exact environment camera failed:', err);
        
        // Strategy 1b: Try ideal environment
        try {
          await html5QrCode.start(
            { facingMode: { ideal: "environment" } as any },
            config,
            (decodedText) => {
              console.log('QR Code scanned:', decodedText);
              setIsStarting(false);
              setIsScanning(false);
              onScanSuccess(decodedText);
            },
            (errorMessage) => {
              console.log('Scan error:', errorMessage);
            }
          );
          setIsStarting(false);
          return;
        } catch (errEnvIdeal) {
          console.log('Ideal environment camera failed:', errEnvIdeal);
        }
        
        // Strategy 2: Try explicit back camera by device id
        try {
          const devices = cameras.length > 0 ? cameras : await Html5Qrcode.getCameras();
          const backId = selectBackCameraId(devices);
          if (backId) {
            await html5QrCode.start(
              backId,
              config,
              (decodedText) => {
                console.log('QR Code scanned:', decodedText);
                setIsStarting(false);
                setIsScanning(false);
                onScanSuccess(decodedText);
              },
              (errorMessage) => {
                console.log('Scan error:', errorMessage);
              }
            );
            setIsStarting(false);
            return;
          }
        } catch (byIdErr) {
          console.log('Back camera by deviceId failed:', byIdErr);
        }

        // Strategy 3: Try user-facing as last resort (still better than nothing on desktops)
        try {
          await html5QrCode.start(
            { facingMode: { ideal: "user" } as any },
            config,
            (decodedText) => {
              console.log('QR Code scanned:', decodedText);
              setIsStarting(false);
              setIsScanning(false);
              onScanSuccess(decodedText);
            },
            (errorMessage) => {
              console.log('Scan error:', errorMessage);
            }
          );
          setIsStarting(false);
          return;
        } catch (err2) {
          console.log('User camera failed:', err2);
          
          // Strategy 4: Try with any available camera IDs as ultimate fallback
          if (cameras.length > 0) {
            try {
              for (const dev of cameras) {
                try {
                  await html5QrCode.start(
                    dev.id,
                    config,
                    (decodedText) => {
                      console.log('QR Code scanned:', decodedText);
                      setIsStarting(false);
                      setIsScanning(false);
                      onScanSuccess(decodedText);
                    },
                    (errorMessage) => {
                      console.log('Scan error:', errorMessage);
                    }
                  );
                  setIsStarting(false);
                  return;
                } catch (loopErr) {
                  // try next device
                }
              }
            } catch (err3) {
              console.log('Specific camera ID failed:', err3);
            }
          }
          
          // More specific error messages
          let errorMsg = 'Failed to start camera. ';
          if (err && typeof err === 'object' && 'message' in err) {
            const errorMessage = String(err.message);
            if (errorMessage.includes('Permission')) {
              errorMsg += 'Please allow camera access and refresh the page.';
            } else if (errorMessage.includes('NotFound')) {
              errorMsg += 'No camera found. Please check your device.';
            } else if (errorMessage.includes('NotAllowed')) {
              errorMsg += 'Camera access denied. Please check permissions.';
            } else {
              errorMsg += 'Please check camera permissions and try again.';
            }
          } else {
            errorMsg += 'Please check camera permissions and try again.';
          }
          
          throw new Error(errorMsg);
        }
      }

    } catch (err: any) {
      console.error('Camera start error:', err);
      setError(`Camera error: ${err.message || 'Failed to start camera. Please check permissions.'}`);
      setIsScanning(false);
      setIsStarting(false);
      onScanError?.(err.message || 'Failed to start camera');
    }
  }, [selectedCamera, onScanSuccess, onScanError, cameras.length, isMobileMode]);

  useEffect(() => {
    if (autoStart && !isScanning && !isStarting) {
      startScanner()
        .catch(() => {})
        .finally(() => {
          // If not started within a short time, prompt user to tap (helps iOS policies)
          setTimeout(() => {
            if (!isScanning && !isStarting) setShowTapToStart(true);
          }, 800);
        });
    } else {
      // When autoStart is false, show prompt to start on tap
      setShowTapToStart(true);
    }
  }, [autoStart, isScanning, isStarting, startScanner]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        // Silent fail
      }
    }
    setIsScanning(false);
    setIsStarting(false);
  };

  // Restart camera on orientation change or resize for mobile layout issues
  useEffect(() => {
    const restartIfVisible = () => {
      const el = document.getElementById('qr-reader');
      const isVisible = !!el && el.offsetWidth > 0 && el.offsetHeight > 0;
      if (isVisible && autoStart) {
        // Small debounce to avoid rapid restarts
        stopScanner().finally(() => startScanner());
      }
    };
    window.addEventListener('orientationchange', restartIfVisible);
    window.addEventListener('resize', restartIfVisible);
    return () => {
      window.removeEventListener('orientationchange', restartIfVisible);
      window.removeEventListener('resize', restartIfVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, startScanner]);

  // Pause camera when tab becomes hidden; resume when visible and autoStart is true
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        stopScanner();
      } else if (autoStart && !isScanning && !isStarting) {
        startScanner();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isScanning, isStarting, startScanner]);

  return (
    <div className="space-y-4 w-full">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
          <div className="mt-2 flex gap-2">
            <button 
              onClick={() => setError('')} 
              className="text-red-600 hover:text-red-800 text-sm underline"
            >
              Dismiss
            </button>
            <button 
              onClick={() => {
                setError('');
                startScanner();
              }} 
              className="text-red-600 hover:text-red-800 text-sm underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Camera Selection - Only for desktop */}
      {cameras.length > 1 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Camera:
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            disabled={isScanning}
            className="input"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div 
        id="qr-reader" 
        ref={scannerContainerRef} 
        className="w-full mx-auto relative"
        style={{ 
          display: 'block',
          border: '2px solid #8B5CF6',
          borderRadius: '12px',
          overflow: 'hidden',
          minHeight: isMobileMode ? '250px' : '300px',
          maxHeight: isMobileMode ? '50vh' : '60vh',
          width: '100%',
          maxWidth: '100vw',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          zIndex: 10
        }}
        onClick={() => {
          // Allow manual user-gesture start for iOS/Safari
          if (!isScanning && !isStarting) {
            setShowTapToStart(false);
            startScanner().catch(() => setShowTapToStart(true));
          }
        }}
      />

      {/* Tap-to-start overlay hint (helps iOS autoplay policies) */}
      {!error && showTapToStart && !isScanning && !isStarting && (
        <div className="-mt-6 text-center">
          <button
            onClick={() => {
              setShowTapToStart(false);
              startScanner().catch(() => setShowTapToStart(true));
            }}
            className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700"
          >
            Tap to start camera
          </button>
        </div>
      )}

      {isStarting && (
        <div className="text-center">
          <div className="flex justify-center">
            <div className="animate-pulse bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
              Starting camera...
            </div>
          </div>
        </div>
      )}

      {isScanning && !isStarting && (
        <div className="text-center">
          <div className="flex justify-center items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="animate-pulse bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs">
              Camera active - point at QR code...
            </div>
          </div>
        </div>
      )}

      {!isScanning && cameras.length === 0 && !isMobileMode && (
        <div className="text-center py-8">
          <Camera size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No camera detected</p>
          <button
            onClick={getCameras}
            className="btn-secondary text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Camera not visible warning */}
      {isScanning && !isStarting && (
        <div className="mt-2 text-center space-y-2">
          <p className="text-xs text-gray-500">
            If camera is not visible, try refreshing the page or check camera permissions
          </p>
          <button
            onClick={() => {
              console.log('🔍 Manual camera check...');
              const videoElements = document.querySelectorAll('#qr-reader video');
              console.log('📹 Found video elements:', videoElements.length);
              videoElements.forEach((video, index) => {
                const videoElement = video as HTMLVideoElement;
                console.log(`📹 Video ${index} status:`, {
                  readyState: videoElement.readyState,
                  paused: videoElement.paused,
                  currentTime: videoElement.currentTime,
                  width: videoElement.videoWidth,
                  height: videoElement.videoHeight
                });
              });
            }}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Debug Camera Status
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;