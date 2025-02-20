import "@/app/globals.css";

export const metadata = {
  title: "Blood Report Parser",
  description: "Upload and analyze your blood report effortlessly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  );
}
