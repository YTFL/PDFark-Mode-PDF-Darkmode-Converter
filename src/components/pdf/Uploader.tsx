
"use client";

import React, { useState, useCallback } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface UploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    setError(null);
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }, [disabled, onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "pdf-drop-zone h-64 rounded-3xl flex flex-col items-center justify-center cursor-pointer p-8 group",
          isDragging && "active",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled}
        />
        
        <div className="relative mb-4">
          <Upload className={cn(
            "w-12 h-12 transition-all duration-300",
            isDragging ? "text-primary scale-110" : "text-muted-foreground group-hover:text-primary"
          )} />
        </div>
        
        <h3 className="text-xl font-semibold mb-2 text-white">
          {isDragging ? "Drop your PDF here" : "Upload PDF"}
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          Drag and drop or click to browse files
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
