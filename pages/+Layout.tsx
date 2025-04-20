import getTitle from "@/utils/get-title";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { type FlowProps } from "solid-js";
import { useMetadata } from "vike-metadata-solid";

import "@/styles/app.css";

import "tippy.js/dist/tippy.css";

import { Toaster } from "solid-sonner";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { RustWasmProvider } from "@/contexts/rust-wasm";
import { ThemeContextProvider, useThemeContext } from "@/contexts/theme";

useMetadata.setGlobalDefaults({
  title: getTitle("Home"),
  description: "Demo showcasing Vike and Solid.",
});

const queryClient = new QueryClient();

export default function RootLayout(props: FlowProps) {
  return (
    <ThemeContextProvider>
      <QueryClientProvider client={queryClient}>
        <RustWasmProvider>
          <div class="bg-background relative">
            <div class="absolute top-5 right-5">
              <ThemeSwitcher />
            </div>
            {props.children}
          </div>

          <Toaster_ />
        </RustWasmProvider>
      </QueryClientProvider>
    </ThemeContextProvider>
  );
}

function Toaster_() {
  const { theme } = useThemeContext();

  return <Toaster theme={theme()} />;
}
