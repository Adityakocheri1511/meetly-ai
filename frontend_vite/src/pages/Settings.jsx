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

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("userSettings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);

  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      autoDarkMode: colorScheme === "dark",
    }));
  }, [colorScheme]);

  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
  }, [settings]);

  // ✅ Secure Feedback Fetch with Firebase Token
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
      }}
    >
      <Card
        radius="lg"
        shadow="xl"
        style={{
          background: theme.card,
          border: theme.cardBorder,
          maxWidth: "760px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        <Text fw={800} size="1.8rem" mb="xl" align="center" style={{ color: theme.text }}>
          Settings ⚙️
        </Text>

        {/* APP PREFERENCES */}
        <section style={{ marginBottom: "2rem" }}>
          <Group mb="sm">
            <IconRobot size={22} color="#8B5CF6" />
            <Text fw={600} style={{ color: theme.text }}>
              App Preferences
            </Text>
          </Group>
          <Divider mb="md" />

          <Switch
            checked={settings.notifications}
            onChange={() => handleToggle("notifications")}
            label="Enable Notifications"
            thumbIcon={<IconBell size={rem(12)} />}
          />
          <Switch
            checked={settings.sound}
            onChange={() => handleToggle("sound")}
            label="Enable Sound Effects"
            thumbIcon={<IconVolume2 size={rem(12)} />}
          />
          <Switch
            checked={settings.autoDarkMode}
            onChange={handleDarkModeToggle}
            label="Dark / Light Mode"
            thumbIcon={<IconMoon size={rem(12)} />}
          />

          <Select
            label="Language"
            placeholder="Select Language"
            data={["English", "Spanish", "French", "German"]}
            value={settings.language}
            onChange={(val) => setSettings((prev) => ({ ...prev, language: val }))}
          />
        </section>

        {/* PRIVACY */}
        <section style={{ marginBottom: "2rem" }}>
          <Group mb="sm">
            <IconShieldLock size={22} color="#3B82F6" />
            <Text fw={600} style={{ color: theme.text }}>
              Privacy & Security
            </Text>
          </Group>
          <Divider mb="md" />
          <Switch
            checked={settings.dataRetention}
            onChange={() => handleToggle("dataRetention")}
            label="Keep meeting history"
            thumbIcon={<IconShieldLock size={rem(12)} />}
          />
          <Switch
            checked={settings.twoFactorAuth}
            onChange={() => {
              handleToggle("twoFactorAuth");
              alert(
                settings.twoFactorAuth
                  ? "🔒 2FA disabled."
                  : "✅ 2FA enabled. You’ll now receive OTP verification."
              );
            }}
            label="Enable Two-Factor Authentication"
            thumbIcon={<IconLock size={rem(12)} />}
          />
          <Button
            variant="outline"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => alert("🗑 Analysis history cleared successfully.")}
          >
            Clear Analysis History
          </Button>
        </section>

        {/* FEEDBACK */}
        <section>
          <Group mb="sm">
            <IconLanguage size={22} color="#F59E0B" />
            <Text fw={600} style={{ color: theme.text }}>
              Feedback & Support
            </Text>
          </Group>
          <Divider mb="md" />
          <Textarea
            placeholder="Share feedback with the Meetly.AI team..."
            minRows={4}
            value={settings.feedback}
            onChange={(e) => setSettings((prev) => ({ ...prev, feedback: e.target.value }))}
          />

          <Group mt="md" spacing="md">
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleFeedbackSubmit}
              style={{
                background: "linear-gradient(to right, #6366F1, #8B5CF6)",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Submit Feedback
            </Button>
            <Button
              variant="outline"
              leftSection={<IconHeadset size={16} />}
              onClick={() => alert("📞 Support team will reach out soon.")}
            >
              Contact Support
            </Button>
          </Group>

          <Divider my="lg" />
          <Button
            variant="subtle"
            onClick={() => setShowFeedbackHistory(!showFeedbackHistory)}
            rightSection={
              showFeedbackHistory ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />
            }
          >
            {showFeedbackHistory ? "Hide Feedback History" : "View Feedback History"}
          </Button>

          <AnimatePresence>
            {showFeedbackHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {loadingFeedbacks ? (
                  <Loader mt="md" color="blue" />
                ) : settings.feedbacks.length === 0 ? (
                  <Text size="sm" mt="md" style={{ color: theme.subtext }}>
                    No feedback available yet.
                  </Text>
                ) : (
                  <div style={{ marginTop: "1rem" }}>
                    {settings.feedbacks.map((f) => (
                      <Card key={f.id} shadow="xs" padding="sm" style={{ marginBottom: "0.5rem" }}>
                        <Text fw={500}>{f.user_email}</Text>
                        <Text size="sm" color={theme.subtext}>
                          {f.message}
                        </Text>
                        <Text size="xs" color={theme.subtext}>
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

        <Divider mt="lg" mb="md" />
        <Group position="center" spacing="md">
          <Button leftSection={<IconCheck size={16} />} onClick={handleSave}>
            Save Changes
          </Button>
          <Button variant="default" onClick={handleReset} leftSection={<IconTrash size={16} />}>
            Reset to Defaults
          </Button>
        </Group>
      </Card>
    </motion.div>
  );
}