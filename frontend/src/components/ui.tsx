import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
}

export function StatCard({ label, value, sub, trend, icon }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className={`stat-value ${trend || ""}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

interface DataTableProps {
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, ReactNode>[];
  emptyMessage?: string;
}

export function DataTable({ columns, rows, emptyMessage }: DataTableProps) {
  if (rows.length === 0) {
    return <div className="empty-state">{emptyMessage || "No data available"}</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === "right" ? "text-right" : ""}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === "right" ? "text-right" : ""}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <span>Loading data from Kite Connect...</span>
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "buy" | "sell" | "complete" | "open" | "cancelled";
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
