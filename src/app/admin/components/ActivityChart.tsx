'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
)

export default function ActivityChart() {

  const data = {
    labels: [
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
      'Minggu',
    ],

    datasets: [
      {
        label: 'Easy',

        data: [
          35,
          42,
          50,
          45,
          60,
          30,
          25,
        ],

        borderColor: '#5BABD0',

        backgroundColor: 'rgba(91, 171, 208, 0.15)',

        borderWidth: 3,

        tension: 0.4,

        fill: true,

        pointRadius: 5,

        pointHoverRadius: 7,
      },

      {
        label: 'Medium',

        data: [
          20,
          28,
          35,
          30,
          42,
          18,
          15,
        ],

        borderColor: '#3A929C',

        backgroundColor: 'rgba(58, 146, 156, 0.10)',

        borderWidth: 3,

        tension: 0.4,

        fill: false,

        pointRadius: 5,

        pointHoverRadius: 7,
      },

      {
        label: 'Hard',

        data: [
          10,
          15,
          20,
          18,
          25,
          12,
          8,
        ],

        borderColor: '#EF4444',

        backgroundColor: 'rgba(239, 68, 68, 0.10)',

        borderWidth: 3,

        tension: 0.4,

        fill: false,

        pointRadius: 5,

        pointHoverRadius: 7,
      },
    ],
  }

  const options = {
    responsive: true,

    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: true,

        position: 'top' as const,
      },

      tooltip: {
        enabled: true,
      },
    },

    scales: {
      y: {
        beginAtZero: true,

        ticks: {
          stepSize: 10,
        },
      },
    },
  }

  return (
    <div className="activity-chart-container">

      <div className="chart-header">
        <h3>Aktivitas Pembelajaran</h3>

        <p>
          Jumlah modul yang diselesaikan berdasarkan level
        </p>
      </div>

      <div className="chart-wrapper">

        <Line
          data={data}
          options={options}
        />

      </div>

    </div>
  )
}