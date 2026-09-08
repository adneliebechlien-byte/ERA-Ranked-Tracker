// Enkel, ren SVG-sparkline uten avhengigheter. Tar en liste med kumulative
// tall (f.eks. netto seiere-tap over tid) og tegner en linje, farget etter
// om trenden totalt sett er positiv eller negativ.

export function Sparkline({
  values,
  width = 100,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return <div style={{ width, height }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const trendingUp = values[values.length - 1] >= values[0];
  const color = trendingUp ? "var(--win)" : "var(--loss)";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
