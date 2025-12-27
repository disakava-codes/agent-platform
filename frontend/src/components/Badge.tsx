type Props = { label: string; tone?: "green" | "orange" | "red" | "gray" };

export default function Badge({ label, tone = "gray" }: Props) {
  const map = {
    green: { bg: "#e7f7ee", fg: "#137a3a", bd: "#bfe8cf" },
    orange: { bg: "#fff3e0", fg: "#a35a00", bd: "#ffd7a6" },
    red: { bg: "#fdecec", fg: "#a81616", bd: "#f6b8b8" },
    gray: { bg: "#f3f4f6", fg: "#374151", bd: "#e5e7eb" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        border: `1px solid ${map.bd}`,
        background: map.bg,
        color: map.fg,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </span>
  );
}

