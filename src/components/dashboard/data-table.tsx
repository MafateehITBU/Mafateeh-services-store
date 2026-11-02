import { EmptyState } from "@/components/dashboard/empty-state";
import type { ReactNode } from "react";

export type DataColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyTitle,
  emptyBody,
  tableClassName = "min-w-[36rem]",
}: {
  columns: DataColumn<T>[];
  rows: T[];
  emptyTitle: string;
  emptyBody: string;
  tableClassName?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-sm ${tableClassName}`}>
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold text-muted">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 align-middle text-ink">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
