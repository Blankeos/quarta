# Quarta

A personal finance insights app powered by Rust and SolidJS.

## Quick Start

1. Clone

```sh
git clone https://github.com/blankeos/solid-hop <your-app-name>
cd <your-app-name>
rm -rf .git # This is your app. Start the commits fresh :D
```

1. Install

```sh
bun install
```

3. Run dev server

```sh
bun dev
```

## Building and Deployment

1. Build

```sh
bun run build
```

2. Wherever you deploy, just run make sure that this is ran:

```sh
bun run preview # Just runs server.ts
```

## Development Notes

- Make sure to git add --force rust-wasm/pkg/rust_wasm.js rust-asm/pkg/rust_wasm_bg.wasm only.
  We only need to do them once so they're included in deployments.
- To build and iterate on the rust-wasm code, whenever editing `lib.rs`, run `bun run wasm-build`. And it
  should run the wasm-pack build for you.
