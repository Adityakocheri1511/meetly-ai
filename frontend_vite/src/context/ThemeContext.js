import { createContext } from "react";

export const ThemeContext = createContext({
  theme: {},
  colorScheme: "light",
  toggleColorScheme: () => {},
});