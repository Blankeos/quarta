import getTitle from "@/utils/get-title";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { onMount, type FlowProps } from "solid-js";
import { useMetadata } from "vike-metadata-solid";

import "@/styles/app.css";

import "tippy.js/dist/tippy.css";

import { Toaster } from "solid-sonner";

import init from "@/rust-wasm/pkg/rust_wasm";

useMetadata.setGlobalDefaults({
  title: getTitle("Home"),
  description: "Demo showcasing Vike and Solid.",
});

const queryClient = new QueryClient();

export default function RootLayout(props: FlowProps) {
  onMount(async () => {
    await init();
  });
  return (
    <QueryClientProvider client={queryClient}>
      <div>{props.children}</div>
      <Toaster />
    </QueryClientProvider>
  );
}
