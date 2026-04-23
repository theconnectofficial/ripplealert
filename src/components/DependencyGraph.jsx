import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Card, CardHead, Badge, Btn, IconBtn, PageWrap, PageHeader, EmptyState, Tag, useToast, downloadFile } from "./ui";

const SEV_COLOR = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#38bdf8", LOW: "#22c55e" };

export default function DependencyGraph({ cveData, onRemediate, onNavigate }) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const simRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [sevFilter, setSevFilter] = useState({ CRITICAL: true, HIGH: true, MEDIUM: true, LOW: true });
  const { push } = useToast();

  const filtered = useMemo(() => {
    if (!cveData) return null;
    const allow = (s) => sevFilter[s];
    const nodes = cveData.nodes.filter(n => allow(n.severity) || n.level === 0);
    const idset = new Set(nodes.map(n => n.id));
    const edges = cveData.edges.filter(e => {
      const s = typeof e.source === "object" ? e.source.id : e.source;
      const t = typeof e.target === "object" ? e.target.id : e.target;
      return idset.has(s) && idset.has(t);
    });
    return { ...cveData, nodes, edges };
  }, [cveData, sevFilter]);

  useEffect(() => {
    if (!filtered || !svgRef.current) return;
    const container = svgRef.current.parentElement;
    const W = container.clientWidth || 800;
    const H = 460;

    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3.select(svgRef.current).attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`);
    const defs = svg.append("defs");

    // Grid pattern
    const pat = defs.append("pattern").attr("id", "grid").attr("width", 32).attr("height", 32).attr("patternUnits", "userSpaceOnUse");
    pat.append("path").attr("d", "M32 0 L0 0 0 32").attr("fill", "none").attr("stroke", "rgba(255,255,255,0.03)").attr("stroke-width", 1);
    svg.append("rect").attr("width", W).attr("height", H).attr("fill", "url(#grid)");

    // Glow
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const fm = filter.append("feMerge");
    fm.append("feMergeNode").attr("in", "coloredBlur");
    fm.append("feMergeNode").attr("in", "SourceGraphic");

    defs.append("marker").attr("id", "arrow").attr("viewBox", "0 -5 10 10").attr("refX", 28).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#2a2a3a");

    const nodes = filtered.nodes.map(n => ({ ...n }));
    const edges = filtered.edges.map(e => ({ ...e }));

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id(d => d.id).distance(130))
      .force("charge", d3.forceManyBody().strength(-420))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(46));
    simRef.current = sim;

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.3, 2.8]).on("zoom", e => g.attr("transform", e.transform));
    svg.call(zoom);
    zoomRef.current = { svg, zoom };

    const link = g.append("g").selectAll("line").data(edges).join("line")
      .attr("stroke", "#1e1e2e").attr("stroke-width", 1.5).attr("marker-end", "url(#arrow)");

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .attr("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("click", (e, d) => { e.stopPropagation(); setSelectedNode(d); });

    // Outer glow ring
    node.append("circle")
      .attr("r", d => d.level === 0 ? 36 : 24)
      .attr("fill", "none")
      .attr("stroke", d => SEV_COLOR[d.severity] || "#888")
      .attr("stroke-width", d => d.level === 0 ? 2.5 : 1.5)
      .attr("opacity", 0.45)
      .attr("filter", "url(#glow)");

    node.append("circle")
      .attr("r", d => d.level === 0 ? 30 : 20)
      .attr("fill", d => d.level === 0 ? (SEV_COLOR[d.severity] + "33") : "#0f101e")
      .attr("stroke", d => SEV_COLOR[d.severity] || "#888")
      .attr("stroke-width", 1.8);

    node.append("text")
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", d => d.level === 0 ? "15px" : "11px")
      .attr("font-weight", 700)
      .attr("fill", d => SEV_COLOR[d.severity] || "#888")
      .text(d => d.level === 0 ? "⚠" : d.type === "direct" ? "◈" : "◇");

    node.append("text")
      .attr("y", d => d.level === 0 ? 46 : 34)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "#8488a8")
      .attr("font-family", "var(--font-mono)")
      .each(function (d) {
        const parts = d.label.split("\n");
        const el = d3.select(this);
        parts.forEach((p, i) => el.append("tspan").attr("x", 0).attr("dy", i === 0 ? 0 : "1.1em").text(p));
      });

    sim.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    svg.on("click", () => setSelectedNode(null));

    return () => sim.stop();
  }, [filtered]);

  const zoomBy = (factor) => {
    if (!zoomRef.current) return;
    zoomRef.current.svg.transition().duration(250).call(zoomRef.current.zoom.scaleBy, factor);
  };
  const fit = () => {
    if (!zoomRef.current) return;
    zoomRef.current.svg.transition().duration(280).call(zoomRef.current.zoom.transform, d3.zoomIdentity);
    simRef.current?.alpha(0.6).restart();
  };

  const exportSVG = () => {
    if (!svgRef.current || !cveData) return;
    const clone = svgRef.current.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    downloadFile(`${cveData.id}-propagation.svg`, xml, "image/svg+xml");
    push({ type: "success", message: "Graph exported as SVG" });
  };

  const exportJSON = () => {
    if (!cveData) return;
    downloadFile(`${cveData.id}.json`, JSON.stringify(cveData, null, 2), "application/json");
    push({ type: "success", message: "CVE data exported as JSON" });
  };

  if (!cveData) return (
    <PageWrap>
      <PageHeader icon="⬡" title="Propagation Graph" sub="Visualize the downstream blast radius of any CVE" />
      <Card>
        <EmptyState
          icon="⬡"
          title="No active analysis"
          hint="Run a scan from the Scanner to see a force-directed graph of every downstream package affected by the vulnerability."
          action={<Btn variant="primary" onClick={() => onNavigate("scanner")}>Open Scanner →</Btn>}
        />
      </Card>
    </PageWrap>
  );

  return (
    <PageWrap>
      <PageHeader
        icon="⬡"
        title="Propagation Graph"
        sub={`${cveData.id} · ${cveData.affectedPackage} · ${cveData.nodes?.length || 0} nodes · ${cveData.edges?.length || 0} edges`}
        right={<>
          <Btn onClick={() => onNavigate("scanner")}>← Scanner</Btn>
          <Btn onClick={exportSVG}>Export SVG</Btn>
          <Btn onClick={exportJSON}>Export JSON</Btn>
          <Btn onClick={onRemediate} variant="primary">✦ Generate Patch Issues</Btn>
        </>}
      />

      <Card style={{ marginBottom: 14 }} pad={false}>
        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Dependency Blast Radius</div>
            <Tag>{Object.values(sevFilter).filter(Boolean).length}/4 severities</Tag>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Object.keys(SEV_COLOR).map(sev => (
              <button
                key={sev}
                onClick={() => setSevFilter(p => ({ ...p, [sev]: !p[sev] }))}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 9px", borderRadius: 6, fontSize: 10, fontWeight: 500,
                  background: sevFilter[sev] ? "var(--bg3)" : "transparent",
                  border: `1px solid ${sevFilter[sev] ? "var(--brd2)" : "transparent"}`,
                  color: sevFilter[sev] ? "var(--text)" : "var(--muted)",
                  opacity: sevFilter[sev] ? 1 : 0.45,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                title={`Toggle ${sev}`}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: SEV_COLOR[sev] }} />
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--bg)", height: 460, position: "relative" }}>
          <svg ref={svgRef} style={{ width: "100%", height: 460 }} />

          {/* Graph controls */}
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <IconBtn title="Zoom in" onClick={() => zoomBy(1.3)}>＋</IconBtn>
            <IconBtn title="Zoom out" onClick={() => zoomBy(1 / 1.3)}>−</IconBtn>
            <IconBtn title="Reset view" onClick={fit}>⟲</IconBtn>
          </div>

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 14, left: 14,
            background: "rgba(10,11,24,0.7)", backdropFilter: "blur(6px)",
            border: "1px solid var(--border)", borderRadius: 9, padding: "8px 12px",
            display: "flex", flexDirection: "column", gap: 5,
          }}>
            {[["⚠", "Vulnerable root"], ["◈", "Direct dependency"], ["◇", "Transitive"]].map(([icon, lbl]) => (
              <div key={lbl} style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 10, color: "var(--muted)" }}>
                <span style={{ width: 14, textAlign: "center", color: "var(--accent2)" }}>{icon}</span> {lbl}
              </div>
            ))}
          </div>

          <div style={{ position: "absolute", bottom: 14, right: 14, fontSize: 9.5, color: "var(--muted)", background: "rgba(10,11,24,0.6)", padding: "4px 9px", borderRadius: 6, border: "1px solid var(--border)" }}>
            Drag nodes · Scroll to zoom · Click for details
          </div>
        </div>
      </Card>

      {/* Node Inspector */}
      {selectedNode ? (
        <Card>
          <CardHead
            title="Node Inspector"
            sub={selectedNode.id}
            right={<Btn size="sm" variant="accent" onClick={onRemediate}>✦ Draft Patch Issue</Btn>}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            {[
              { label: "Package",       value: selectedNode.id,              color: "#fff" },
              { label: "Version",       value: selectedNode.version || "—",  color: "var(--text2)", mono: true },
              { label: "Level",         value: `L${selectedNode.level}`,     color: SEV_COLOR[selectedNode.severity] },
              { label: "Type",          value: selectedNode.type || "transitive", color: "var(--text2)" },
              { label: "Severity",      value: selectedNode.severity,        color: SEV_COLOR[selectedNode.severity] },
              { label: "Fix Available", value: selectedNode.fixAvailable ? "Yes" : "No", color: selectedNode.fixAvailable ? "var(--green)" : "var(--muted)" },
              { label: "Weekly DLs",    value: selectedNode.downloads ? selectedNode.downloads.toLocaleString() : "—", color: "var(--accent2)", mono: true, span: 2 },
            ].map((item, i) => (
              <div key={i} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px", gridColumn: item.span ? `span ${item.span}` : undefined }}>
                <div style={{ fontFamily: item.mono ? "var(--font-mono)" : "var(--font-mono)", fontSize: 13.5, fontWeight: 600, color: item.color, marginBottom: 5 }}>{item.value}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: "center", padding: "22px", fontSize: 11.5, color: "var(--muted)" }}>
            Click any node in the graph to inspect its details
          </div>
        </Card>
      )}
    </PageWrap>
  );
}
