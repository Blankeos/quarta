import { PageRoutes } from "@/constants/page-routes";
import { db } from "@/lib/dexie";
import { useLiveQuery } from "@/lib/dexie-solid-hook";
import getTitle from "@/utils/get-title";
import { Component, createEffect, createSignal, Show } from "solid-js";
import { useMetadata } from "vike-metadata-solid";
import { usePageContext } from "vike-solid/usePageContext";
import { navigate } from "vike/client/router";

import { IconChevronLeft, IconPiggyBank } from "@/assets";
import { PolarChart } from "@/components/polarchart";
import { StackedBarChart } from "@/components/stackedbarchart";
import { useRustWasmContext } from "@/contexts/rust-wasm";
import { RustDataframe } from "@/rust-wasm/pkg/rust_wasm.js";
import { debounce } from "@/utils/debounce";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import { createStore, produce } from "solid-js/store";

const Page: Component = () => {
  useMetadata({
    title: getTitle("Financial Insights"),
  });

  const pageContext = usePageContext();
  const { isReady } = useRustWasmContext();

  const [debtSearch, setDebtSearch] = createSignal("");

  const sheet = useLiveQuery(() =>
    db.sheets.where("id").equals(parseInt(pageContext.routeParams.id)).first()
  );

  let dataframe!: RustDataframe;

  const [stats, setStats] = createStore<{
    total_earned: number;
    total_spent: number;
    net_income: number;
    lifetime_savings_decimal: number;
    lifetime_inflows_vs_outflows: {
      inflows: number[];
      outflows: number[];
      months: string[];
    };
  }>({
    total_earned: 0,
    total_spent: 0,
    net_income: 0,
    lifetime_savings_decimal: 0,
    lifetime_inflows_vs_outflows: {
      inflows: [],
      outflows: [],
      months: [],
    },
  });

  createEffect(() => {
    if (sheet.data?.content && isReady()) {
      let start = performance.now();
      dataframe = new RustDataframe();
      const str = dataframe.parse_csv(sheet.data.content);
      console.log("rust performance", performance.now() - start);
      if (str) console.log(JSON.parse(str));

      const totalEarnedVsSpent = dataframe.get_total_earned_vs_spent();
      setStats(
        produce((_stats) => {
          _stats.total_spent = totalEarnedVsSpent.total_spent;
          _stats.total_earned = totalEarnedVsSpent.total_earned;
          _stats.net_income = totalEarnedVsSpent.net_income;
          _stats.lifetime_savings_decimal = totalEarnedVsSpent.lifetime_savings_decimal;
        })
      );

      const lifetimeInflowsVsOutflows = dataframe.get_inflows_vs_outflows();
      console.log(lifetimeInflowsVsOutflows);
      setStats(
        produce((_stats) => {
          _stats.lifetime_inflows_vs_outflows = {
            inflows: lifetimeInflowsVsOutflows.inflows.values().toArray(),
            months: lifetimeInflowsVsOutflows.months.values().toArray(),
            outflows: lifetimeInflowsVsOutflows.outflows.values().toArray(),
          };
        })
      );
    }
  });

  // ===========================================================================
  // Functions
  // ===========================================================================

  const handleDebtorInput = debounce((value: string) => {
    if (!isReady()) return;

    const debtors = dataframe.search_debtors(value);
    console.log("carloovec", debtors);
  }, 500);

  return (
    <>
      <button
        class="m-10 grid h-10 w-10 place-items-center rounded-md border text-neutral-800"
        onClick={() => navigate(PageRoutes.Home)}
      >
        <IconChevronLeft />
      </button>

      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-2 flex gap-x-1">
          <Show when={sheet.data?.name}>
            <span class="rounded-lg bg-neutral-100 px-3 py-1 text-sm text-neutral-800">
              {sheet.data?.name}
            </span>
          </Show>
          <span class="rounded-lg bg-neutral-100 px-3 py-1 text-sm text-neutral-800">
            Last Opened: {formatDate(sheet.data?.last_opened_at ?? new Date())}
          </span>
        </div>
        <h1 class="mb-8 text-4xl font-bold text-gray-900">Here are some insights by Quarta</h1>
        <div class="mb-8 rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl font-semibold">AI-Powered Summary</h2>
          <p class="text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Your financial health looks
            good with stable income and controlled spending patterns.
          </p>
        </div>
        <div class="mb-8 flex items-center gap-8">
          Quick Summary:
          <div class="flex items-center gap-x-2 rounded-full border border-blue-200 bg-blue-100 px-4 py-2 text-sm text-blue-600">
            <IconPiggyBank class="h-5 w-5 text-blue-500" />
            <span class="font-medium">Total Earned: {formatCurrency(stats.total_earned)}</span>
          </div>
          <div class="flex items-center gap-x-2 rounded-full border border-green-200 bg-green-100 px-4 py-2 text-sm text-green-600">
            <IconPiggyBank class="h-5 w-5 text-green-500" />
            <span class="font-medium">
              Lifetime Savings Average: {(stats.lifetime_savings_decimal * 100).toFixed(2)}%
            </span>
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
                    value: stats.total_earned,
                  },
                  {
                    label: "Total Spent",
                    value: Math.abs(stats.total_spent),
                    color: "red",
                  },
                ]}
              />
              <p class="text-center text-xs text-neutral-500">
                Net: {formatCurrency(stats.net_income)}
              </p>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold">Lifetime Inflows vs Outflows</h3>
            <div class="overflow-x-scroll rounded-lg">
              <div class="w-[900px]">
                <StackedBarChart
                  data={{
                    x: stats.lifetime_inflows_vs_outflows.months,
                    y: [
                      {
                        label: "Inflows",
                        data: stats.lifetime_inflows_vs_outflows.inflows,
                        color: "green",
                      },
                      {
                        label: "Outflows",
                        data: stats.lifetime_inflows_vs_outflows.outflows,
                        color: "red",
                      },
                    ],
                  }}
                />
              </div>
            </div>
          </div>

          {/* <div class="rounded-lg bg-white p-6 shadow-sm">
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
          </div> */}

          <div class="rounded-lg bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold">Debts Overview</h3>
            <input
              type="text"
              placeholder="Search debts..."
              value={debtSearch()}
              onInput={(e) => {
                setDebtSearch(e.currentTarget.value);
                handleDebtorInput(e.currentTarget.value);
              }}
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
