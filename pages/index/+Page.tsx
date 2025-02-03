import { IconClose, IconDownloading, IconEdit, IconGoogleSheet, IconLink } from "@/assets";
import { Tippy } from "@/components/solid-tippy";
import { PageRoutes } from "@/constants/page-routes";
import { db } from "@/lib/dexie";
import { useLiveQuery } from "@/lib/dexie-solid-hook";
import getTitle from "@/utils/get-title";
import { createDropzone } from "@soorria/solid-dropzone";
import { createMutation } from "@tanstack/solid-query";
import { createSignal, For, Match, Show, Switch } from "solid-js";
import { toast } from "solid-sonner";
import { useMetadata } from "vike-metadata-solid";
import { navigate } from "vike/client/router";

export default function Page() {
  useMetadata({
    title: getTitle("Quarta"),
  });

  // ===========================================================================
  // States
  // ===========================================================================
  const [inputValue, setInputValue] = createSignal("");
  const [inputType, setInputType] = createSignal<"url" | "key" | "raw" | "">("");

  const sheets = useLiveQuery(() => db.sheets.toArray());

  const dropzone = createDropzone({
    noClick: true,
    multiple: false,
    accept: [".csv"],
    onDrop: async (files) => {
      if (files.length === 0) {
        toast.error("Could not read file. Please try again.");
        return;
      }

      const file = files[0];
      const text = await file.text();

      const id = await db.sheets.add({
        content: text,
        created_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
        name: new Date().toISOString(),
      });

      toast.success("Received your Sheet!");
      navigate(`${PageRoutes.Insights}/${id}`);
    },
  });

  // ===========================================================================
  // Mutations
  // ===========================================================================
  const downloadMutation = createMutation(() => ({
    mutationKey: ["csv-content"],
    mutationFn: async () => {
      let downloadUrl: string;
      if (inputType() === "url") {
        const matches = inputValue().match(/\/d\/(.*?)(\/|$)/);
        const key = matches ? matches[1] : "";
        downloadUrl = `https://docs.google.com/spreadsheets/d/${key}/export?format=csv&gid=0`;
      } else if (inputType() === "raw") {
        downloadUrl = inputValue();
      } else {
        downloadUrl = `https://docs.google.com/spreadsheets/d/${inputValue()}/export?format=csv&gid=0`;
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        toast.error("Failed to download CSV. Not found.");
        throw new Error("Failed to download CSV. Not found.");
      }
      const blob = await response.blob();
      const text = await blob.text();

      const id = await db.sheets.add({
        content: text,
        created_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
      });

      toast.success("Received your Sheet!");
      navigate(`${PageRoutes.Insights}/${id}`);
    },
  }));

  // ===========================================================================
  // Functions
  // ===========================================================================
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && inputValue()) {
      downloadMutation.mutate();
    }
  };

  const detectInputType = (value: string) => {
    if (value.includes("docs.google.com/spreadsheets")) {
      setInputType("url");
    } else if (value.startsWith("http://") || value.startsWith("https://")) {
      setInputType("raw");
    } else if (value.trim()) {
      setInputType("key");
    } else {
      setInputType("");
    }
  };

  return (
    <>
      <div
        class="flex min-h-screen flex-col items-center justify-center p-4"
        {...dropzone.getRootProps()}
      >
        <h1 class="mb-2 text-5xl font-bold text-green-500">Quarta</h1>
        <p class="mb-1 text-gray-600">Personal finance insights powered by your own Spreadsheet</p>
        <p class="mb-8 text-xs text-gray-600">Powered by 🦀 Rust and 🐬 SolidJS</p>
        <div class="w-full max-w-md">
          <input
            type="text"
            placeholder="Paste your Google Sheet URL here or ID."
            value={inputValue()}
            onInput={(e) => {
              const value = e.currentTarget.value;
              setInputValue(value);
              detectInputType(value);
            }}
            onKeyDown={handleKeyDown}
            class="w-full rounded-lg border p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <Show when={inputType() || dropzone.isDragActive}>
            <p class="mt-2 flex items-center gap-x-1 text-sm text-gray-600">
              Detected input type:{" "}
              <Switch>
                <Match when={inputType() === "url"}>
                  <IconLink class="h-5 w-5 text-[#188038]" />
                  Google Sheet URL
                </Match>
                <Match when={inputType() === "key"}>
                  <IconGoogleSheet class="h-5 w-5" />
                  Google Sheet Key
                </Match>
                <Match when={inputType() === "raw"}>
                  <IconLink class="h-5 w-5" />
                  Raw CSV URL
                </Match>
                <Match when={dropzone.isDragActive}>
                  <IconLink class="h-5 w-5" />A CSV file?
                </Match>
              </Switch>
            </p>
          </Show>
          {downloadMutation.isPending && (
            <div class="mt-4 flex justify-center text-green-500">
              <IconDownloading />
            </div>
          )}
        </div>
        <div class="mt-8 w-full max-w-md">
          <For each={sheets.data ?? []}>
            {(sheet) => {
              const [isEditing, setIsEditing] = createSignal(false);

              let inputRef!: HTMLInputElement;

              return (
                <div class="group relative mb-2 flex items-center">
                  <a
                    href={`${PageRoutes.Insights}/${sheet.id}`}
                    class="relative flex w-full items-center justify-between rounded border p-3 px-5 transition"
                  >
                    <Show
                      when={isEditing()}
                      fallback={<div>{sheet.name ? sheet?.name : "-"}</div>}
                      children={
                        <div>
                          <input
                            ref={inputRef}
                            type="text"
                            value={sheet.name ?? ""}
                            onInput={(e) => {
                              const value = e.currentTarget.value;
                              db.sheets.update(sheet.id, { name: value });
                            }}
                            onBlur={() => {
                              setIsEditing(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape" || e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            autofocus
                            class="w-full border-b focus:outline-none"
                          />
                        </div>
                      }
                    />
                  </a>

                  <div class="absolute right-0 flex items-center gap-x-0">
                    <div class="flex items-center opacity-0 transition group-hover:opacity-100">
                      <Tippy props={{ content: "Edit Name", delay: [200, 0] }}>
                        <button
                          class="cursor-pointer text-gray-400 transition active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIsEditing(true);
                            inputRef?.focus();
                          }}
                        >
                          <IconEdit class="h-6 w-6" />
                        </button>
                      </Tippy>
                    </div>
                    <Tippy props={{ content: "Delete", delay: [200, 0] }}>
                      <button
                        class="cursor-pointer text-red-400 transition active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          db.sheets.delete(sheet.id);
                        }}
                      >
                        <IconClose />
                      </button>
                    </Tippy>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </>
  );
}
