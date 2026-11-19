"use client";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

type Counts = {
  categories: number;
  services: number;
  banners: number;
  sections: number;
  layoutItems: number;
};

function summary(counts: Counts) {
  return `${counts.categories} categories, ${counts.services} services, ${counts.banners} banners, ${counts.sections} homepage sections, and ${counts.layoutItems} homepage blocks`;
}

export function CatalogTransfer() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function download() {
    setBusy("export");
    setError("");
    setNotice("");
    const response = await fetch("/api/admin/catalog");

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message || "The catalog could not be exported.");
      setBusy(null);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const named = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1];
    link.href = url;
    link.download = named || "mafateeh-catalog.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Catalog file downloaded. Keep it private. It contains the store images.");
    setBusy(null);
  }

  async function upload() {
    if (!file) {
      return;
    }

    setConfirm(false);
    setBusy("import");
    setError("");
    setNotice("");
    const response = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await file.text(),
    });
    const body = (await response.json().catch(() => null)) as { message?: string; counts?: Counts } | null;
    setBusy(null);

    if (!response.ok || !body?.counts) {
      setError(body?.message || "The catalog could not be imported.");
      return;
    }

    setFile(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    setNotice(`Imported ${summary(body.counts)}.`);
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-bold text-ink">Move store content</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        Export categories, services, banners, and the homepage before a deploy, then import that file into the new database.
        Customers, orders, reviews, and passwords stay out of the file.
      </p>
      {notice ? <p className="mt-4 rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-rich">{notice}</p> : null}
      {error ? <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void download()} disabled={busy !== null}>
          <Download className="me-2 size-4" />
          {busy === "export" ? "Exporting…" : "Export catalog"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="max-w-full text-sm text-muted file:me-3 file:min-h-11 file:cursor-pointer file:rounded-full file:border-0 file:bg-canvas-muted file:px-4 file:text-sm file:font-semibold file:text-ink"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError("");
            setNotice("");
          }}
        />
        <Button type="button" variant="secondary" onClick={() => setConfirm(true)} disabled={!file || busy !== null}>
          <Upload className="me-2 size-4" />
          {busy === "import" ? "Importing…" : "Import catalog"}
        </Button>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">
        Import adds or updates the rows in the file. It does not delete categories or services that are missing from the file, so existing orders keep their services. The homepage order in the file replaces the homepage order here.
      </p>
      <ConfirmDialog
        open={confirm}
        title="Import this catalog?"
        body={file ? `${file.name} will update categories, services, banners, and the homepage on this database. Customers, orders, and reviews are not changed.` : ""}
        confirmLabel="Import"
        cancelLabel="Cancel"
        onConfirm={() => void upload()}
        onClose={() => setConfirm(false)}
      />
    </section>
  );
}
