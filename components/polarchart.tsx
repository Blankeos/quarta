import { Chart } from "chart.js/auto";

import { createEffect } from "solid-js";

type Props = {
  chartLabel?: string;
  data: {
    value: number;
    label: string;
    color?: string;
  }[];
};

export function PolarChart(props: Props) {
  let chartCanvas!: HTMLCanvasElement;
  let chartInstance: Chart;

  const updateChart = (data: Props["data"], chartLabel?: string) => {
    if (chartInstance) {
      chartInstance.destroy();
    }

    const labels: string[] = [];
    const values: number[] = [];
    const colors: string[] = [];
    for (const d of data) {
      labels.push(d.label);
      values.push(d.value);
      colors.push(d.color || "rgba(74, 222, 128, 1)");
    }

    chartInstance = new Chart(chartCanvas, {
      type: "polarArea",
      data: {
        labels: labels,
        datasets: [
          {
            label: chartLabel,
            data: values,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  };

  createEffect(() => {
    updateChart(props.data, props.chartLabel);
  });

  return (
    <div class="w-full max-w-5xl">
      <canvas ref={chartCanvas} class="max-h-full max-w-full" />
    </div>
  );
}
