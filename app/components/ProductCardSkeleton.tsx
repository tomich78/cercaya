export default function ProductCardSkeleton() {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      overflow: "hidden",
    }}>
      {/* Imagen */}
      <div className="skeleton" style={{ height: 128 }} />

      {/* Info */}
      <div style={{ padding: "11px 13px 13px" }}>
        <div className="skeleton" style={{ height: 13, width: "80%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 15, width: "45%", marginBottom: 10 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="skeleton" style={{ height: 11, width: "38%" }} />
          <div className="skeleton" style={{ height: 11, width: "25%" }} />
        </div>
      </div>
    </div>
  );
}
