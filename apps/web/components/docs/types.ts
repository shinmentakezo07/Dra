import type { ElementType } from "react";

export interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
}

export type TipVariant = "tip" | "warning" | "critical" | "info";
