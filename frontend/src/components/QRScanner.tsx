import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RotateCcw, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  autoStart?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError, autoStart = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [error, setError] = useState<string>('');
  const [cameraMode, setCameraMode] = useState<'environment' | 'user' | 'device'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Get available cameras on component mount
    getCameras();
    
    // Cleanup on unmount
    return () => {
      stopScanner();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      
      if (devices.length > 0) {
        setSelectedCamera(devices[0].id);
        setCurrentCameraIndex(0);
      }
    } catch (err) {
      console.log('Camera enumeration failed, using facingMode fallback');
      // Don't set error here, we'll use facingMode fallback
    }
  };

  const startScanner = useCallback(async () => {
    try {
      setError('');
      setIsScanning(true);

      // Stop any existing scanner
      if (scannerRef.current) {
        await stopScanner();
      }

      // Create new Html5Qrcode instance
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const config: any = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      };

      let success = false;

      // Try different camera configurations in order of preference
      const cameraConfigs = [
        // 1. Try environment-facing camera (back camera) first
        { facingMode: "environment" as const },
        // 2. Try user-facing camera (front camera)
        { facingMode: "user" as const },
        // 3. Try specific device ID if available
        ...(selectedCamera ? [{ deviceId: selectedCamera }] : [])
      ];

      for (const config of cameraConfigs) {
        try {
          await html5QrCode.start(
            config,
            config,
            (decodedText) => {
              onScanSuccess(decodedText);
              // Don't stop scanner immediately, let it restart
              handleScanSuccess();
            },
            (errorMessage) => {
              // Silent handling of QR scan errors
            }
          );
          success = true;
          setCameraMode(config.facingMode || 'device');
          break;
        } catch (err) {
          console.log(`Camera config failed:`, config, err);
          continue;
        }
      }

      if (!success) {
        throw new Error('All camera configurations failed');
      }

    } catch (err: any) {
      setError(`Failed to start camera: ${err.message || 'Unknown error'}`);
      setIsScanning(false);
      onScanError?.(err.message || 'Failed to start camera');
    }
  }, [selectedCamera, onScanSuccess, onScanError]);

  // Auto-start scanner when autoStart is true and cameras are available
  useEffect(() => {
    if (autoStart && !isScanning) {
      startScanner();
    }
  }, [autoStart, isScanning, startScanner]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        // Silent fail for stopping scanner
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = () => {
    // Stop current scanner
    stopScanner();
    
    // Clear any existing restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    
    // Restart scanner after a short delay (mobile-friendly)
    restartTimeoutRef.current = setTimeout(() => {
      if (autoStart) {
        startScanner();
      }
    }, 1000); // 1 second delay for mobile devices
  };

  const switchCamera = async () => {
    if (isScanning) {
      await stopScanner();
    }
    
    // Clear any existing restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    // Cycle through camera modes
    const modes: Array<'environment' | 'user' | 'device'> = ['environment', 'user', 'device'];
    const currentIndex = modes.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    
    setCameraMode(nextMode);
    
    // If we have multiple device cameras, cycle through them too
    if (nextMode === 'device' && cameras.length > 1) {
      const nextCameraIndex = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(nextCameraIndex);
      setSelectedCamera(cameras[nextCameraIndex]?.id || '');
    }
    
    // Small delay to ensure camera is released
    setTimeout(() => {
      if (autoStart) {
        startScanner();
      }
    }, 500);
  };

  const restartScanner = async () => {
    await stopScanner();
    
    // Clear any existing restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    
    // Small delay then restart
    setTimeout(() => {
      if (autoStart) {
        startScanner();
      }
    }, 500);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Camera controls */}
      <div className="flex justify-center gap-3 flex-wrap">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="btn-primary flex items-center"
          >
            <Camera size={20} className="mr-2" />
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="btn-secondary flex items-center"
          >
            <X size={20} className="mr-2" />
            Stop Scanner
          </button>
        )}

        {/* Switch camera button - always visible */}
        <button
          onClick={switchCamera}
          className="btn-secondary flex items-center"
          title={`Switch Camera (Current: ${cameraMode === 'environment' ? 'Back' : cameraMode === 'user' ? 'Front' : 'Device'})`}
        >
          <RotateCcw size={20} className="mr-2" />
          Switch Camera
        </button>

        {/* Restart scanner button */}
        <button
          onClick={restartScanner}
          className="btn-secondary flex items-center"
          title="Restart Scanner"
        >
          <RefreshCw size={20} className="mr-2" />
          Restart
        </button>
      </div>

      {/* Camera info */}
      <div className="text-center text-sm text-gray-600">
        <p>Mode: {cameraMode === 'environment' ? 'Back Camera' : cameraMode === 'user' ? 'Front Camera' : 'Device Camera'}</p>
        {cameras.length > 0 && (
          <p>Available: {cameras.length} camera{cameras.length > 1 ? 's' : ''}</p>
        )}
      </div>
      
      {/* Scanner container */}
      <div 
        id="qr-reader" 
        ref={scannerContainerRef} 
        className="w-full mx-auto"
        style={{ 
          display: isScanning ? 'block' : 'none',
          border: '2px solid #8B5CF6',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      />

      {/* Scanning status */}
      {isScanning && (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Position the QR code within the frame
          </p>
          <div className="flex justify-center">
            <div className="animate-pulse bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs">
              Scanning...
            </div>
          </div>
        </div>
      )}

      {/* No camera detected */}
      {!isScanning && cameras.length === 0 && (
        <div className="text-center py-8">
          <Camera size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No camera detected</p>
          <button
            onClick={getCameras}
            className="btn-secondary text-sm"
          >
            Retry Camera Detection
          </button>
        </div>
      )}

      {/* Camera selection for multiple cameras */}
      {!isScanning && cameras.length > 1 && (
        <div className="text-center py-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Select Camera:
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => {
              setSelectedCamera(e.target.value);
              const index = cameras.findIndex(c => c.id === e.target.value);
              setCurrentCameraIndex(index >= 0 ? index : 0);
            }}
            className="input text-sm"
          >
            {cameras.map((camera, index) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default QRScanner;