import React, { useState, useContext, useEffect } from "react";
import {
  Card,
  Group,
  Button,
  Textarea,
  Text,
  FileButton,
  Loader,
} from "@mantine/core";
import {
  IconUpload,
  IconEdit,
  IconListCheck,
  IconTargetArrow,
} from "@tabler/icons-react";
import { ThemeContext } from "../context/ThemeContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { motion } from "framer-motion";

export default function Analyze() {
  const { theme } = useContext(ThemeContext);
  const [mode, setMode] = useState("upload");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  // 🧠 Persist results across theme toggles
  useEffect(() => {
    const saved = localStorage.getItem("analyze_results");
    if (saved) setResults(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (results) localStorage.setItem("analyze_results", JSON.stringify(results));
  }, [results]);

  // Pie hover handlers
  const onPieEnter = (_, index) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(null);

  // Handle backend call
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const payload = {
        transcript:
          mode === "upload" && file ? await file.text() : text,
        title: "AI Meeting Summary",
        date: new Date().toISOString().split("T")[0],
      };

      const res = await fetch(`${API_BASE}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Analysis request failed");
      const data = await res.json();

      setResults({
        summary: data.summary || [],
        action_items: data.action_items || [],
        decisions: data.decisions || [],
        sentiment: data.sentiment || {},
      });

      console.log("✅ AI Insights:", data);
    } catch (err) {
      console.error("❌ AI Analysis error:", err);
      alert("Failed to analyze transcript. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sentiment Chart Data
  const sentimentData = results
    ? [
        { name: "Positive", value: results.sentiment?.positive || 70, color: "#22C55E" },
        { name: "Neutral", value: results.sentiment?.neutral || 20, color: "#FACC15" },
        { name: "Negative", value: results.sentiment?.negative || 10, color: "#EF4444" },
      ]
    : [];

  // Tooltip style
  const getTooltipStyle = () => ({
    background:
      theme.colorScheme === "dark"
        ? "rgba(30,41,59,0.9)"
        : "rgba(255,255,255,0.9)",
    border: theme.cardBorder,
    borderRadius: "10px",
    color: theme.text,
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: theme.background,
        color: theme.text,
        transition: "all 0.3s ease",
      }}
    >
      {/* Page Header */}
      <Text fw={700} size="2rem" mb="sm" style={{ color: theme.text }}>
        AI Meeting Analysis
      </Text>
      <Text size="sm" mb="md" style={{ color: theme.subtext }}>
        Upload or paste a meeting transcript to generate AI insights.
      </Text>

      {/* Upload / Paste Card */}
      <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.3 }}>
        <Card
          radius="lg"
          shadow="md"
          style={{
            background: theme.card,
            border: theme.cardBorder,
            backdropFilter: "blur(15px)",
            marginBottom: "2rem",
          }}
        >
          <Group mb="md">
            <Button
              variant={mode === "upload" ? "filled" : "default"}
              onClick={() => setMode("upload")}
              leftSection={<IconUpload size={18} />}
            >
              Upload
            </Button>
            <Button
              variant={mode === "paste" ? "filled" : "default"}
              onClick={() => setMode("paste")}
              leftSection={<IconEdit size={18} />}
            >
              Paste
            </Button>
          </Group>

          {mode === "upload" ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <FileButton onChange={setFile} accept=".txt,.md,.docx,.pdf">
                {({ onClick }) => <Button onClick={onClick}>Choose file</Button>}
              </FileButton>
              <Text size="sm" style={{ color: theme.subtext }}>
                {file ? `Selected: ${file.name}` : "No file selected"}
              </Text>
            </div>
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              minRows={8}
              placeholder="Paste transcript here..."
              styles={{
                input: {
                  background: theme.card,
                  color: theme.text,
                  border: theme.cardBorder,
                },
              }}
            />
          )}

          <Group position="right" mt="md">
            <Button
              onClick={handleGenerate}
              disabled={
                loading ||
                (mode === "upload" && !file) ||
                (mode === "paste" && !text.trim())
              }
              style={{
                background: theme.accent,
                color: "#fff",
                fontWeight: 600,
              }}
            >
              {loading ? <Loader size="xs" /> : "Generate Insights"}
            </Button>
          </Group>
        </Card>
      </motion.div>

      {/* === AI Results Section === */}
      {results && (
        <>
          {/* Summary */}
          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.3 }}>
            <Card
              radius="lg"
              shadow="md"
              style={{
                background: theme.card,
                border: theme.cardBorder,
                backdropFilter: "blur(15px)",
                marginBottom: "2rem",
              }}
            >
              <Text fw={700} mb="xs" style={{ color: theme.text }}>
                Summary
              </Text>
              <ul style={{ marginLeft: "1.25rem", color: theme.subtext }}>
                {results.summary.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Action Items + Key Topics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            {/* Action Items */}
            <motion.div whileHover={{ scale: 1.01 }}>
              <Card
                radius="lg"
                shadow="md"
                style={{
                  background: theme.card,
                  border: theme.cardBorder,
                  backdropFilter: "blur(15px)",
                }}
              >
                <Group mb="sm">
                  <IconListCheck size={20} color="#8B5CF6" />
                  <Text fw={700} style={{ color: theme.text }}>
                    Action Items
                  </Text>
                </Group>
                {results.action_items.length > 0 ? (
                  <ul style={{ marginLeft: "1.25rem", color: theme.subtext }}>
                    {results.action_items.map((item, i) => (
                      <li key={i}>
                        <strong>{item.assignee || "Unassigned"}:</strong>{" "}
                        {item.task}{" "}
                        {item.due && (
                          <span style={{ color: "#F59E0B" }}>
                            (Due: {item.due})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text size="sm" style={{ color: theme.subtext }}>
                    No action items detected.
                  </Text>
                )}
              </Card>
            </motion.div>

            {/* Key Topics */}
            <motion.div whileHover={{ scale: 1.01 }}>
              <Card
                radius="lg"
                shadow="md"
                style={{
                  background: theme.card,
                  border: theme.cardBorder,
                  backdropFilter: "blur(15px)",
                }}
              >
                <Group mb="sm">
                  <IconTargetArrow size={20} color="#3B82F6" />
                  <Text fw={700} style={{ color: theme.text }}>
                    Key Topics Discussed
                  </Text>
                </Group>
                {results.decisions.length > 0 ? (
                  <ul style={{ marginLeft: "1.25rem", color: theme.subtext }}>
                    {results.decisions.map((topic, i) => (
                      <li key={i}>{topic}</li>
                    ))}
                  </ul>
                ) : (
                  <Text size="sm" style={{ color: theme.subtext }}>
                    No major topics identified.
                  </Text>
                )}
              </Card>
            </motion.div>
          </div>

          {/* Sentiment Breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "1.5rem",
            }}
          >
            {/* Sentiment Trend */}
            <Card
              radius="lg"
              shadow="md"
              style={{
                background: theme.card,
                border: theme.cardBorder,
                backdropFilter: "blur(15px)",
              }}
            >
              <Text fw={700} mb="sm" style={{ color: theme.text }}>
                Sentiment Trend
              </Text>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={[
                    { label: "Intro", score: 0.2 },
                    { label: "Middle", score: 0.4 },
                    { label: "Wrap-up", score: 0.6 },
                  ]}
                >
                  <defs>
                    <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={
                      theme.colorScheme === "dark" ? "#334155" : "#E2E8F0"
                    }
                  />
                  <XAxis dataKey="label" stroke={theme.subtext} />
                  <YAxis stroke={theme.subtext} />
                  <Tooltip contentStyle={getTooltipStyle()} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#6366F1"
                    fill="url(#colorSentiment)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Sentiment Breakdown Pie */}
            <Card
              radius="lg"
              shadow="md"
              style={{
                background: theme.card,
                border: theme.cardBorder,
                backdropFilter: "blur(15px)",
              }}
            >
              <Text fw={700} mb="sm" style={{ color: theme.text }}>
                Sentiment Breakdown
              </Text>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    activeIndex={activeIndex}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={activeIndex === null ? 90 : 100}
                    paddingAngle={5}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {sentimentData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={getTooltipStyle()} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: ".5rem",
                }}
              >
                {sentimentData.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: s.color,
                      }}
                    />
                    <Text size="sm" style={{ color: theme.text }}>
                      {s.name}: {s.value}%
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}