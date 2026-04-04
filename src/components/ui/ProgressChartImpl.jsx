import {
  Cell,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useTheme } from "../../hooks/useTheme";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export default function ProgressChartImpl({ data }) {
  const { theme } = useTheme();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="30%"
        outerRadius="100%"
        barSize={20}
        data={data}
        startAngle={90}
        endAngle={450}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          angleAxisId={0}
          tick={false}
        />
        <RadialBar
          minAngle={15}
          background={{ fill: theme === "dark" ? "#374151" : "#f3f4f6" }}
          clockWise
          dataKey="value"
          cornerRadius={10}
          isAnimationActive={true}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${entry.id}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </RadialBar>
        <Tooltip
          cursor={false}
          formatter={(value, name, props) => [`${value}%`, props.payload.name]}
          contentStyle={{
            backgroundColor:
              theme === "dark"
                ? "rgba(31,41,55,0.95)"
                : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            borderRadius: "12px",
            border:
              theme === "dark" ? "1px solid #374151" : "1px solid #e5e7eb",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            color: theme === "dark" ? "#f3f4f6" : "#111827",
          }}
        />
        <Legend
          iconSize={10}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{
            fontSize: "12px",
            fontWeight: 500,
            color: theme === "dark" ? "#d1d5db" : "#1f2937",
          }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
