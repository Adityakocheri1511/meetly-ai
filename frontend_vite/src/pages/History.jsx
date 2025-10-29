import React, { useState, useEffect, useContext } from "react";
import { Card, Text, Group, Button, Loader, Badge } from "@mantine/core";
import { ThemeContext } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { IconClock, IconFileText, IconChevronRight } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/apiClient";
import { UserContext } from "../context/UserContext";
import { getIdToken } from "firebase/auth";
import { auth } from "../firebase";

export default function History() {
  const { theme, colorScheme } = useContext(ThemeContext);
  const { user } = useContext(UserContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    if (!user) return; // wait until Firebase context is ready
  
    let isMounted = true;
  
    async function fetchMeetings() {
      setLoading(true);
      try {
        // ✅ Wait for token refresh to avoid expired 401s
        const token = await getIdToken(auth.currentUser, true);
  
        const res = await fetch(`${API_BASE}/api/v1/meetings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
  
        if (!res.ok) {
          if (res.status === 401) {
            console.warn("⚠️ Unauthorized — token might be invalid/expired");
          }
          throw new Error(`Failed to fetch meetings (${res.status})`);
        }
  
        const data = await res.json();
        if (isMounted) setMeetings(data.meetings || []);
      } catch (err) {
        console.error("❌ Error fetching meetings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
  
    fetchMeetings();
    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
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
      <Text fw={700} size="2rem" mb="sm" style={{ color: theme.text }}>
        Meeting History
      </Text>
      <Text fw={700} size="1.6rem" style={{ color: theme.text }}>
        {user ? `Your Meetings, ${user.displayName || user.name}` : "Meeting History"}
      </Text>
      <Text size="sm" mb="md" style={{ color: theme.subtext }}>
        View all your AI-generated summaries and insights here.
      </Text>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "4rem",
          }}
        >
          <Loader color="blue" />
        </div>
      ) : meetings.length === 0 ? (
        <Text align="center" style={{ color: theme.subtext, marginTop: "3rem" }}>
          No meeting records found. Try analyzing one!
        </Text>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginTop: "1.5rem",
          }}
        >
          {meetings.map((meeting, i) => (
            <motion.div
              key={meeting.id}
              whileHover={{ scale: 1.03, y: -3 }}
              transition={{ duration: 0.25 }}
            >
              <Card
                radius="lg"
                shadow="sm"
                style={{
                  background: theme.card,
                  border: theme.cardBorder,
                  backdropFilter: "blur(15px)",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "220px",
                  boxShadow: isDark
                    ? "0 6px 20px rgba(255,255,255,0.05)"
                    : "0 8px 24px rgba(0,0,0,0.08)",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Header */}
                <Group position="apart" mb="xs" align="flex-start">
                  <Group spacing="xs">
                    <IconFileText size={18} color="#6366F1" />
                    <Text fw={600} style={{ color: theme.text }}>
                      {meeting.title || "Untitled Meeting"}
                    </Text>
                  </Group>
                  <Badge
                    color="violet"
                    variant="light"
                    style={{
                      background: isDark
                        ? "rgba(139,92,246,0.2)"
                        : "rgba(139,92,246,0.08)",
                      fontWeight: 600,
                    }}
                  >
                    {new Date(meeting.created_at).toLocaleDateString()}
                  </Badge>
                </Group>

                {/* Summary Preview */}
                <Text
                  size="sm"
                  style={{
                    color: theme.subtext,
                    marginBottom: "0.75rem",
                    lineHeight: 1.5,
                    minHeight: "48px",
                  }}
                >
                  {meeting.summary_preview?.length > 0
                    ? meeting.summary_preview.join(" • ")
                    : "No summary available."}
                </Text>

                {/* Meta Info */}
                <Group spacing="xs" style={{ color: theme.subtext }}>
                  <IconClock size={16} />
                  <Text size="xs">
                    {new Date(meeting.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </Group>

                {/* Footer */}
                <Button
                  rightSection={<IconChevronRight size={18} />}
                  mt="md"
                  variant="gradient"
                  gradient={{ from: "#6366F1", to: "#8B5CF6", deg: 45 }}
                  style={{
                    alignSelf: "flex-end",
                    fontWeight: 600,
                    color: "#fff",
                    boxShadow:
                      "0 4px 16px rgba(99,102,241,0.3), 0 2px 8px rgba(0,0,0,0.08)",
                  }}
                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                >
                  View Details
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}