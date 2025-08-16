import { useState } from "react";
import { generatePassword } from "./utils/pass-generator";
import { ClipboardCopy, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import ThemeToggle from "./theme";
import Logo from "./utils/logo";
import { toast } from "sonner";

// theme state handled via ThemeProvider

function App() {
  const [text, setText] = useState(""); // master phrase
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [length, setLength] = useState<number>(30);
  const [copied, setCopied] = useState(false);
  const [showMaster, setShowMaster] = useState(false);

  return (
    <div className="min-h-dvh overflow-hidden bg-secondary text-secondary-foreground transition-colors">
      <div className="mx-auto max-w-md p-6 h-dvh overflow-y-hidden">
        <div className="w-full flex items-center justify-center">
          <Logo className="w-40 h-40" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Password generator</h1>
          <ThemeToggle />
        </div>

        <div className="rounded-xl border backdrop-blur p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="main-input" className="text-sm opacity-80">
              Master passphrase
            </label>
            <Button
              onClick={async () => {
                setError("");
                setResult("");
                setBusy(true);
                try {
                  const pwd = await generatePassword(text, 1, {
                    context: "",
                    length,
                    iterations: 600_000,
                  });
                  setResult(pwd);
                } catch (e: any) {
                  setError(e?.message ?? String(e));
                } finally {
                  setBusy(false);
                }
              }}
              disabled={!text || busy}
              variant="default"
              size="sm"
            >
              {busy ? "Generating..." : "Generate"}
            </Button>
          </div>
          <div className="relative">
            <Input
              id="main-input"
              type={showMaster ? "text" : "password"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Your master passphrase..."
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label={showMaster ? "Hide" : "Show"}
              onClick={() => setShowMaster((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-secondary-foreground"
            >
              {showMaster ? (
                <EyeOff className="text-current" size={18} />
              ) : (
                <Eye className="text-current" size={18} />
              )}
            </Button>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="len" className="text-sm opacity-80">
                Length: <span className="font-medium">{length}</span>
              </label>
              <span className="text-xs opacity-60">8–120</span>
            </div>
            <Slider
              min={8}
              max={120}
              step={1}
              value={[length]}
              onValueChange={(v) => setLength(v[0] ?? length)}
            />
          </div>
          {result && (
            <div className="mt-4 relative">
              <code className="block w-full select-all text-sm px-3 py-3 pr-10 rounded bg-secondary border border-neutral-200 whitespace-pre-wrap break-all overflow-x-auto">
                {result}
              </code>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result);
                    setCopied(true);
                    setTimeout(() => {
                      setCopied(false);
                      toast.success("Password copied to clipboard");
                    }, 200);
                  } catch (e) {}
                }}
                variant="ghost"
                size="icon"
                aria-label="Copy password"
                title={copied ? "Copied!" : "Copy"}
                className="absolute top-1.5 right-1.5 inline-flex items-center justify-center rounded-md p-1.5"
              >
                {copied ? (
                  <Check className="text-current" size={16} />
                ) : (
                  <ClipboardCopy className="text-current" size={16} />
                )}
              </Button>
            </div>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
