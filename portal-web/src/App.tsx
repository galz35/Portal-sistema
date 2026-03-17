import { RouterProvider } from "react-router-dom";

import AppErrorBoundary from "./shared/components/AppErrorBoundary";
import { router } from "./app/router";

export default function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
