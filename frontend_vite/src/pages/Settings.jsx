import { API_BASE } from "../config/apiClient";
import React, { useContext, useState, useEffect } from "react";
import {
  Card,
  Text,
  Switch,
  Divider,
  Button,
  Group,
  Select,
  rem,
  Textarea,
  Loader,
} from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBell,
  IconMoon,
  IconVolume2,
  IconShieldLock,
  IconTrash,
  IconLanguage,
  IconCheck,
  IconRobot,
  IconLock,
  IconSend,
  IconHeadset,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { ThemeContext } from "../context/ThemeContext";
import { auth } from "../firebase";
import { getIdToken } from "firebase/auth";

export default function Settings() {
  const { theme, colorScheme, toggleColorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === "dark";

  // Default Settings
  const defaultSettings = {
    notifications: true,
    sound: false,
    autoDarkMode: colorScheme === "dark",
    language: "English",
    dataRetention: true,
    twoFactorAuth: false,
    aiModel: "Gemini 2.5 Flash",
    feedback: "",
    feedbacks: [],
  };

  // Load from localStorage
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("userSettings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);

  // Sync with color scheme
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      autoDarkMode: colorScheme === "dark",
    }));
  }, [colorScheme]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
  }, [settings]);

  // ✅ Fetch Feedbacks securely using Firebase Token
  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        if (!auth.currentUser) return;
        const token = await getIdToken(auth.currentUser, true);
        const res = await fetch(`${API_BASE}/api/v1/feedbacks`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        setSettings((prev) => ({ ...prev, feedbacks: data }));
      } catch (err) {
        console.error("❌ Error fetching feedbacks:", err);
      } finally {
        setLoadingFeedbacks(false);
      }
    }
    fetchFeedbacks();
  }, []);

  // Toggles
  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDarkModeToggle = () => {
    toggleColorScheme();
    setSettings((prev) => ({
      ...prev,
      autoDarkMode: colorScheme !== "dark",
    }));
  };

  // Save / Reset
  const handleSave = () => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
    alert("✅ Preferences saved successfully!");
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("userSettings");
    alert("⚙️ Settings reset to defaults.");
  };

  // ✅ Feedback Submit with Auth Header
  const handleFeedbackSubmit = async () => {
    if (!settings.feedback.trim()) {
      alert("✏️ Please enter your feedback before submitting.");
      return;
    }

    try {
      if (!auth.currentUser) throw new Error("User not authenticated");
      const token = await getIdToken(auth.currentUser, true);
      const user = JSON.parse(localStorage.getItem("user"));

      const response = await fetch(`${API_BASE}/api/v1/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_email: user?.email || "anonymous",
          message: settings.feedback,
        }),
      });

      if (!response.ok) throw new Error("Failed to send feedback");

      alert("✅ Feedback submitted successfully!");
      setSettings((prev) => ({ ...prev, feedback: "" }));
    } catch (error) {
      console.error("Feedback submission error:", error);
      alert("❌ Something went wrong while sending feedback.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: theme.background,
        color: theme.text,
        transition: "all 0.4s ease",
      }}
    >
      <Card
        radius="lg"
        shadow="xl"
        style={{
          background: theme.card,
          border: theme.cardBorder,
          backdropFilter: "blur(15px)",
          maxWidth: "760px",
          margin: "0 auto",
          padding: "2rem",
          transition: "all 0.3s ease",
        }}
      >
        <Text
          fw={800}
          size="1.8rem"
          mb="xl"
          align="center"
          style={{
            color: theme.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          Settings <span style={{ filter: "grayscale(100%)" }}>⚙️</span>
        </Text>

        {/* === APP PREFERENCES === */}
        <section style={{ marginBottom: "2rem" }}>
          <Group mb="sm">
            <IconRobot size={22} color="#8B5CF6" />
            <Text fw={600} style={{ color: theme.text }}>
              App Preferences
            </Text>
          </Group>
          <Divider mb="md" />

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Switch
              checked={settings.notifications}
              onChange={() => handleToggle("notifications")}
              label="Enable Notifications"
              thumbIcon={<IconBell size={rem(12)} />}
              styles={{
                label: { color: theme.text },
                track: { background: theme.sidebarHover },
              }}
            />

            <Switch
              checked={settings.sound}
              onChange={() => handleToggle("sound")}
              label="Enable Sound Effects"
              thumbIcon={<IconVolume2 size={rem(12)} />}
              styles={{
                label: { color: theme.text },
                track: { background: theme.sidebarHover },
              }}
            />

            <Switch
              checked={settings.autoDarkMode}
              onChange={handleDarkModeToggle}
              label="Dark / Light Mode"
              thumbIcon={<IconMoon size={rem(12)} />}
              styles={{
                label: { color: theme.text },
                track: { background: theme.sidebarHover },
              }}
            />

            <Select
              label="Language"
              placeholder="Select Language"
              data={["English", "Spanish", "French", "German"]}
              value={settings.language}
              onChange={(val) =>
                setSettings((prev) => ({ ...prev, language: val }))
              }
              styles={{
                label: { color: theme.subtext },
                input: {
                  background: theme.card,
                  color: theme.text,
                  border: theme.cardBorder,
                },
              }}
            />
          </div>
        </section>

        {/* === PRIVACY & SECURITY === */}
        <section style={{ marginBottom: "2rem" }}>
          <Group mb="sm">
            <IconShieldLock size={22} color="#3B82F6" />
            <Text fw={600} style={{ color: theme.text }}>
              Privacy & Security
            </Text>
          </Group>
          <Divider mb="md" />

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Switch
              checked={settings.dataRetention}
              onChange={() => handleToggle("dataRetention")}
              label="Keep meeting history and insights"
              thumbIcon={<IconShieldLock size={rem(12)} />}
              styles={{
                label: { color: theme.text },
                track: { background: theme.sidebarHover },
              }}
            />

            <Switch
              checked={settings.twoFactorAuth}
              onChange={() => {
                handleToggle("twoFactorAuth");
                alert(
                  settings.twoFactorAuth
                    ? "🔒 Two-factor authentication disabled."
                    : "✅ Two-factor authentication enabled."
                );
              }}
              label="Enable Two-Factor Authentication"
              thumbIcon={<IconLock size={rem(12)} />}
              styles={{
                label: { color: theme.text },
                track: { background: theme.sidebarHover },
              }}
            />

            <Button
              variant="outline"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => alert("🗑 Analysis history cleared successfully.")}
              style={{
                borderColor: "#EF4444",
                color: "#EF4444",
                fontWeight: 600,
              }}
            >
              Clear Analysis History
            </Button>
          </div>
        </section>

        {/* === FEEDBACK / SUPPORT === */}
        <section>
          <Group mb="sm">
            <IconLanguage size={22} color="#F59E0B" />
            <Text fw={600} style={{ color: theme.text }}>
              Feedback / Support
            </Text>
          </Group>
          <Divider mb="md" />

          <Textarea
            placeholder="Share feedback with the Meetly.AI team..."
            minRows={4}
            value={settings.feedback}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, feedback: e.target.value }))
            }
            styles={{
              input: {
                background: theme.card,
                color: theme.text,
                border: theme.cardBorder,
              },
            }}
          />

          <Group mt="md" spacing="md">
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleFeedbackSubmit}
              style={{
                background: "linear-gradient(to right, #6366F1, #8B5CF6)",
                color: "#fff",
                fontWeight: 600,
                boxShadow: "0 5px 15px rgba(99,102,241,0.3)",
              }}
            >
              Submit Feedback
            </Button>

            <Button
              variant="outline"
              leftSection={<IconHeadset size={16} />}
              onClick={() => alert("📞 Support team will reach out soon.")}
              style={{
                borderColor: theme.accent,
                color: theme.accent,
                fontWeight: 600,
              }}
            >
              Contact Support
            </Button>
          </Group>

          <Divider my="lg" />
          <Button
            variant="subtle"
            color="blue"
            rightSection={
              showFeedbackHistory ? (
                <IconChevronUp size={16} />
              ) : (
                <IconChevronDown size={16} />
              )
            }
            onClick={() => setShowFeedbackHistory(!showFeedbackHistory)}
          >
            {showFeedbackHistory
              ? "Hide Feedback History"
              : "View Feedback History"}
          </Button>

          <AnimatePresence>
            {showFeedbackHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {loadingFeedbacks ? (
                  <Loader mt="md" color="blue" />
                ) : settings.feedbacks.length === 0 ? (
                  <Text size="sm" mt="md" style={{ color: theme.subtext }}>
                    No feedback available yet.
                  </Text>
                ) : (
                  <div
                    style={{
                      marginTop: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {settings.feedbacks.map((f) => (
                      <Card
                        key={f.id}
                        shadow="xs"
                        padding="sm"
                        style={{
                          background: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.03)",
                          borderRadius: "10px",
                        }}
                      >
                        <Text size="sm" fw={500} style={{ color: theme.text }}>
                          {f.user_email}
                        </Text>
                        <Text size="sm" style={{ color: theme.subtext }}>
                          {f.message}
                        </Text>
                        <Text
                          size="xs"
                          style={{
                            color: theme.subtext,
                            marginTop: "4px",
                            fontStyle: "italic",
                          }}
                        >
                          {new Date(f.created_at).toLocaleString()}
                        </Text>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Save / Reset */}
        <Divider mb="lg" />
        <Group position="center" spacing="md">
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={handleSave}
            style={{
              background: "linear-gradient(to right, #6366F1, #8B5CF6)",
              color: "#fff",
              fontWeight: 600,
              boxShadow: "0 5px 15px rgba(99,102,241,0.3)",
              padding: "0.6rem 1.5rem",
            }}
          >
            Save Changes
          </Button>

          <Button
            variant="default"
            onClick={handleReset}
            leftSection={<IconTrash size={16} />}
            style={{
              border: theme.cardBorder,
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.02)",
              color: theme.subtext,
              fontWeight: 600,
            }}
          >
            Reset to Defaults
          </Button>
        </Group>
      </Card>
    </motion.div>
  );
}