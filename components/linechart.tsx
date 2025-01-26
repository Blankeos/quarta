import { Chart } from "chart.js";

export function LineChart() {
  let chartCanvas!: HTMLCanvasElement;
  let chartInstance: Chart;

  const updateChart = (data: any) => {
    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: data?.map((l) => l.label) ?? [],
        datasets: [
          {
            label: "Income",
            data: data?.map((c) => Math.max(0, c.income)) ?? [],
            borderColor: "rgba(74, 222, 128, 1)",
            backgroundColor: "rgba(74, 222, 128, 0.2)",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 0,
            beginAtZero: true,
            ticks: {
              // @ts-expect-error
              callback: (value: number) => {
                return "₱" + value.toLocaleString("en-PH");
              },
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context: any) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label += "₱" + context.parsed.y.toLocaleString("en-PH");
                }
                return label;
              },
            },
          },
        },
      },
    });
  };

  return (
    <div class="w-full max-w-5xl">
      <canvas ref={chartCanvas} class="max-w-full" />
    </div>
  );
}
