import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UserRoleProvider } from "./contexts/UserRoleContext";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { onCLS, onFCP, onLCP, onTTFB } from "web-vitals";

import { HelmetProvider } from "react-helmet-async";

// Configuration DOMPurify (sécurité XSS)
import DOMPurify from "dompurify";

// Configuration globale DOMPurify
DOMPurify.setConfig({
  ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
  ALLOWED_ATTR: [],
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
});

// Performance monitoring
const reportWebVitals = (metric) => {
  // In production, send to analytics service
  console.log(metric);

  // Example: send to Google Analytics
  // gtag('event', metric.name, {
  //   event_category: 'Web Vitals',
  //   event_label: metric.id,
  //   value: Math.round(metric.value),
  //   non_interaction: true,
  // });
};

onCLS(reportWebVitals);
onFCP(reportWebVitals);
onLCP(reportWebVitals);
onTTFB(reportWebVitals);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <UserRoleProvider>
            <ThemeProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </ThemeProvider>
          </UserRoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
