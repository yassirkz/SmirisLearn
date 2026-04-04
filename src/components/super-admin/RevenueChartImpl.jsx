import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export default function RevenueChartImpl({ data, theme, CustomTooltip }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-400 dark:text-gray-500">
          Aucun résultat trouvé
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      minHeight={256}
      debounce={50}
    >
      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={85}
          paddingAngle={8}
          dataKey="value"
          stroke="none"
          animationBegin={0}
          animationDuration={1500}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{
            paddingTop: "25px",
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
