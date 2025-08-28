import * as React from "react";

export function Header({
  title = "Admin Dashboard",
  actions,
}: {
  title?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
