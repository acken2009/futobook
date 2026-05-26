"use client";

/**
 * 売上推移グラフ（SVGベース・依存ライブラリなし）
 */
interface DataPoint {
  date: string;
  revenue: number;
}

interface Props {
  data: DataPoint[];
}

export function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        データがありません
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const width = 800;
  const height = 200;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, i) => ({
    x: paddingX + (i / (data.length - 1)) * chartWidth,
    y: paddingY + chartHeight - (d.revenue / maxRevenue) * chartHeight,
    revenue: d.revenue,
    date: d.date,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${points[points.length - 1].x} ${paddingY + chartHeight}` +
    ` L ${points[0].x} ${paddingY + chartHeight} Z`;

  // Y軸のラベル（0, 最大値/2, 最大値）
  const yLabels = [0, Math.round(maxRevenue / 2), maxRevenue];

  // X軸ラベル（5件おきに表示）
  const xLabels = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + 30}`}
        className="w-full"
        style={{ minWidth: "400px" }}
      >
        {/* グリッド線 */}
        {yLabels.map((val) => {
          const y = paddingY + chartHeight - (val / maxRevenue) * chartHeight;
          return (
            <g key={val}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={paddingX - 4}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {val === 0 ? "¥0" : val >= 10000 ? `¥${(val / 10000).toFixed(0)}万` : `¥${val}`}
              </text>
            </g>
          );
        })}

        {/* エリア */}
        <path d={areaD} fill="#3B82F6" fillOpacity="0.1" />

        {/* ライン */}
        <path
          d={pathD}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* データポイント（売上がある日のみ） */}
        {points
          .filter((p) => p.revenue > 0)
          .map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#3B82F6"
              stroke="white"
              strokeWidth="1.5"
            />
          ))}

        {/* X軸ラベル */}
        {xLabels.map((d) => {
          const idx = data.findIndex((item) => item.date === d.date);
          const x = paddingX + (idx / (data.length - 1)) * chartWidth;
          return (
            <text
              key={d.date}
              x={x}
              y={height + 20}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
            >
              {d.date}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
