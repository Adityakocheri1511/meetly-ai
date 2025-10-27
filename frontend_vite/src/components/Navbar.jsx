// src/components/Navbar.jsx
import React, { useContext, useState } from "react";
import {
  ActionIcon,
  Group,
  Avatar,
  Menu,
  Modal,
  Button,
  Text,
  Loader,
} from "@mantine/core";
import {
  IconSun,
  IconMoonStars,
  IconLogout,
  IconUser,
  IconSettings,
} from "@tabler/icons-react";
import { ThemeContext } from "../context/ThemeContext";
import { UserContext } from "../context/UserContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const { toggleColorScheme, colorScheme, theme } = useContext(ThemeContext);
  const { user, setUser } = useContext(UserContext);
  const [logoutModal, setLogoutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Dynamic page title
  const getPageTitle = () => {
    if (location.pathname === "/" || location.pathname === "/dashboard")
      return "Meetly.AI Dashboard";
    if (location.pathname === "/analyze") return "Analyze Meetings";
    if (location.pathname === "/history") return "Meeting History";
    if (location.pathname.startsWith("/meeting/")) return "Meeting Details";
    if (location.pathname === "/profile") return "Your Profile";
    if (location.pathname === "/settings") return "Settings";
    return "Meetly.AI";
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      setUser(null);
      setLogoutModal(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      {/* Navbar */}
      <div
        style={{
          height: "70px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 1.5rem",
          backdropFilter: "blur(20px)",
          background: theme.navbar,
          borderBottom: theme.navbarBorder,
          position: "sticky",
          top: 0,
          zIndex: 999,
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        {/* Left: Page title */}
        <h2
          style={{
            fontWeight: 700,
            fontSize: "1.125rem",
            color: theme.text,
            margin: 0,
            transition: "color 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          {getPageTitle()}
        </h2>

        {/* Right: Controls */}
        <Group spacing="md" style={{ alignItems: "center", height: "100%" }}>
          {/* Theme Toggle */}
          <ActionIcon
            variant="light"
            radius="xl"
            size={40}
            onClick={toggleColorScheme}
            aria-label="Toggle theme"
            title="Toggle theme"
            style={{
              background: theme.accent,
              color: "#fff",
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              transition: "all 0.3s ease",
              alignSelf: "center",
            }}
          >
            {colorScheme === "dark" ? (
              <IconSun size={18} />
            ) : (
              <IconMoonStars size={18} />
            )}
          </ActionIcon>

          {/* Profile Dropdown */}
          <Menu shadow="md" width={220} position="bottom-end" withArrow>
            <Menu.Target>
              <Avatar
                src={
                  user?.photoURL ||
                  "https://ui-avatars.com/api/?name=User&background=6366F1&color=fff"
                }
                radius="xl"
                size={42}
                style={{
                  boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
                  cursor: "pointer",
                  border:
                    colorScheme === "dark"
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid rgba(0,0,0,0.06)",
                  transition: "transform 0.2s ease",
                  alignSelf: "center",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              />
            </Menu.Target>

            <Menu.Dropdown
              style={{
                background: theme.card,
                border: theme.cardBorder,
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              }}
            >
              <Menu.Item
                icon={<IconUser size={16} />}
                onClick={() => navigate("/profile")}
                style={{
                  color: theme.text,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colorScheme === "dark"
                    ? "linear-gradient(90deg, rgba(99,102,241,0.2), rgba(139,92,246,0.25))"
                    : "rgba(99,102,241,0.08)";
                  e.currentTarget.style.color = colorScheme === "dark" ? "#fff" : "#1F2937";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = theme.text;
                }}
              >
                Profile
              </Menu.Item>

              <Menu.Item
                icon={<IconSettings size={16} />}
                onClick={() => navigate("/settings")}
                style={{
                  color: theme.text,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colorScheme === "dark"
                    ? "linear-gradient(90deg, rgba(99,102,241,0.2), rgba(139,92,246,0.25))"
                    : "rgba(99,102,241,0.08)";
                  e.currentTarget.style.color = colorScheme === "dark" ? "#fff" : "#1F2937";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = theme.text;
                }}
              >
                Settings
              </Menu.Item>

              <Menu.Divider />

              <Menu.Item
                color="red"
                icon={<IconLogout size={16} />}
                onClick={() => setLogoutModal(true)}
                style={{
                  fontWeight: 600,
                  color: colorScheme === "dark" ? "#F87171" : "#DC2626",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colorScheme === "dark"
                    ? "linear-gradient(90deg, rgba(99,102,241,0.2), rgba(139,92,246,0.25))"
                    : "rgba(99,102,241,0.08)";
                  e.currentTarget.style.color = colorScheme === "dark" ? "#fff" : "#1F2937";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color =
                    colorScheme === "dark" ? "#F87171" : "#DC2626";
                }}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </div>

      {/* Logout Modal */}
      <Modal
        opened={logoutModal}
        onClose={() => setLogoutModal(false)}
        centered
        radius="lg"
        size="sm"
        withCloseButton={false}
        overlayProps={{
          color: colorScheme === "dark" ? "#0f172a" : "#e2e8f0",
          opacity: 0.45,
          blur: 6,
        }}
        styles={{
          content: {
            background:
              colorScheme === "dark"
                ? "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))"
                : "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,247,255,0.95))",
            border: theme.cardBorder,
            boxShadow:
              colorScheme === "dark"
                ? "0 8px 32px rgba(0,0,0,0.45)"
                : "0 4px 20px rgba(0,0,0,0.15)",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease",
            padding: "1.5rem",
          },
          body: { paddingTop: 12 },
        }}
      >
        <Text fw={700} size="lg" mb="sm" style={{ color: theme.text }}>
          Confirm Logout
        </Text>

        <Text size="sm" style={{ color: theme.subtext, marginBottom: 20 }}>
          Are you sure you want to log out of your account?
        </Text>

        <Group position="right" spacing="md">
          <Button
            variant="default"
            onClick={() => setLogoutModal(false)}
            disabled={signingOut}
            style={{
              background:
                colorScheme === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
              border: theme.cardBorder,
              color: theme.text,
              transition: "all 0.25s ease",
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleLogout}
            disabled={signingOut}
            style={{
              background:
                colorScheme === "dark"
                  ? "linear-gradient(to right, #EF4444, #DC2626)"
                  : "linear-gradient(to right, #F87171, #EF4444)",
              color: "#fff",
              fontWeight: 600,
              minWidth: 100,
              boxShadow:
                colorScheme === "dark"
                  ? "0 4px 20px rgba(239,68,68,0.4)"
                  : "0 4px 10px rgba(239,68,68,0.3)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.03)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {signingOut ? <Loader size="xs" color="white" /> : "Logout"}
          </Button>
        </Group>
      </Modal>
    </>
  );
}