import React from "react";
import sagaLogo from "/saga logo.png";

interface HeaderProps {
  actions?: React.ReactNode;
}

export function Header({ actions }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <img
            src={sagaLogo}
            alt="SAGA Diagnostics logo"
            className="h-8 md:h-10"
            width={160}
            height={40}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Laboratory Storage System
          </p>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
