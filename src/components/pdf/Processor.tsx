
"use client";

import React, { useRef } from 'react';

import { ProcessingProgress } from '@/lib/pdf-processor';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Loader2 as Loader2Icon } from 'lucide-react';

const PDFViewer = dynamic(
  () => import('./PDFViewer').then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground bg-[#0d0d0d]">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading viewer…</p>
      </div>
    ),
  }
);

interface ProcessorProps {
  progress: ProcessingProgress;
  onDownload: () => void;
  onReset: () => void;
  onNewFile: (file: File) => void;
  fileName: string;
  resultBytes: Uint8Array | null;
}


export const Processor: React.FC<ProcessorProps> = ({ progress, onDownload, onReset, onNewFile, fileName, resultBytes }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCompleted = progress.stage === 'completed';
  const isError = progress.stage === 'error';
  const isProcessing = progress.stage === 'parsing' || progress.stage === 'converting';

  const handleConvertAnother = () => {
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onNewFile(f);
  };

  return (
    <>
      {/* Hidden file picker — triggered programmatically by Convert Another */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full transition-all duration-500 ease-in-out",
          isCompleted ? "" : "max-w-2xl mx-auto"
        )}
      >
        <div className={cn(
          "grid gap-5 lg:gap-8",
          isCompleted ? "lg:grid-cols-[400px_1fr]" : "grid-cols-1"
        )}>
          {/* Status Card */}
          <div className="flex flex-col gap-6 min-w-0">
            <div className="p-5 sm:p-8 rounded-3xl bg-card border border-border shadow-2xl h-fit">
              <div className="flex items-center gap-3 w-full pb-4 border-b border-border">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className={`w-5 h-5 ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">PDF Document</p>
                </div>
              </div>

              <div className="w-full text-center mt-6">
                {isProcessing && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-center gap-3 text-primary font-medium">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-lg">{progress.message}</span>
                    </div>
                    <Progress value={progress.percentage} className="h-3" />
                    <p className="text-sm text-muted-foreground">{Math.round(progress.percentage)}% complete</p>
                  </div>
                )}

                {isCompleted && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold text-white">Conversion Ready</h3>
                      <p className="text-muted-foreground text-sm">Professional Amoled theme applied.</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                      <Button
                        onClick={onDownload}
                        className="w-full h-12 rounded-xl text-lg font-semibold bg-primary hover:bg-primary/90 text-black transition-all active:scale-95"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleConvertAnother}
                        className="w-full h-12 rounded-xl border-border hover:bg-muted font-semibold transition-all"
                      >
                        <RefreshCcw className="w-5 h-5 mr-2" />
                        Convert Another
                      </Button>
                    </div>
                  </div>
                )}

                {isError && (
                  <div className="space-y-6 py-4">
                    <div className="flex flex-col items-center gap-2 text-destructive">
                      <AlertCircle className="w-12 h-12 mb-2" />
                      <h3 className="text-xl font-bold">Processing Error</h3>
                      <p className="text-sm opacity-80">{progress.message}</p>
                    </div>
                    <Button onClick={onReset} variant="outline" className="w-full h-12 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <AnimatePresence>
            {isCompleted && resultBytes && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="overflow-hidden rounded-3xl border border-border shadow-2xl flex flex-col min-w-0"
                style={{ height: 'calc(100vh - 100px)', minHeight: '400px' }}
              >
                <PDFViewer data={resultBytes} className="rounded-3xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};
