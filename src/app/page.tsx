
"use client";

import React, { useState, useRef } from 'react';
import { PDFarkHeader } from '@/components/pdf/PDFarkHeader';
import { Uploader } from '@/components/pdf/Uploader';
import { Processor } from '@/components/pdf/Processor';
import { convertPdfToDarkTheme, ProcessingProgress } from '@/lib/pdf-processor';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

  // Custom Toast State
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    try {
      const bytes = await convertPdfToDarkTheme(selectedFile, (p) => setProgress(p));
      setResultBytes(bytes);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !file) return;

    const blob = new Blob([resultBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const originalName = file.name.replace(/\.[^/.]+$/, "");
    link.download = `${originalName}-Dark.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show download complete toast and auto-dismiss after 3s
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
      toastTimerRef.current = null;
    }, 3000);
  };

  const handleReset = () => {
    setFile(null);
    setProgress(null);
    setResultBytes(null);
  };

  // Called by "Convert Another" — resets state and immediately starts the new file
  const handleNewFile = (newFile: File) => {
    setFile(null);
    setProgress(null);
    setResultBytes(null);
    // Kick off conversion in the next tick so state clears first
    setTimeout(() => handleFileSelect(newFile), 0);
  };

  const isProcessing = !!file && !!progress;

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      {/* Sticky nav bar — only shown in the processor/preview view */}
      {isProcessing && (
        <nav className="sticky top-0 z-20 w-full border-b border-border bg-background/80 backdrop-blur-md">
          <div className="px-4 sm:px-10 h-14 flex items-center">
            <PDFarkHeader compact onLogoClick={handleReset} />
          </div>
        </nav>
      )}

      <div className={`w-full z-10 ${isProcessing
        ? 'px-4 sm:px-10 pt-4 sm:pt-6 pb-12'
        : 'flex flex-col items-center justify-center min-h-screen px-4 sm:px-24'
        }`}>
        {!isProcessing && (
          <div className="w-full max-w-4xl">
            <PDFarkHeader />
            <Uploader onFileSelect={handleFileSelect} />
          </div>
        )}

        {isProcessing && (
          <Processor
            progress={progress!}
            fileName={file!.name}
            onDownload={handleDownload}
            onReset={handleReset}
            onNewFile={handleNewFile}
            resultBytes={resultBytes}
          />
        )}
      </div>

      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent blur-[120px]" />
      </div>

      {/* Custom Download Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-card border border-border shadow-2xl rounded-2xl"
          >
            <div className="p-1 rounded-full bg-primary/20">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-white">Download Started</p>
              <p className="text-xs text-muted-foreground">Your dark mode PDF is saving.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

