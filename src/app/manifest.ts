import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'PDFark Mode - Amoled PDF Dark Mode Converter',
        short_name: 'PDFark Mode',
        description: 'Convert your PDFs to a professional dark theme instantly and securely in your browser.',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
            {
                src: '/favicon.ico',
                sizes: '192x192 512x512 any',
                type: 'image/x-icon',
            },
        ],
    };
}
