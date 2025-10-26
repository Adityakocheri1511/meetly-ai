import React, { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { Stack, Text } from "@mantine/core";
import { ThemeContext } from "../context/ThemeContext";
import {
  IconLayoutDashboard,
  IconChartBar,
  IconHistory,
  IconSettings,
} from "@tabler/icons-react";

export default function Sidebar({ isExpanded, setIsExpanded }) {
  const { theme } = useContext(ThemeContext);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const links = [
    { label: "Dashboard", icon: IconLayoutDashboard, path: "/" },
    { label: "Analyze", icon: IconChartBar, path: "/analyze" },
    { label: "History", icon: IconHistory, path: "/history" },
    { label: "Settings", icon: IconSettings, path: "/settings" },
  ];

  return (
    <div
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      style={{
        width: isExpanded ? "240px" : "80px",
        transition: "width 0.4s ease",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        backdropFilter: "blur(20px)",
        background: theme.sidebar,
        borderRight: theme.cardBorder,
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        padding: "1.5rem 1rem",
        zIndex: 100,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* --- TOP SECTION --- */}
      <div>
        {/* Logo */}
        <Text
          fw={700}
          size={isExpanded ? "xl" : "md"}
          align="center"
          style={{
            color: theme.sidebarText,
            marginBottom: "2rem",
            letterSpacing: "0.5px",
            background: "linear-gradient(90deg, #6366F1, #8B5CF6, #3B82F6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            transition: "all 0.3s ease",
          }}
        >
          Meetly.AI<span style={{ color: "#A78BFA"}}></span>
        </Text>

        {/* Navigation Links */}
        <Stack spacing="sm">
          {links.map((link, index) => (
            <NavLink
              key={index}
              to={link.path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                background: isActive
                  ? theme.sidebarHover
                  : "transparent",
                color: theme.sidebarText,
                fontWeight: isActive ? 600 : 500,
                textDecoration: "none",
                position: "relative",
                transition: "all 0.3s ease",
                overflow: "hidden",
                boxShadow: isActive
                  ? "inset 0 0 12px rgba(99,102,241,0.25)"
                  : "none",
              })}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Glowing Hover Effect */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: hoveredIndex === index ? "100%" : "0",
                  background:
                    "linear-gradient(90deg, rgba(99,102,241,0.18), rgba(139,92,246,0.22), rgba(236,72,153,0.15))",
                  transition: "width 0.35s ease",
                  borderRadius: "12px",
                  zIndex: 0,
                  boxShadow:
                    hoveredIndex === index
                      ? "inset 0 0 10px rgba(99,102,241,0.3), 0 0 18px rgba(99,102,241,0.2)"
                      : "none",
                }}
              ></div>

              {/* Left Glow Accent Bar */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: hoveredIndex === index ? "6px" : "0px",
                  background:
                    "linear-gradient(to bottom, #6366F1, #8B5CF6, #EC4899)",
                  borderRadius: "0 4px 4px 0",
                  transition: "width 0.25s ease",
                  boxShadow:
                    hoveredIndex === index
                      ? "0 0 12px rgba(139,92,246,0.5)"
                      : "none",
                }}
              ></div>

              {/* Icon */}
              <div style={{ zIndex: 1 }}>
                <link.icon
                  size={22}
                  color={theme.sidebarText}
                  strokeWidth={1.7}
                />
              </div>

              {/* Label */}
              {isExpanded && (
                <Text
                  size="sm"
                  style={{
                    zIndex: 1,
                    color: theme.sidebarText,
                    letterSpacing: "0.3px",
                    transition: "color 0.3s ease",
                  }}
                >
                  {link.label}
                </Text>
              )}
            </NavLink>
          ))}
        </Stack>
      </div>

      {/* --- FOOTER --- */}
      {isExpanded && (
        <Text
          align="center"
          size="xs"
          style={{
            marginTop: "2rem",
            color: theme.subtext,
            opacity: 0.8,
            fontStyle: "italic",
            letterSpacing: "0.4px",
          }}
        >
          v1.0 • AI Meeting Intelligence
        </Text>
      )}
    </div>
  );
}