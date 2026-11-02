import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "Segoe UI, Tahoma, Arial, sans-serif",
          background: "#ffffff",
          color: "#142117",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem" }}>Page not found</h1>
          <p>الصفحة غير موجودة</p>
          <Link href="/en">Mafateeh Store</Link>
        </main>
      </body>
    </html>
  );
}
