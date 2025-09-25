import React, { useEffect, useRef, useState } from 'react';
import { ArrowPathIcon } from './icons';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onBarcodeDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Stop camera when modal is closed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    // Check for BarcodeDetector API
    // @ts-ignore - BarcodeDetector might not be in default TS lib
    if (!('BarcodeDetector' in window)) {
      setError('Barcode detection is not supported in this browser.');
      return;
    }
    
    // @ts-ignore
    const barcodeDetector = new window.BarcodeDetector({ formats: ['ean_13', 'upc_a', 'upc_e', 'code_128', 'qr_code'] });

    const startCamera = async () => {
      setIsInitializing(true);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsInitializing(false);
        detectBarcode();
      } catch (err) {
        console.error("Camera error:", err);
        setError('Could not access the camera. Please grant permission.');
        setIsInitializing(false);
      }
    };

    const detectBarcode = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !isOpen) return;

      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          onBarcodeDetected(barcodes[0].rawValue);
        } else {
          // Keep detecting
          requestAnimationFrame(detectBarcode);
        }
      } catch (err) {
        console.error('Barcode detection error:', err);
        // Continue trying
        if (isOpen) {
            requestAnimationFrame(detectBarcode);
        }
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, onBarcodeDetected]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-card-dark rounded-2xl shadow-2xl w-full max-w-md h-auto aspect-[4/3] sm:aspect-square overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center">
                {isInitializing && <ArrowPathIcon className="w-12 h-12 text-white animate-spin" />}
                {error && <p className="text-white bg-red-800/80 p-4 rounded-lg text-center mx-4">{error}</p>}
                {!isInitializing && !error && (
                    <div className="absolute inset-0 border-[30px] sm:border-[40px] border-black/30 rounded-2xl pointer-events-none">
                        <div className="w-full h-1 bg-red-500/70 absolute top-1/2 -translate-y-1/2 shadow-[0_0_15px_5px_rgba(239,68,68,0.5)] animate-pulse" />
                    </div>
                )}
            </div>
             <div className="absolute top-2 left-2 text-white bg-black/50 p-2 rounded-lg text-sm">
                Point camera at a barcode
            </div>
        </div>
        <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">
            Cancel
        </button>
    </div>
  );
};

export default BarcodeScanner;
