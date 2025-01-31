import { createContext, createSignal, FlowProps, onMount, useContext } from "solid-js";

import init from "@/rust-wasm/pkg/rust_wasm";

type RustWasmContextValue = {
  isReady: () => boolean;
};

const RustWasmContext = createContext({
  isReady: () => false,
} as RustWasmContextValue);

export const useRustWasmContext = () => useContext(RustWasmContext);

export function RustWasmProvider(props: FlowProps) {
  const [isReady, setIsReady] = createSignal<boolean>(false);

  onMount(async () => {
    await init();
    setIsReady(true);
  });

  return (
    <RustWasmContext.Provider
      value={{
        isReady,
      }}
    >
      {props.children}
    </RustWasmContext.Provider>
  );
}
