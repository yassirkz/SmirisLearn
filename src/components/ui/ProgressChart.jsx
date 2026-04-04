import { lazy, Suspense } from "react";
import LoadingSpinner from "./LoadingSpinner";

// Lazy load the chart component
const ProgressChartComponent = lazy(() => import("./ProgressChartImpl"));

export default function ProgressChart({ data }) {
  return (
    <Suspense fallback={<LoadingSpinner size="sm" />}>
      <ProgressChartComponent data={data} />
    </Suspense>
  );
}
