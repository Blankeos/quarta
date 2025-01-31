import getTitle from "@/utils/get-title";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { type FlowProps } from "solid-js";
import { useMetadata } from "vike-metadata-solid";

import "@/styles/app.css";

import "tippy.js/dist/tippy.css";

import { Toaster } from "solid-sonner";

import { RustWasmProvider } from "@/contexts/rust-wasm";

useMetadata.setGlobalDefaults({
  title: getTitle("Home"),
  description: "Demo showcasing Vike and Solid.",
});

const queryClient = new QueryClient();

export default function RootLayout(props: FlowProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RustWasmProvider>
        <div>{props.children}</div>
        <Toaster />
      </RustWasmProvider>
    </QueryClientProvider>
  );
}
