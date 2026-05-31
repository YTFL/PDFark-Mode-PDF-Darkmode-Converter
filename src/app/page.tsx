
"use client";

import React, { useState, useRef } from 'react';
import { PDFarkHeader } from '@/components/pdf/PDFarkHeader';
import { Uploader } from '@/components/pdf/Uploader';
import { Processor } from '@/components/pdf/Processor';
import { convertPdfToDarkTheme, ProcessingProgress } from '@/lib/pdf-processor';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';

function removePdfExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '');
}

function buildArchiveEntryName(fileName: string) {
  return `PDFark-Converted/${removePdfExtension(fileName)}-Dark.pdf`;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [archiveBlob, setArchiveBlob] = useState<Blob | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);

  // Custom Toast State
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFilesSelect = async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setProgress({ stage: 'parsing', percentage: 1, message: 'Starting conversion...' });
    setResultBytes(null);
    setArchiveBlob(null);
    setDownloadName(null);

    try {
      if (selectedFiles.length === 1) {
        const [selectedFile] = selectedFiles;
        const bytes = await convertPdfToDarkTheme(selectedFile, (p) => setProgress(p));
        setResultBytes(bytes);
        setDownloadName(`${removePdfExtension(selectedFile.name)}-Dark.pdf`);
        return;
      }

      const zip = new JSZip();
      const totalFiles = selectedFiles.length;

      for (let index = 0; index < totalFiles; index += 1) {
        const selectedFile = selectedFiles[index];
        const filePrefix = `${index + 1}/${totalFiles}`;
        setProgress({
          stage: 'parsing',
          percentage: Math.max(1, Math.round((index / totalFiles) * 100)),
          message: `Preparing ${filePrefix}: ${selectedFile.name}`,
        });

        const bytes = await convertPdfToDarkTheme(selectedFile, (p) => {
          const combinedPercentage = ((index + (p.percentage / 100)) / totalFiles) * 100;

          setProgress({
            stage: 'converting',
            percentage: Math.min(99, combinedPercentage),
            message: `${filePrefix}: ${p.message}`,
          });
        });

        zip.file(buildArchiveEntryName(selectedFile.name), bytes);
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      setArchiveBlob(blob);
      setDownloadName(`PDFark-Bulk-Converted-${Date.now()}.zip`);
      setProgress({
        stage: 'completed',
        percentage: 100,
        message: `Converted ${totalFiles} PDFs into a ZIP archive.`,
      });
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  const handleDownload = () => {
    if (!downloadName) return;

    const blob = archiveBlob ?? (resultBytes ? new Blob([resultBytes.buffer as ArrayBuffer], { type: 'application/pdf' }) : null);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    link.download = downloadName;

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
    setFiles([]);
    setProgress(null);
    setResultBytes(null);
    setArchiveBlob(null);
    setDownloadName(null);
  };

  // Called by "Convert Another" — resets state and immediately starts the new file
  const handleNewFile = (newFiles: File[]) => {
    setFiles([]);
    setProgress(null);
    setResultBytes(null);
    setArchiveBlob(null);
    setDownloadName(null);
    // Kick off conversion in the next tick so state clears first
    setTimeout(() => handleFilesSelect(newFiles), 0);
  };

  const isProcessing = files.length > 0;
  const isBulk = files.length > 1;
  const selectedFileName = isBulk ? `${files.length} PDF files` : files[0]?.name ?? '';

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
            <Uploader onFilesSelect={handleFilesSelect} />
          </div>
        )}

        {isProcessing && (
          <Processor
            progress={progress!}
            fileName={selectedFileName}
            fileCount={files.length}
            isBulk={isBulk}
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

