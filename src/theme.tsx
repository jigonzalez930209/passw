import * as React from "react";

const colorSchemes = ["light", "dark"];
const MEDIA = "(prefers-color-scheme: dark)";

const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined);
const defaultContext: UseThemeProps = { setTheme: () => {}, themes: [] };

export const useTheme = () => React.useContext(ThemeContext) ?? defaultContext;

export const ThemeProvider = ({
  forcedTheme,
  disableTransitionOnChange = false,
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  themes = ["light", "dark"],
  defaultTheme = enableSystem ? "system" : "light",
  attribute = "data-theme",
  value,
  children,
  nonce,
  scriptProps,
}: ThemeProviderProps) => {
  const [theme, setThemeState] = React.useState(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<
    string | undefined
  >();

  const applyTheme = React.useCallback(
    (currentTheme: string) => {
      const root = document.documentElement;
      const resolved =
        currentTheme === "system" ? getSystemTheme() : currentTheme;
      const themeClass = value ? value[resolved] : resolved;

      const handleAttribute = (attr: Attribute) => {
        if (attr === "class") {
          root.classList.remove(...themes);
          if (themeClass) root.classList.add(themeClass);
        } else {
          root.setAttribute(attr, themeClass || "");
        }
      };

      const attributes = Array.isArray(attribute) ? attribute : [attribute];
      attributes.forEach(handleAttribute);

      if (enableColorScheme && colorSchemes.includes(resolved)) {
        root.style.colorScheme = resolved;
      }

      if (disableTransitionOnChange) {
        const style = document.createElement("style");
        if (nonce) style.setAttribute("nonce", nonce);
        style.appendChild(
          document.createTextNode("* { transition: none !important; }")
        );
        document.head.appendChild(style);
        setTimeout(() => {
          document.head.removeChild(style);
        }, 0);
      }

      localStorage.setItem(storageKey, resolved);
    },
    [
      themes,
      attribute,
      value,
      enableColorScheme,
      disableTransitionOnChange,
      nonce,
      storageKey,
    ]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  React.useEffect(() => {
    const initialTheme = getTheme(storageKey, defaultTheme);
    setThemeState(initialTheme);
    if (initialTheme === "system") {
      setResolvedTheme(getSystemTheme());
    }
    applyTheme(initialTheme);
  }, []);

  const setTheme = React.useCallback(
    (newTheme: string | ((prev: string) => string)) => {
      const finalTheme =
        typeof newTheme === "function" ? newTheme(theme) : newTheme;
      setThemeState(finalTheme);
      localStorage.setItem(storageKey, finalTheme);
      applyTheme(finalTheme);
    },
    [theme, storageKey, applyTheme]
  );

  const providerValue = React.useMemo(
    () =>
      ({
        theme,
        setTheme,
        forcedTheme,
        resolvedTheme: theme === "system" ? resolvedTheme : theme,
        themes: enableSystem ? [...themes, "system"] : themes,
        systemTheme: enableSystem ? resolvedTheme : undefined,
      } as UseThemeProps),
    [theme, setTheme, forcedTheme, resolvedTheme, enableSystem, themes]
  );

  return (
    <ThemeContext.Provider value={providerValue}>
      {children}
      <ThemeScript
        forcedTheme={forcedTheme}
        storageKey={storageKey}
        attribute={attribute}
        enableSystem={enableSystem}
        enableColorScheme={enableColorScheme}
        defaultTheme={defaultTheme}
        value={value}
        themes={themes}
        nonce={nonce}
        {...scriptProps}
      />
    </ThemeContext.Provider>
  );
};

const ThemeScript = React.memo(
  ({
    forcedTheme,
    storageKey,
    attribute,
    enableSystem,
    enableColorScheme,
    defaultTheme,
    value,
    themes,
    nonce,
    ...scriptProps
  }: Omit<ThemeProviderProps, "children"> & { defaultTheme: string }) => {
    const scriptArgs = JSON.stringify([
      attribute,
      storageKey,
      defaultTheme,
      forcedTheme,
      themes,
      value,
      enableSystem,
      enableColorScheme,
    ]).slice(1, -1);

    return (
      <script
        {...scriptProps}
        nonce={nonce || ""}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
        dangerouslySetInnerHTML={{
          __html: `(${initializeTheme.toString()})(${scriptArgs})`,
        }}
      />
    );
  }
);

ThemeScript.displayName = "ThemeScript";

const initializeTheme = (
  attribute: Attribute,
  storageKey: string,
  defaultTheme: string,
  forcedTheme?: string,
  themes?: string[],
  _value?: ValueObject,
  _enableSystem?: boolean,
  enableColorScheme?: boolean
) => {
  const theme = forcedTheme ?? localStorage.getItem(storageKey) ?? defaultTheme;
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  if (enableColorScheme && ["dark", "light"].includes(resolvedTheme)) {
    root.style.colorScheme = resolvedTheme;
  }
  if (attribute === "class") {
    root.classList.remove(...(themes ?? []));
    root.classList.add(resolvedTheme);
  } else {
    root.setAttribute(attribute, resolvedTheme);
  }
};

const getTheme = (key: string, fallback: string) =>
  typeof window !== "undefined"
    ? localStorage.getItem(key) ?? fallback
    : fallback;

const getSystemTheme = () =>
  window.matchMedia(MEDIA).matches ? "dark" : "light";

interface ValueObject {
  [themeName: string]: string;
}

type DataAttribute = `data-${string}`;

type ScriptProps = React.DetailedHTMLProps<
  React.ScriptHTMLAttributes<HTMLScriptElement>,
  HTMLScriptElement
>;

export interface UseThemeProps {
  themes: string[];
  forcedTheme?: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  theme?: string;
  resolvedTheme?: string;
  systemTheme?: "dark" | "light";
}

export type Attribute = DataAttribute | "class";

export interface ThemeProviderProps extends React.PropsWithChildren {
  themes?: string[];
  forcedTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
  defaultTheme?: string;
  attribute?: Attribute | Attribute[];
  value?: ValueObject;
  nonce?: string;
  scriptProps?: ScriptProps;
}

import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="default"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className=""
    >
      {theme === "light" ? (
        <MoonIcon className="h-4 w-4 hover:animate-spin" />
      ) : (
        <SunIcon className="h-4 w-4 hover:animate-spin" />
      )}
    </Button>
  );
};

export default ThemeToggle;
