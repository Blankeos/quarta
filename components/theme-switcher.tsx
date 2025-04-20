import { IconMoon, IconSun } from "@/assets";
import { useThemeContext } from "@/contexts/theme";
import { Show } from "solid-js";
import { Button } from "./ui/button";

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <div class="flex items-center gap-x-2">
      <Button variant="ghost" class="h-7 w-7 border border-neutral-300 p-0" onClick={toggleTheme}>
        <Show when={theme() === "light"} fallback={<IconMoon class="h-4 w-4" />}>
          <IconSun class="h-4 w-4" />
        </Show>
      </Button>
    </div>
  );
}
