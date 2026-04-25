// src/main.tsx
// -----------------------------------------------------------
// Root entry for the Election Vote Tracker frontend.
//
// This file sets up global providers used throughout the app:
// - React Router (routing foundation)
// - React Query (server state management & caching)
// - React Query DevTools (debugging in development)
//
// Actual routes will be created in the next steps.
// -----------------------------------------------------------

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./app/routes";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
