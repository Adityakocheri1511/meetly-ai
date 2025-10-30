import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { MantineProvider } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { lightTheme, darkTheme } from "./theme";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import MeetingDetails from "./pages/MeetingDetails";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

// Components
import Navbar from "./components/Navbar";
import Sidebar from "./components/sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

// Contexts
import { ThemeContext } from "./context/ThemeContext";
import { UserProvider } from "./context/UserContext";

export default function App() {
  const [colorScheme, setColorScheme] = useLocalStorage({
    key: "mantine-color-scheme",
    defaultValue: "light",
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [authReady, setAuthReady] = useState(false); // ✅ wait for Firebase session

  const theme = colorScheme === "dark" ? darkTheme : lightTheme;
  const toggleColorScheme = () =>
    setColorScheme((prev) => (prev === "light" ? "dark" : "light"));

  // Auto dark mode at night
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 6) setColorScheme("dark");
  }, []);

  // ✅ Wait for Firebase to initialize before rendering routes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Smooth preloading screen while Firebase restores session
  if (!authReady) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#0f172a,#1e293b)",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          transition: "opacity 0.3s ease",
        }}
      >
        <h3>🔄 Loading Meetly.AI...</h3>
      </div>
    );
  }

  // ✅ Shared Layout (unchanged)
  const AppLayout = () => (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: theme.background,
        transition: "background 0.6s ease, color 0.6s ease",
      }}
    >
      <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
      <div
        style={{
          flex: 1,
          marginLeft: isExpanded ? "240px" : "80px",
          transition: "margin-left 0.4s ease",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Navbar />
        <main
          style={{
            flex: 1,
            padding: "2rem",
            overflowY: "auto",
            scrollBehavior: "smooth",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );

  return (
    <UserProvider>
      <ThemeContext.Provider value={{ theme, colorScheme, toggleColorScheme }}>
        <MantineProvider
          defaultColorScheme={colorScheme}
          theme={{
            fontFamily: "Inter, system-ui, sans-serif",
            headings: { fontWeight: 700 },
          }}
          withGlobalStyles
          withNormalizeCSS
        >
          <Router>
            <AnimatePresence mode="wait">
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="analyze" element={<Analyze />} />
                  <Route path="history" element={<History />} />
                  <Route path="meeting/:id" element={<MeetingDetails />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </Router>
        </MantineProvider>
      </ThemeContext.Provider>
    </UserProvider>
  );
}