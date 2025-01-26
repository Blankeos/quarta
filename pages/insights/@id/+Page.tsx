import { PageRoutes } from "@/constants/page-routes";
import { db } from "@/lib/dexie";
import { useLiveQuery } from "@/lib/dexie-solid-hook";
import getTitle from "@/utils/get-title";
import { Component, createEffect, createSignal } from "solid-js";
import { useMetadata } from "vike-metadata-solid";
import { usePageContext } from "vike-solid/usePageContext";
import { navigate } from "vike/client/router";

import { IconChevronLeft } from "@/assets";
import { PolarChart } from "@/components/polarchart";
import { StackedBarChart } from "@/components/stackedbarchart";
import { parse_csv } from "@/rust-wasm/pkg/rust_wasm";

import Papa from "papaparse";

const Page: Component = () => {
  useMetadata({
    title: getTitle("Financial Insights"),
  });

  const pageContext = usePageContext();

  const [debtSearch, setDebtSearch] = createSignal("");

  const sheet = useLiveQuery(() =>
    db.sheets.where("id").equals(parseInt(pageContext.routeParams.id)).first()
  );

  createEffect(() => {
    if (sheet.data?.content) {
      let start = performance.now();
      const str = parse_csv(sheet.data.content);
      console.log("rust performance", performance.now() - start);
      if (str) console.log(JSON.parse(str));

      start = performance.now();
      Papa.parse(sheet.data.content);
      console.log("js performance", performance.now() - start);
    }
  });

  return (
    <>
      <button
        class="m-10 grid h-10 w-10 place-items-center rounded-md border text-neutral-800"
        onClick={() => navigate(PageRoutes.Home)}
      >
        <IconChevronLeft />
      </button>
      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 class="mb-8 text-4xl font-bold text-gray-900">Here are some insights by Quarta</h1>
        <div class="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl font-semibold">AI-Powered Summary</h2>
          <p class="text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Your financial health looks
            good with stable income and controlled spending patterns.
          </p>
        </div>
        <div class="mb-8 flex items-center gap-8">
          Quick Summary:
          <div class="rounded-full bg-blue-100 px-4 py-2">
            <span class="font-medium">Total Income: $120,000</span>
          </div>
          <div class="rounded-full bg-green-100 px-4 py-2">
            <span class="font-medium">Monthly Savings: 25%</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-8">
          <div class="rounded-lg bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold">Total Earn vs Total Spend</h3>
            <div class="rounded-lg">
              <PolarChart
                chartLabel="Stuff"
                data={[
                  {
                    label: "Total Earned",
                    value: 43,
                  },
                  {
                    label: "Total Spent",
                    value: 30,
                    color: "red",
                  },
                ]}
              />
              <p class="text-center text-xs text-neutral-500">Net:</p>
            </div>
          </div>

          <div class="rounded-lg bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold">Lifetime Inflows vs Outflows</h3>
            <div class="rounded-lg">
              <StackedBarChart
                data={{
                  x: [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ],
                  y: [
                    {
                      label: "Inflows",
                      data: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
                      color: "green",
                    },
                    {
                      label: "Outflows",
                      data: [-30, -20, -100, -40, -99, -60, -130, -80, -90, -100, -110, -20],
                      color: "red",
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div class="rounded-lg bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold">Monthly Inflows vs Outflows</h3>
            <div class="rounded-lg">
              <StackedBarChart
                data={{
                  x: [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ],
                  y: [
                    {
                      label: "Inflows",
                      data: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
                      color: "green",
                    },
                    {
                      label: "Outflows",
                      data: [-30, -20, -100, -40, -99, -60, -130, -80, -90, -100, -110, -20],
                      color: "red",
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div class="rounded-lg bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold">Debts Overview</h3>
            <input
              type="text"
              placeholder="Search debts..."
              value={debtSearch()}
              onInput={(e) => setDebtSearch(e.currentTarget.value)}
              class="mb-4 w-full rounded-lg border px-4 py-2"
            />
            <div class="h-32 rounded-lg bg-gray-200"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;
