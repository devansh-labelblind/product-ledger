import "./globals.css";

export const metadata = { title: "Product Ledger", description: "Product names, category codes and artwork URLs" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
