import React from "react";
import { useAuthStore } from "../auth/store";
import ManagerAnalytics from "./analytics/ManagerAnalytics";
import SalesAnalytics from "./analytics/SalesAnalytics";

export default function Analytics() {
  // ✅ Always call hooks at the top level (never inside if/return)
  const user = useAuthStore((s) => s.user);

  // Render-only branching is OK (no hooks inside this component besides the above)
  if (!user) return null;

  return user.role === "MANAGER" ? <ManagerAnalytics /> : <SalesAnalytics />;
}