
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, BlendMode } from 'pdf-lib';

// Setting up the worker for pdfjs-dist
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ProcessingProgress {
  stage: 'parsing' | 'converting' | 'completed' | 'error';
  percentage: number;
  message: string;
}

export interface ImageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Phase 1: Coordinate Extraction (pdfjs-dist)
 */
async function extractImageBoundingBoxes(pdfData: ArrayBuffer): Promise<ImageBox[][]> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData.slice(0),
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const imageBoxesByPage: ImageBox[][] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();
    const boxes: ImageBox[] = [];

    let lastTransform = [1, 0, 0, 1, 0, 0];

    for (let j = 0; j < ops.fnArray.length; j++) {
      const fn = ops.fnArray[j];
      const args = ops.argsArray[j];

      if (fn === pdfjsLib.OPS.transform) {
        lastTransform = args;
      } else if (fn === pdfjsLib.OPS.paintImageXObject || fn === (pdfjsLib.OPS as any).paintJpegXObject) {
        // [scaleX, skewY, skewX, scaleY, translateX, translateY]
        boxes.push({
          width: Math.abs(lastTransform[0]),
          height: Math.abs(lastTransform[3]),
          x: lastTransform[4],
          y: lastTransform[5]
        });
      }
    }
    imageBoxesByPage.push(boxes);
  }

  return imageBoxesByPage;
}

/**
 * Phase 2: Color Manipulation (pdf-lib) - Robust Flattening + Double-Difference Inversion
 */
export async function convertPdfToDarkTheme(
  file: File,
  onProgress: (progress: ProcessingProgress) => void
): Promise<Uint8Array> {
  try {
    onProgress({ stage: 'parsing', percentage: 10, message: 'Reading document...' });
    const arrayBuffer = await file.arrayBuffer();

    onProgress({ stage: 'parsing', percentage: 30, message: 'Analyzing layout...' });
    const imageBoxesByPage = await extractImageBoundingBoxes(arrayBuffer.slice(0));

    onProgress({ stage: 'converting', percentage: 50, message: 'Preparing conversion...' });

    // 1. Load the original document
    const origDoc = await PDFDocument.load(arrayBuffer);

    // 2. Create a brand new, empty PDF document for flattening
    const newDoc = await PDFDocument.create();

    // 3. Embed all pages from original into new doc
    const originalPages = origDoc.getPages();
    const embeddedPages = await newDoc.embedPages(originalPages);

    // 4. Process each page
    for (let i = 0; i < embeddedPages.length; i++) {
      const embeddedPage = embeddedPages[i];
      const originalPage = originalPages[i];
      const { width, height } = originalPage.getSize();
      const pageImageBoxes = imageBoxesByPage[i] || [];

      // Add a fresh blank page
      const page = newDoc.addPage([width, height]);

      // STAGE 1: FLATTENING
      // Draw a solid white rectangle to provide a base for inversion
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(1, 1, 1),
        blendMode: BlendMode.Normal,
      });

      // Draw original content on top of white base
      page.drawPage(embeddedPage, {
        x: 0,
        y: 0,
        width,
        height,
      });

      // STAGE 2: INVERSION
      // Global Difference layer to flip colors (White -> Black, Black -> White)
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(1, 1, 1),
        blendMode: BlendMode.Difference,
      });

      // STAGE 3: IMAGE RESTORATION
      // Apply Difference again on image areas to restore original colors
      for (const box of pageImageBoxes) {
        page.drawRectangle({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          color: rgb(1, 1, 1),
          blendMode: BlendMode.Difference,
        });
      }

      onProgress({
        stage: 'converting',
        percentage: 50 + ((i + 1) / embeddedPages.length) * 45,
        message: `Processing page ${i + 1}...`
      });
    }

    onProgress({ stage: 'converting', percentage: 98, message: 'Finalizing document...' });
    const pdfBytes = await newDoc.save();

    onProgress({ stage: 'completed', percentage: 100, message: 'Dark mode applied!' });
    return pdfBytes;
  } catch (error: any) {
    console.error("PDF Processing Error:", error);
    onProgress({
      stage: 'error',
      percentage: 0,
      message: error.message || 'Failed to process PDF.'
    });
    throw error;
  }
}
