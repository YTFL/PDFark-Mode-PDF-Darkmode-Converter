# **App Name**: PDFark Mode

## Core Features:

- PDF Upload Interface: User interface for uploading PDF files, including drag-and-drop functionality and file selection.
- Client-Side PDF Parsing: Uses 'pdfjs-dist' to load and parse the uploaded PDF for extracting content and image bounding box data entirely within the browser.
- Double-Difference Dark Mode Conversion: Applies the specified 'Double-Difference' blending algorithm using 'pdf-lib' to convert PDF content to dark mode while preserving original image colors, executed entirely on the client-side.
- Image Coordinate Mapping: Handles the complex mapping and translation of image coordinates between 'pdfjs-dist' (top-left origin) and 'pdf-lib' (bottom-left origin) for precise image re-inversion.
- Result Download: Programmatically triggers the download of the converted dark mode PDF as a Blob to the user's local machine.

## Style Guidelines:

- The application is designed for a strict 'Amoled Black Mode' with no theme switching. The primary background is pure black (#000000). A vivid and professional cyan-blue (#4AC2EA) serves as the primary color, designed to stand out crisply against the deep black background and guide user interaction.
- A secondary light blue (#ADD8E6) is used for interactive elements and secondary information, providing clear distinction against the primary colors without overwhelming the minimalist aesthetic.
- An accent color of soft lavender (#D5D5FF) is used for subtle highlights and complementary elements, offering visual interest without being distracting, while maintaining high contrast.
- Body and headline font: 'Inter', a modern sans-serif typeface, providing excellent legibility and a clean, technical aesthetic that suits document processing applications.
- Clean, outlined system icons for actions such as file upload, processing status, and download, maintaining a professional and intuitive user experience consistent with the app's functional nature.
- A minimalist and focused layout centered around the core task of PDF processing. This includes a prominent drag-and-drop area for file uploads and a clear status display during conversion. Emphasis on ample negative space to improve readability and reduce cognitive load.
- Subtle loading animations and transition effects will provide clear visual feedback during PDF processing, enhancing perceived performance and user engagement without being overly distracting.
