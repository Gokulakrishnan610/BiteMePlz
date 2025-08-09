import React, { useRef, useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RotateCcw } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get available cameras on component mount
    getCameras();
    
    // Cleanup on unmount
    return () => {
      stopScanner();
    };
  }, []);

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      
      // Try to find back camera first, otherwise use the first available
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        setSelectedCamera(backCamera.id);
      } else if (devices.length > 0) {
        setSelectedCamera(devices[0].id);
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Unable to access cameras. Please ensure camera permissions are granted.');
      onScanError?.('Unable to access cameras');
    }
  };

  const startScanner = async () => {
    if (!selectedCamera) {
      setError('No camera selected');
      return;
    }

    try {
      setError('');
      setIsScanning(true);

      // Create new Html5Qrcode instance
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      // Make scan area responsive: roughly 85% of the smaller viewport dimension
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

      await html5QrCode.start(
        selectedCamera,
        config,
        (decodedText) => {
  
          onScanSuccess(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Only log errors that aren't normal "no QR code found" messages
          if (!errorMessage.includes('No QR code found')) {
            console.warn('QR scan error:', errorMessage);
          }
        }
      );

    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(`Failed to start camera: ${err.message || 'Unknown error'}`);
      setIsScanning(false);
      onScanError?.(err.message || 'Failed to start camera');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    
    const currentIndex = cameras.findIndex(camera => camera.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    if (isScanning) {
      await stopScanner();
      setSelectedCamera(nextCamera.id);
      // Small delay to ensure camera is released
      setTimeout(() => {
        setSelectedCamera(nextCamera.id);
        startScanner();
      }, 500);
    } else {
      setSelectedCamera(nextCamera.id);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {cameras.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Select Camera:
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

      <div className="flex justify-center gap-4">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={!selectedCamera}
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

        {cameras.length > 1 && (
          <button
            onClick={switchCamera}
            disabled={!selectedCamera}
            className="btn-secondary flex items-center"
            title="Switch Camera"
          >
            <RotateCcw size={20} className="mr-2" />
            Switch Camera
          </button>
        )}
      </div>
      
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

      {!isScanning && cameras.length === 0 && (
        <div className="text-center py-8">
          <Camera size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No cameras detected</p>
          <button
            onClick={getCameras}
            className="btn-secondary text-sm"
          >
            Retry Camera Detection
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;