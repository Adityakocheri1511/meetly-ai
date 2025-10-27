import React, { useState, useEffect, useContext } from "react";
import { Card, Text, Group, Button, Loader, Badge } from "@mantine/core";
import { ThemeContext } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { IconClock, IconFileText, IconChevronRight } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export default function History() {
  const { theme } = useContext(ThemeContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/meetings`);
        if (!res.ok) throw new Error("Failed to fetch meetings");
        const data = await res.json();
        setMeetings(data.meetings || []);
      } catch (err) {
        console.error("❌ Error fetching meetings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  return (
    <div
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
      <Text size="sm" mb="md" style={{ color: theme.subtext }}>
        View summaries of all analyzed meetings.
      </Text>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}>
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
          }}
        >
          {meetings.map((meeting, i) => (
            <motion.div
              key={meeting.id}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                radius="lg"
                shadow="md"
                style={{
                  background: theme.card,
                  border: theme.cardBorder,
                  backdropFilter: "blur(15px)",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <Group position="apart" mb="xs">
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
                        background:
                          theme.colorScheme === "dark"
                            ? "rgba(139,92,246,0.2)"
                            : "rgba(139,92,246,0.1)",
                      }}
                    >
                      {new Date(meeting.created_at).toLocaleDateString()}
                    </Badge>
                  </Group>

                  <Text size="sm" style={{ color: theme.subtext, marginBottom: "0.75rem" }}>
                    {meeting.summary_preview?.length > 0
                      ? meeting.summary_preview.join(" • ")
                      : "No summary available."}
                  </Text>

                  <Group spacing="xs" style={{ color: theme.subtext }}>
                    <IconClock size={16} />
                    <Text size="xs">
                      {new Date(meeting.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Group>
                </div>

                <Button
                  rightSection={<IconChevronRight size={18} />}
                  mt="md"
                  variant="light"
                  style={{
                    alignSelf: "flex-end",
                    background: theme.accent,
                    color: "#fff",
                    fontWeight: 600,
                    marginTop: "1rem",
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
    </div>
  );
}