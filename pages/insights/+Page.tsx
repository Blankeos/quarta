import getTitle from "@/utils/get-title";
import { createMutation } from "@tanstack/solid-query";
import { Component, createSignal } from "solid-js";
import { useMetadata } from "vike-metadata-solid";

const Page: Component = () => {
  const [debtSearch, setDebtSearch] = createSignal("");

  const downloadedCsvMutation = createMutation(() => ({
    mutationKey: ["csv-content"],
  }));

  useMetadata({
    title: getTitle("Financial Insights"),
  });

  return (
    <>
      <pre>1231 {JSON.stringify(downloadedCsvMutation.data)}</pre>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-8">Here are some insights by Quarta</h1>

        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 class="text-xl font-semibold mb-4">AI-Powered Summary</h2>
          <p class="text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Your financial health looks
            good with stable income and controlled spending patterns.
          </p>
        </div>

        <div class="flex gap-8 mb-8">
          <div class="bg-blue-100 rounded-full px-4 py-2">
            <span class="font-medium">Total Income: $120,000</span>
          </div>
          <div class="bg-green-100 rounded-full px-4 py-2">
            <span class="font-medium">Monthly Savings: 25%</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-8">
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold mb-4">Total Earn vs Total Spend</h3>
            <div class="bg-gray-200 h-48 rounded-lg"></div>
          </div>

          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold mb-4">Lifetime Inflows vs Outflows</h3>
            <div class="bg-gray-200 h-48 rounded-lg"></div>
          </div>

          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold mb-4">Monthly Inflows vs Outflows</h3>
            <div class="bg-gray-200 h-48 rounded-lg"></div>
          </div>

          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold mb-4">Debts Overview</h3>
            <input
              type="text"
              placeholder="Search debts..."
              value={debtSearch()}
              onInput={(e) => setDebtSearch(e.currentTarget.value)}
              class="w-full px-4 py-2 border rounded-lg mb-4"
            />
            <div class="bg-gray-200 h-32 rounded-lg"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;
