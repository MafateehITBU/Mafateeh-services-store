import { PayloadTooLargeError, CATALOG_BYTES, readTextLimited, payloadTooLargeResponse } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { importCatalog, exportCatalog, CatalogTransferError } from "@/server/admin/catalog-transfer";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";

function failure(error: unknown) {
  if (error instanceof PayloadTooLargeError) {
    return payloadTooLargeResponse();
  }

  if (error instanceof CatalogTransferError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }

  console.error("catalog_transfer_failed");
  return Response.json({ error: "request_failed", message: "The catalog could not be transferred." }, { status: 500 });
}

export async function GET() {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    const catalog = await exportCatalog();
    const day = catalog.exportedAt.slice(0, 10);

    return new Response(JSON.stringify(catalog), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mafateeh-catalog-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    const counts = await importCatalog(access.user.id, await readTextLimited(request, CATALOG_BYTES));
    return Response.json({ ok: true, counts });
  } catch (error) {
    return failure(error);
  }
}
