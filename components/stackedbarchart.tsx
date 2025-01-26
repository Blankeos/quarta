import { Chart } from "chart.js/auto";

import { createEffect } from "solid-js";

type Props = {
  chartLabel?: string;
  data: {
    x: (string | number)[];
    y: {
      label: string;
      data: number[];
      color?: string;
    }[];
  };
};

export function StackedBarChart(props: Props) {
  let chartCanvas!: HTMLCanvasElement;
  let chartInstance: Chart;

  const updateChart = (data: Props["data"]) => {
    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: data.x,
        datasets: data.y.map((y) => ({
          label: y.label,
          data: y.data,
          backgroundColor: y.color ?? "rgb(255, 99, 132)",
        })),
      },
      options: {
        responsive: true,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
          },
        },
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  };

  createEffect(() => {
    updateChart(props.data);
  });

  return (
    <div class="w-full max-w-5xl">
      <canvas ref={chartCanvas} class="max-h-full max-w-full" />
    </div>
  );
}
