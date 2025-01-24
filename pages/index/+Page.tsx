import { IconClose, IconDownloading, IconGoogleSheet, IconLink } from "@/assets";
import { PageRoutes } from "@/constants/page-routes";
import { db } from "@/lib/dexie";
import { useLiveQuery } from "@/lib/dexie-solid-hook";
import getTitle from "@/utils/get-title";
import { createMutation } from "@tanstack/solid-query";
import { createSignal, For } from "solid-js";
import { toast } from "solid-sonner";
import { useMetadata } from "vike-metadata-solid";
import { navigate } from "vike/client/router";

export default function Page() {
  const [inputValue, setInputValue] = createSignal("");
  const [inputType, setInputType] = createSignal<"url" | "key" | "">("");

  const sheets = useLiveQuery(() => db.sheets.toArray());

  useMetadata({
    title: getTitle("Quarta"),
  });

  const detectInputType = (value: string) => {
    if (value.includes("docs.google.com/spreadsheets")) {
      setInputType("url");
    } else if (value.trim()) {
      setInputType("key");
    } else {
      setInputType("");
    }
  };

  const downloadMutation = createMutation(() => ({
    mutationKey: ["csv-content"],
    mutationFn: async () => {
      let downloadUrl: string;
      if (inputType() === "url") {
        const matches = inputValue().match(/\/d\/(.*?)(\/|$)/);
        const key = matches ? matches[1] : "";
        downloadUrl = `https://docs.google.com/spreadsheets/d/${key}/export?format=csv&gid=0`;
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

      db.sheets.add({
        content: text,
        created_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
      });

      return text;
    },
    onSuccess() {
      toast.success("Received your Sheet!");
      navigate(PageRoutes.Insights);
    },
  }));

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && inputValue()) {
      downloadMutation.mutate();
    }
  };

  return (
    <>
      <div class="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 class="text-4xl font-bold mb-2">Quarta</h1>
        <p class="text-gray-600 mb-8">Personal finance insights powered by your own Spreadsheet</p>

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
            class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {inputType() && (
            <p class="mt-2 text-sm text-gray-600 flex items-center gap-x-1">
              Detected input type:{" "}
              {inputType() === "url" ? (
                <>
                  <IconLink class="w-5 h-5 text-[#188038]" />
                  Google Sheet URL
                </>
              ) : (
                <>
                  <IconGoogleSheet class="w-5 h-5" />
                  Google Sheet Key
                </>
              )}
            </p>
          )}
          {downloadMutation.isPending && (
            <div class="flex justify-center mt-4">
              <IconDownloading />
            </div>
          )}
        </div>

        <div class="mt-8 w-full max-w-md">
          <For each={sheets.data ?? []}>
            {(sheet) => (
              <div class="relative flex items-center mb-2">
                <a
                  href={`${PageRoutes.Insights}`}
                  class="flex justify-between items-center border rounded p-2 relative w-full"
                >
                  <div>{new Date(sheet.created_at).toLocaleDateString()}</div>
                </a>
                <button
                  class="text-red-400 cursor-pointer active:scale-95 transition absolute right-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    db.sheets.delete(sheet.id);
                  }}
                >
                  <IconClose />
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </>
  );
}
