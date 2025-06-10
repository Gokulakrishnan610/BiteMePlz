import React, { useRef, useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const startScanner = () => {
    if (!scannerContainerRef.current) return;

    // Clear previous scanner instance if exists
    if (scannerRef.current) {
      scannerRef.current.clear();
    }

    // Create new div for scanner
    const scannerDiv = document.createElement('div');
    scannerDiv.id = 'qr-reader';
    scannerContainerRef.current.innerHTML = '';
    scannerContainerRef.current.appendChild(scannerDiv);

    setIsScanning(true);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    const scanner = new Html5QrcodeScanner('qr-reader', config, /* verbose= */ false);

    const onScanFailure = (error: string) => {
      // Only show errors that aren't related to normal scanning process
      if (!error.includes('No QR code found')) {
        onScanError?.(error);
      }
    };

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-4">
        <button
          onClick={startScanner}
          disabled={isScanning}
          className="btn-primary"
        >
          Start Scanner
        </button>
        <button
          onClick={stopScanner}
          disabled={!isScanning}
          className="btn-secondary"
        >
          Stop Scanner
        </button>
      </div>
      
      <div ref={scannerContainerRef} className="w-full max-w-md mx-auto" />
    </div>
  );
};

export default QRScanner;