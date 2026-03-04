# Technical Details: PDFark-Mode

**Website**: [https://pdfark-mode.vercel.app/](https://pdfark-mode.vercel.app/)

This document contains technical details, technology stack information, and developer setup instructions for PDFark-Mode.

## Tech Stack

The application is built using modern web development tools:

- **Framework**: [Next.js](https://nextjs.org/) (App Router paradigm)
- **UI Library**: [React](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **PDF Manipulation**: [pdf-lib](https://pdf-lib.js.org/) and [pdfjs-dist](https://mozilla.github.io/pdf.js/)
- **Language**: TypeScript

## Getting Started Locally

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need the following installed on your local environment:
- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/PDFark-Mode.git
   ```

2. Navigate to the project directory:
   ```bash
   cd PDFark-Mode
   ```

3. Install dependencies using your preferred package manager:
   ```bash
   npm install
   ```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port specified in your terminal) with your browser to see the app running locally. The page will auto-update as you edit files, mainly `src/app/page.tsx` and `src/components/pdf/*`.

## Architecture & Implementation Overview

- **Conversion Logic**: The conversion of bright PDFs to a dark theme is strictly client-side. The app parses the PDF properties directly in the user's browser via `pdf-lib` and updates stroke, fill, and annotation colors to match a dark interface.
- **Client-Side Processing**: No servers are employed to process the files. This relies entirely on browser engines.
- **UI Theme Configuration**: The application leverages custom CSS variables managed by Tailwind utilities. Theming tokens like backgrounds and primary/accent colors map directly to Next.js setup within `tailwind.config.ts`.
