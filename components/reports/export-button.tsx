"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton() {
  return (
    <Button variant="outline" asChild>
      <a href="/api/reports/export" download>
        <Download /> Export CSV
      </a>
    </Button>
  );
}
