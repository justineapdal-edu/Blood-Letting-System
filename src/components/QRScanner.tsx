'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button, Spinner } from '@/components/ui'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (donorId: string) => Promise<{ type: 'success' | 'error'; message: string }>
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [scanning, setScanning] = useState(true)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      async (decodedText) => {
        if (!scanning) return
        setScanning(false)
        try { scanner.stop() } catch {}
        const res = await onScan(decodedText)
        setResult(res)
      },
      () => {}
    ).catch((err) => {
      console.error('Failed to start scanner:', err)
      setResult({ type: 'error', message: 'Failed to access camera. Please grant camera permissions.' })
    })

    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop() } catch {}
        try { scannerRef.current.clear() } catch {}
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Scan Donor QR Code</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {result ? (
            <div className="py-8 text-center">
              {result.type === 'success' ? (
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              ) : (
                <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              )}
              <p className={`mt-3 text-sm ${result.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>
              <Button variant="secondary" onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          ) : scanning ? (
            <>
              <div id="qr-reader" ref={containerRef} className="overflow-hidden rounded-lg [&>video]:!w-full [&>video]:!h-auto [&>video]:!object-cover" />
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Spinner size="sm" />
                <span>Point camera at donor QR code...</span>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <Spinner size="lg" />
              <p className="mt-3 text-sm text-gray-500">Processing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
