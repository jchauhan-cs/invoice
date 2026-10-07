/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
    // PDFKit reads its built-in font files at runtime; make sure Vercel ships them.
    outputFileTracingIncludes: {
      '/api/invoices/[id]/pdf': ['./node_modules/pdfkit/js/data/**/*'],
    },
  },
};

export default nextConfig;
