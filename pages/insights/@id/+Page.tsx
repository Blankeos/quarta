import { PageRoutes } from "@/constants/page-routes";
import { db } from "@/lib/dexie";
import { useLiveQuery } from "@/lib/dexie-solid-hook";
import getTitle from "@/utils/get-title";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  mergeProps,
  onMount,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { useMetadata } from "vike-metadata-solid";
import { usePageContext } from "vike-solid/usePageContext";
import { navigate } from "vike/client/router";

import { IconChevronLeft, IconPiggyBank, IconTrendingDown, IconTrendingUp } from "@/assets";
import { PolarChart } from "@/components/polarchart";
import { StackedBarChart } from "@/components/stackedbarchart";
import DataTable from "@/components/ui/data-table";
import { useRustWasmContext } from "@/contexts/rust-wasm";
import { DebtDirection, RustDataframe } from "@/rust-wasm/pkg/rust_wasm.js";
import { cn } from "@/utils/cn";
import { debounce } from "@/utils/debounce";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import { produce } from "solid-js/store";

const Page: Component = () => {
  useMetadata({
    title: getTitle("Financial Insights"),
  });

  // ===========================================================================
  // Refs
  // ===========================================================================
  let dataframe!: RustDataframe;

  // ===========================================================================
  // Contexts
  // ===========================================================================
  const pageContext = usePageContext();
  const { isReady } = useRustWasmContext();

  // ===========================================================================
  // States
  // ===========================================================================
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

  const [debtSearch, setDebtSearch] = createSignal("");

  const [debtors, setDebtors] = createStore<{
    debtors: { id: string; balance: number; paid: boolean; direction: DebtDirection }[];
  }>({
    debtors: [],
  });

  // States for Lifetime Inflows vs Outflows chart
  const [minMonth, setMinMonth] = createSignal<string | null>(null);
  const [maxMonth, setMaxMonth] = createSignal<string | null>(null);

  // ===========================================================================
  // Queries
  // ===========================================================================
  const sheet = useLiveQuery(() =>
    db.sheets.where("id").equals(parseInt(pageContext.routeParams.id)).first()
  );

  // ===========================================================================
  // Derived States
  // ===========================================================================
  const filteredLifetimeInflowsVsOutflows = createMemo(() => {
    const {
      months: allMonths,
      inflows: allInflows,
      outflows: allOutflows,
    } = stats.lifetime_inflows_vs_outflows;

    if (!allMonths || allMonths.length === 0) {
      return {
        months: [],
        inflows: [],
        outflows: [],
        savings_average: 0,
        average_in: 0, // Added
        average_out: 0, // Added
      };
    }

    const currentMinMonth = minMonth();
    const currentMaxMonth = maxMonth();

    // Find start index (inclusive)
    let startIndex = 0;
    if (currentMinMonth) {
      const foundIndex = allMonths.findIndex((m) => m === currentMinMonth);
      if (foundIndex !== -1) {
        startIndex = foundIndex;
      }
    }

    // Find end index (inclusive)
    let endIndex = allMonths.length - 1;
    if (currentMaxMonth) {
      const foundIndex = allMonths.findIndex((m) => m === currentMaxMonth);
      if (foundIndex !== -1) {
        endIndex = foundIndex;
      }
    }

    // Ensure start index is not after end index
    if (startIndex > endIndex) {
      // If invalid range (min > max), return empty or adjust - returning empty slice for now
      return {
        months: [],
        inflows: [],
        outflows: [],
        savings_average: 0,
        average_in: 0, // Added
        average_out: 0, // Added
      };
    }

    // Slice the data arrays based on the calculated indices (endIndex + 1 because slice is exclusive)
    const filteredMonths = allMonths.slice(startIndex, endIndex + 1);
    const filteredInflows = allInflows.slice(startIndex, endIndex + 1);
    const filteredOutflows = allOutflows.slice(startIndex, endIndex + 1);

    // Calculate total inflows and outflows for filtered period.
    const totalFilteredInflows = filteredInflows.reduce((sum, val) => sum + val, 0);
    const totalFilteredOutflows = filteredOutflows.reduce((sum, val) => sum + Math.abs(val), 0); // Use absolute value for outflows

    // Calculate savings average for the filtered period (avoid division by zero)
    const savingsAverage =
      totalFilteredInflows > 0
        ? (totalFilteredInflows - totalFilteredOutflows) / totalFilteredInflows
        : 0;

    // Calculate average in and average out (avoid division by zero)
    const numberOfMonths = filteredMonths.length;
    const averageIn = numberOfMonths > 0 ? totalFilteredInflows / numberOfMonths : 0; // Added
    const averageOut = numberOfMonths > 0 ? totalFilteredOutflows / numberOfMonths : 0; // Added

    return {
      months: filteredMonths,
      inflows: filteredInflows,
      outflows: filteredOutflows,
      savings_average: savingsAverage,
      average_in: averageIn, // Added
      average_out: averageOut, // Added
    };
  });

  // ===========================================================================
  // Effects
  // ===========================================================================
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

      // WARNING ⚠️: doing inflows.values().toArray() causes error in WebKit. IDK WHY! But no problem in Chromium.
      setStats(
        produce((_stats) => {
          _stats.lifetime_inflows_vs_outflows = {
            inflows: lifetimeInflowsVsOutflows.inflows as unknown as number[],
            months: lifetimeInflowsVsOutflows.months,
            outflows: lifetimeInflowsVsOutflows.outflows as unknown as number[],
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

    const _debtors = dataframe.search_debtors(value);

    setDebtors(
      "debtors",
      _debtors.map((d) => ({
        id: d.id,
        balance: d.balance,
        paid: d.paid,
        direction: d.direction,
      }))
    );
  }, 500);

  onMount(() => {
    handleDebtorInput("");
  });

  return (
    <div class="bg-background py-10">
      <div class="max-w-7xl px-4 sm:px-6 lg:px-8">
        <button
          class="grid h-10 w-10 place-items-center rounded-md border text-neutral-800"
          onClick={() => navigate(PageRoutes.Home)}
        >
          <IconChevronLeft />
        </button>
      </div>

      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-2 flex gap-x-1">
          <Show when={sheet.data?.name}>
            <span class="rounded-lg bg-neutral-100 px-3 py-1 text-sm text-neutral-800">
              {sheet.data?.name}
            </span>
          </Show>
          <span class="bg-card text-card-foreground/50 border-border rounded-lg border px-3 py-1 text-sm">
            Last Opened: {formatDate(sheet.data?.last_opened_at ?? new Date())}
          </span>
        </div>
        <h1 class="text-foreground mt-4 mb-8 text-4xl font-bold">
          Here are some insights by Quarta
        </h1>
        <div class="bg-card border-border mb-8 rounded-lg border p-6 shadow-sm">
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
          <div class="bg-card rounded-lg p-6 shadow-sm">
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

          <div class="bg-card overflow-hidden rounded-lg p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold">Lifetime Inflows vs Outflows</h3>

            <div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
              <label class="flex items-center gap-2">
                <span>Min Month:</span>
                <select
                  class="border-border text-foreground bg-background rounded border px-2 py-1"
                  value={minMonth() ?? ""}
                  onChange={(e) => setMinMonth(e.currentTarget.value || null)}
                  disabled={stats.lifetime_inflows_vs_outflows.months.length === 0}
                >
                  <option value="">Start</option>
                  <For each={stats.lifetime_inflows_vs_outflows.months}>
                    {(month) => <option value={month}>{month}</option>}
                  </For>
                </select>
              </label>
              <label class="flex items-center gap-2">
                <span>Max Month:</span>
                <select
                  class="border-border text-foreground bg-background rounded border px-2 py-1"
                  value={maxMonth() ?? ""}
                  onChange={(e) => setMaxMonth(e.currentTarget.value || null)}
                  disabled={stats.lifetime_inflows_vs_outflows.months.length === 0}
                >
                  <option value="">End</option>
                  <For each={stats.lifetime_inflows_vs_outflows.months}>
                    {(month) => <option value={month}>{month}</option>}
                  </For>
                </select>
              </label>
            </div>

            <div class="overflow-x-scroll rounded-lg">
              <div class="w-full">
                <StackedBarChart
                  data={{
                    // Use the filtered data from the memo
                    x: filteredLifetimeInflowsVsOutflows().months,
                    y: [
                      {
                        label: "Inflows",
                        data: filteredLifetimeInflowsVsOutflows().inflows,
                        color: "green",
                      },
                      {
                        label: "Outflows",
                        data: filteredLifetimeInflowsVsOutflows().outflows,
                        color: "red",
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div class="mt-5 flex flex-wrap justify-start gap-2">
              <TrendBadge
                label="Savings Average"
                value={filteredLifetimeInflowsVsOutflows().savings_average * 100}
                variant="accent"
                formatter={(num) => `${num.toFixed(2)}%`}
              />
              <TrendBadge
                label="Average In"
                value={filteredLifetimeInflowsVsOutflows().average_in}
                variant="success"
                formatter={(num) => formatCurrency(num)}
              />
              <TrendBadge
                label="Average Out"
                value={filteredLifetimeInflowsVsOutflows().average_out}
                variant="danger"
                formatter={(num) => `-${formatCurrency(num)}`}
              />
            </div>
          </div>

          <div class="bg-card rounded-lg p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold">Debts Overview</h3>
            <input
              type="text"
              placeholder="Search debts..."
              value={debtSearch()}
              onInput={(e) => {
                setDebtSearch(e.currentTarget.value);
                handleDebtorInput(e.currentTarget.value);
              }}
              class="border-border mb-4 w-full rounded-lg border px-4 py-2"
            />

            <div class="max-h-80 overflow-auto rounded-lg">
              <DataTable
                columns={[
                  {
                    accessorKey: "id",
                  },
                  {
                    accessorKey: "balance",
                    accessorFn: (row) => formatCurrency(row.balance),
                  },
                  {
                    accessorKey: "paid",
                    cell: (props) => (
                      <span class={props.row.original.paid ? "text-green-500" : "text-red-500"}>
                        {props.row.original.paid ? "true" : "false"}
                      </span>
                    ),
                  },
                  {
                    accessorKey: "direction",
                  },
                ]}
                data={debtors.debtors}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;

export function TrendBadge(rawProps: {
  label?: string;
  value: number;
  variant?: "success" | "danger" | "accent";
  formatter?: (num: number) => string;
}) {
  const props = mergeProps(
    {
      label: "Trending",
      variant: "success",
      formatter: (num: number) => num.toFixed(2),
    },
    rawProps
  );

  return (
    <div
      class={cn(
        "flex items-center gap-x-1 self-start rounded-full border border-purple-200 bg-purple-100 px-3 py-1 text-xs",
        props.variant === "success" && "border-green-500 bg-green-100 text-green-500",
        props.variant === "danger" && "border-red-500 bg-red-100 text-red-500",
        props.variant === "accent" && "border-purple-500 bg-purple-100 text-purple-500"
      )}
    >
      <Show when={rawProps.value >= 0}>
        <IconTrendingUp class="h-4 w-4" />
      </Show>
      <Show when={rawProps.value < 0}>
        <IconTrendingDown class="h-4 w-4" />
      </Show>
      {props.label && (
        <span class="flex font-medium">
          {props.label}: {props.formatter(rawProps.value)}
        </span>
      )}
    </div>
  );
}
