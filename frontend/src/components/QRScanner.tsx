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
        setSelectedCamera(devices[0].id);
      }
    } catch (err) {
      console.log('Camera enumeration failed, using mobile fallback:', err);
      setIsMobileMode(true);
    }
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
        videoElements.forEach((video, index) => {
          const videoElement = video as HTMLVideoElement;
          console.log(`📹 Video ${index}:`, {
            width: videoElement.videoWidth,
            height: videoElement.videoHeight,
            readyState: videoElement.readyState,
            paused: videoElement.paused,
            currentTime: videoElement.currentTime,
            style: {
              display: getComputedStyle(videoElement).display,
              visibility: getComputedStyle(videoElement).visibility,
              opacity: getComputedStyle(videoElement).opacity
            }
          });
        });
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

      // Strategy 1: Try environment camera (back camera on mobile)
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
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
        console.log('Environment camera failed, trying user camera:', err);
        
        // Strategy 2: Try user-facing camera
        try {
          await html5QrCode.start(
            { facingMode: "user" },
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
          
          // Strategy 3: Try with specific camera ID if available
          if (selectedCamera && cameras.length > 0) {
            try {
              await html5QrCode.start(
                selectedCamera,
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
  }, [selectedCamera, onScanSuccess, onScanError, cameras.length]);

  useEffect(() => {
    if (autoStart && !isScanning && !isStarting) {
      startScanner();
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
      {cameras.length > 1 && !isMobileMode && (
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
        className="w-full mx-auto"
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
      />

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