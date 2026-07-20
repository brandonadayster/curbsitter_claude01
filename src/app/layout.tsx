import './globals.css';

export const metadata = {
  title: 'CurbSitter Client Portal',
  description: 'Premium hands-free curb service with absolute peace of mind.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9F9F6] selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}
