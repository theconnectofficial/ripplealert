import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import raLogo from "../assets/ralogo.png";

/* ─────────────────────────────────────────────────────────────────────────────
   RippleAlert — Landing Page
   HackHelix 2026 · Cybersecurity / Threat Intelligence aesthetic
   Single self-contained component. No external animation libs.
   ───────────────────────────────────────────────────────────────────────────── */

const C = {
  bg:     "#03040a",
  bg1:    "#080910",
  bg2:    "#0d0e1a",
  red:    "#f03e3e",
  indigo: "#6366f1",
  text:   "#e8e8f0",
  muted:  "#52536a",
  border: "rgba(255,255,255,0.06)",
  brd2:   "rgba(255,255,255,0.10)",
};

const FONT_HEAD = "'Syne', 'Inter', sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace";

/* ─────────────────────────────────────────────────────────────────────────────
   3D dependency graph background (Three.js)
   ───────────────────────────────────────────────────────────────────────────── */
function DependencyGraph3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width  = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03040a, 0.045);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
    camera.position.set(0, 0, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Build a 3D dependency-tree-like cluster ──────────────────────────────
    const NODE_COUNT = 70;
    const nodes = [];
    const positions = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      const isVulnerable = i < 5;                  // central nodes red
      const radius = isVulnerable ? 2 + Math.random() * 3 : 6 + Math.random() * 14;
      const theta  = Math.random() * Math.PI * 2;
      const phi    = Math.acos(2 * Math.random() - 1);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const color = isVulnerable
        ? new THREE.Color(0xf03e3e)
        : Math.random() < 0.35
          ? new THREE.Color(0x6366f1)
          : new THREE.Color(0x2a2c44);

      const geo = new THREE.SphereGeometry(isVulnerable ? 0.32 : 0.16, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isVulnerable ? 0.95 : 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = {
        baseScale: 1,
        pulse: Math.random() * Math.PI * 2,
        isVulnerable,
      };
      scene.add(mesh);
      nodes.push(mesh);
      positions.push(new THREE.Vector3(x, y, z));
    }

    // ── Build connecting edges between nearby nodes ──────────────────────────
    const edgePositions = [];
    const edgeColors = [];
    const MAX_DIST = 4.5;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const d = positions[i].distanceTo(positions[j]);
        if (d < MAX_DIST) {
          edgePositions.push(positions[i].x, positions[i].y, positions[i].z);
          edgePositions.push(positions[j].x, positions[j].y, positions[j].z);
          const t = 1 - d / MAX_DIST;
          // central edges lean red, outer edges lean indigo
          const isCenter = positions[i].length() < 5 || positions[j].length() < 5;
          const c = isCenter
            ? new THREE.Color(0xf03e3e).multiplyScalar(0.4 + 0.4 * t)
            : new THREE.Color(0x6366f1).multiplyScalar(0.25 + 0.4 * t);
          edgeColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      }
    }

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
    edgeGeo.setAttribute("color",    new THREE.Float32BufferAttribute(edgeColors, 3));
    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    scene.add(edges);

    // ── Mouse parallax ───────────────────────────────────────────────────────
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onMouseMove = (e) => {
      target.x = (e.clientX / window.innerWidth  - 0.5) * 0.8;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.8;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Animate ──────────────────────────────────────────────────────────────
    let frameId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();

      // smooth parallax
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;

      scene.rotation.y = t * 0.06 + current.x * 0.6;
      scene.rotation.x = Math.sin(t * 0.04) * 0.15 + current.y * 0.4;

      // pulse vulnerable nodes
      for (const n of nodes) {
        if (n.userData.isVulnerable) {
          const s = 1 + Math.sin(t * 2 + n.userData.pulse) * 0.25;
          n.scale.setScalar(s);
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      nodes.forEach((n) => { n.geometry.dispose(); n.material.dispose(); });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute", inset: 0,
        opacity: 0.45,
        pointerEvents: "none",
        willChange: "transform",
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Perspective threat grid + ripple (CSS / canvas)
   ───────────────────────────────────────────────────────────────────────────── */
function ThreatGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio, 2);

    const resize = () => {
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const ripples = [];
    let lastEmit = 0;
    let frameId = 0;
    const start = performance.now();

    const draw = (now) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (now - lastEmit > 1400) {
        ripples.push({ born: now });
        lastEmit = now;
        if (ripples.length > 5) ripples.shift();
      }

      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.max(w, h) * 0.55;

      for (const r of ripples) {
        const age = (now - r.born) / 3200;
        if (age > 1) continue;
        const radius = age * maxR;
        const alpha  = (1 - age) * 0.55;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(240, 62, 62, ${alpha})`;
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();

        // inner indigo halo
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.45})`;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      }

      // central glow
      const pulse = 0.5 + 0.5 * Math.sin((now - start) / 600);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 * dpr);
      grd.addColorStop(0, `rgba(240,62,62,${0.5 + pulse * 0.3})`);
      grd.addColorStop(1, "rgba(240,62,62,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, 60 * dpr, 0, Math.PI * 2);
      ctx.fill();

      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: "55%",
        perspective: "900px",
        pointerEvents: "none",
        maskImage: "linear-gradient(to top, rgba(0,0,0,0.9) 25%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.9) 25%, transparent 100%)",
      }}
    >
      <div
        style={{
          position: "absolute", inset: 0,
          transform: "rotateX(62deg) translateZ(0)",
          transformOrigin: "center bottom",
          backgroundImage:
            "linear-gradient(to right, rgba(240,62,62,0.18) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(99,102,241,0.14) 1px, transparent 1px)",
          backgroundSize: "60px 60px, 60px 60px",
          willChange: "transform",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          transform: "rotateX(62deg)",
          transformOrigin: "center bottom",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Animated counter (rAF, triggered when in view)
   ───────────────────────────────────────────────────────────────────────────── */
function Counter({ to, suffix = "", duration = 1600 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const t0 = performance.now();
            const tick = (now) => {
              const p = Math.min(1, (now - t0) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setVal(Math.floor(eased * to));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {val.toLocaleString()}{suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Landing Page
   ───────────────────────────────────────────────────────────────────────────── */
export default function LandingPage({ onLaunch }) {
  const navigate = useNavigate();
  const launch = useCallback(() => {
    if (onLaunch) onLaunch();
    else navigate("/login");
  }, [onLaunch, navigate]);

  const heroRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // Navbar opacity on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal-on-scroll observer
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Cursor glow on hero
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const onMove = (e) => {
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      hero.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    hero.addEventListener("mousemove", onMove);
    return () => hero.removeEventListener("mousemove", onMove);
  }, []);

  const scrollToDemo = () => {
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={pageStyle}>
      <style>{globalCSS}</style>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav style={{
        ...navStyle,
        background: scrolled ? "rgba(3,4,10,0.78)" : "rgba(3,4,10,0.0)",
        backdropFilter: scrolled ? "blur(14px) saturate(160%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px) saturate(160%)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
      }}>
        <div style={navInner}>
          <div style={logoStyle}>
            <img src={raLogo} alt="RippleAlert" style={logoImg} />
            <span style={logoText}>RippleAlert</span>
          </div>
          <div style={navLinks}>
            {NAV_ITEMS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                style={navLink}
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
                }}
              >{label}</a>
            ))}
          </div>
          <button onClick={launch} style={navCTA}>
            Launch App <span style={{ marginLeft: 6 }}>→</span>
          </button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={heroStyle}>
        <div className="hero-cursor-glow" />
        <DependencyGraph3D />
        <ThreatGrid />

        <div style={heroContent}>
          <div style={heroEyebrow}>
            <span style={{ color: C.red }}>●</span>
            <span>CVE PROPAGATION INTELLIGENCE</span>
          </div>

          <h1 style={heroH1}>
            One <span style={{ color: C.red, position: "relative" }}>
              CVE
              <span style={heroUnderline} />
            </span>.
            <br />
            <span style={{ opacity: 0.55 }}>A thousand silent victims.</span>
          </h1>

          <p style={heroSub}>
            RippleAlert maps the full blast radius of any vulnerability across the
            npm and PyPI ecosystem — and auto-drafts patch requests using Gemini AI.
          </p>

          <div style={heroCTAs}>
            <button onClick={launch} className="btn-primary" style={btnPrimary}>
              Launch App <span style={{ marginLeft: 6 }}>→</span>
            </button>
            <button onClick={scrollToDemo} style={btnGhost}>
              View Demo
            </button>
          </div>

          <div style={heroPills}>
            <Pill><Counter to={38} /> CVEs analyzed</Pill>
            <PillDot />
            <Pill><Counter to={2847} /> packages mapped</Pill>
            <PillDot />
            <Pill><Counter to={91} /> issues drafted</Pill>
          </div>
        </div>

        <div style={scrollIndicator}>
          <div className="scroll-dot" />
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.muted, letterSpacing: 2 }}>
            SCROLL
          </span>
        </div>
      </section>

      {/* ── PROBLEM ───────────────────────────────────────────────────────── */}
      <section id="problem" style={section}>
        <div data-reveal className="reveal" style={sectionHead}>
          <Eyebrow color={C.red}>THE PROBLEM</Eyebrow>
          <h2 style={h2}>The Silent Epidemic</h2>
          <p style={subH}>
            Most developers discover they were vulnerable months after the breach.
          </p>
        </div>
        <div style={grid3}>
          {PROBLEMS.map((p, i) => (
            <div key={p.title} data-reveal className="reveal problem-card" style={problemCard}>
              <div style={problemNum}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{p.icon}</div>
              <h3 style={cardTitle}>{p.title}</h3>
              <p style={cardBody}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" style={{ ...section, background: "linear-gradient(180deg, transparent, rgba(99,102,241,0.025), transparent)" }}>
        <div data-reveal className="reveal" style={sectionHead}>
          <Eyebrow color={C.indigo}>CAPABILITIES</Eyebrow>
          <h2 style={h2}>Full Spectrum Defense</h2>
          <p style={subH}>From CVE ingestion to auto-drafted patch issues — end to end.</p>
        </div>
        <div style={grid2} className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} data-reveal className="reveal feature-card" style={featureCard}>
              <div style={featureIcon}>{f.icon}</div>
              <h3 style={cardTitle}>{f.title}</h3>
              <p style={cardBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how" style={{ ...section, ...sectionGridBg }}>
        <div data-reveal className="reveal" style={sectionHead}>
          <Eyebrow color={C.red}>WORKFLOW</Eyebrow>
          <h2 style={h2}>From CVE to Patch in Seconds</h2>
          <p style={subH}>
            Five steps. No manual triage. No spreadsheets. No guessing.
          </p>
        </div>
        <div data-reveal className="reveal" style={stepsRow}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <div style={stepCol}>
                <div style={stepCircle}>{String(i + 1).padStart(2, "0")}</div>
                <div style={stepTitle}>{s.title}</div>
                <div style={stepBody}>{s.body}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={stepArrow}>
                  <span className="travel-dot" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────────────────────────────────── */}
      <section id="stack" style={section}>
        <div data-reveal className="reveal" style={sectionHead}>
          <Eyebrow color={C.indigo}>UNDER THE HOOD</Eyebrow>
          <h2 style={h2}>Built on the Right Stack</h2>
          <p style={subH}>Production-grade primitives, no over-engineering.</p>
        </div>
        <div style={grid3}>
          {STACK.map((s) => (
            <div key={s.layer} data-reveal className="reveal" style={stackCard}>
              <div style={stackTop}>
                <span style={stackLayer}>{s.layer}</span>
                <span style={{ ...stackDot, background: s.dot }} />
              </div>
              <div style={stackTech}>{s.tech}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO ──────────────────────────────────────────────────────────── */}
      <section id="demo" style={section}>
        <div data-reveal className="reveal" style={sectionHead}>
          <Eyebrow color={C.red}>LIVE DEMO</Eyebrow>
          <h2 style={h2}>See it in Action</h2>
          <p style={subH}>A glimpse of the dashboard in operational mode.</p>
        </div>

        <div data-reveal className="reveal" style={demoFrameWrap}>
          <div style={demoFrame}>
            <div style={browserBar}>
              <span style={{ ...dot, background: "#ff5f57" }} />
              <span style={{ ...dot, background: "#febc2e" }} />
              <span style={{ ...dot, background: "#28c840" }} />
              <div style={addressBar}>ripplealert.app/scan/CVE-2021-44228</div>
            </div>
            <div style={demoBody}>
              <div style={demoHeader}>
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted, letterSpacing: 1 }}>
                    SCAN RESULT
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: C.text, marginTop: 4 }}>
                    CVE-2021-44228 <span style={{ color: C.muted }}>· Log4Shell</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge color={C.red}>CRITICAL · 10.0</Badge>
                  <Badge color={C.indigo}>JAVA</Badge>
                  <Badge color="#22c55e">PATCHED</Badge>
                </div>
              </div>

              <div style={demoStats}>
                <DemoStat label="In Blast Radius" value="15" accent={C.red} />
                <DemoStat label="Direct Deps"     value="3"  accent={C.indigo} />
                <DemoStat label="Transitive"      value="12" accent={C.indigo} />
                <DemoStat label="Issues Drafted"  value="7"  accent="#22c55e" />
              </div>

              <div style={demoGraph}>
                <DemoGraphSVG />
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 22, color: C.muted, fontFamily: FONT_MONO, fontSize: 12 }}>
            Live demo — CVE-2021-44228 (Log4Shell) · 15 packages in blast radius · 7 issues drafted
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{ ...section, paddingBottom: 60 }}>
        <div data-reveal className="reveal" style={ctaCard}>
          <h2 style={{ ...h2, marginBottom: 14 }}>Map your blast radius.</h2>
          <p style={{ ...subH, marginBottom: 28 }}>
            Try RippleAlert with a real CVE. No signup required for the demo.
          </p>
          <button onClick={launch} className="btn-primary" style={{ ...btnPrimary, fontSize: 15, padding: "14px 28px" }}>
            Launch App <span style={{ marginLeft: 6 }}>→</span>
          </button>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={footerStyle}>
        <div style={footerTop}>
          {/* Brand column */}
          <div style={footerBrand}>
            <div style={{ ...logoStyle, marginBottom: 14 }}>
              <img src={raLogo} alt="RippleAlert" style={logoImg} />
              <span style={logoText}>RippleAlert</span>
            </div>
            <p style={footerTagline}>
              CVE Propagation Intelligence — maps the full blast radius of any
              vulnerability and auto-drafts patch requests using Gemini AI.
            </p>
            <div style={footerBadges}>
              <span style={footerBadge}>HackHelix 2026</span>
              <span style={footerBadge}>Runtime Hackers</span>
            </div>
          </div>

          {/* Navigation columns — each is its own direct grid child */}
          <div style={footerCol}>
            <div style={footerColHead}>PRODUCT</div>
            {NAV_ITEMS.map(({ label, href }) => (
              <a key={href} href={href} style={footerNavLink} className="footer-link"
                onClick={(e) => { e.preventDefault(); document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }); }}
              >{label}</a>
            ))}
            <a href="#" style={footerNavLink} className="footer-link" onClick={(e) => { e.preventDefault(); launch(); }}>Launch App →</a>
          </div>
          <div style={footerCol}>
            <div style={footerColHead}>POWERED BY</div>
            <a href="https://nvd.nist.gov" target="_blank" rel="noreferrer" style={footerNavLink} className="footer-link">NVD NIST API</a>
            <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noreferrer" style={footerNavLink} className="footer-link">Gemini 2.0 Flash</a>
            <a href="https://d3js.org" target="_blank" rel="noreferrer" style={footerNavLink} className="footer-link">D3.js</a>
            <a href="https://vercel.com" target="_blank" rel="noreferrer" style={footerNavLink} className="footer-link">Vercel</a>
            <a href="https://supabase.com" target="_blank" rel="noreferrer" style={footerNavLink} className="footer-link">Supabase Auth</a>
          </div>
          <div style={footerCol}>
            <div style={footerColHead}>TEAM</div>
            <span style={{ ...footerNavLink, cursor: "default" }}>Built by TEAM ELITE</span>
            <span style={{ ...footerNavLink, cursor: "default" }}>at Hack Helix</span>
            <span style={{ ...footerNavLink, cursor: "default" }}></span>
            <a href="https://github.com" target="_blank" rel="noreferrer" style={{ ...footerNavLink, display: "flex", alignItems: "center", gap: 7 }} className="footer-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18a10.99 10.99 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.26 5.68.41.36.78 1.05.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.56 4.57-1.52 7.85-5.83 7.85-10.9C23.5 5.65 18.35.5 12 .5z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>

        {/* Divider */}
        <div style={footerDivider} />

        {/* Bottom bar */}
        <div style={footerBottom}>
          <span>© 2026 RippleAlert. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────────────────── */
function Eyebrow({ children, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontFamily: FONT_MONO, fontSize: 11, color, letterSpacing: 2.5,
      marginBottom: 18,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color, boxShadow: `0 0 10px ${color}` }} />
      {children}
    </div>
  );
}

function Pill({ children }) {
  return (
    <div style={{
      fontFamily: FONT_MONO, fontSize: 11, color: C.text,
      letterSpacing: 0.5,
    }}>
      {children}
    </div>
  );
}
function PillDot() {
  return <span style={{ width: 3, height: 3, borderRadius: 999, background: C.muted }} />;
}

function Badge({ children, color }) {
  return (
    <span style={{
      fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.4,
      padding: "5px 9px",
      border: `1px solid ${color}55`,
      background: `${color}14`,
      color,
      borderRadius: 4,
    }}>
      {children}
    </span>
  );
}

function DemoStat({ label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: "14px 16px",
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
    }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.muted, letterSpacing: 1.2 }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 24, color: accent, marginTop: 6, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function DemoGraphSVG() {
  // Static-but-stylish SVG mock of a force-directed graph
  const nodes = [
    { x: 200, y: 120, r: 14, c: C.red,    label: "log4j" },
    { x: 110, y: 70,  r: 7,  c: C.indigo },
    { x: 290, y: 80,  r: 7,  c: C.indigo },
    { x: 80,  y: 160, r: 6,  c: C.indigo },
    { x: 320, y: 170, r: 6,  c: C.indigo },
    { x: 160, y: 200, r: 5,  c: "#22c55e" },
    { x: 240, y: 200, r: 5,  c: "#22c55e" },
    { x: 50,  y: 110, r: 5,  c: "#22c55e" },
    { x: 350, y: 130, r: 5,  c: "#22c55e" },
    { x: 130, y: 40,  r: 4,  c: "#22c55e" },
    { x: 270, y: 40,  r: 4,  c: "#22c55e" },
  ];
  const edges = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,7],[2,8],[1,9],[2,10],[3,5],[4,6]];
  return (
    <svg viewBox="0 0 400 240" style={{ width: "100%", height: "100%" }}>
      {edges.map(([a, b], i) => (
        <line key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke={i < 6 ? "rgba(240,62,62,0.35)" : "rgba(99,102,241,0.3)"}
          strokeWidth={1}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          {i === 0 && <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke={C.red} strokeOpacity={0.3} />}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} opacity={0.9} />
          {n.label && (
            <text x={n.x + n.r + 6} y={n.y + 4} fill={C.text} fontFamily="IBM Plex Mono, monospace" fontSize="11">
              {n.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Content
   ───────────────────────────────────────────────────────────────────────────── */
const PROBLEMS = [
  {
    icon: "👁",
    title: "Invisible Exposure",
    body: "When a CVE is published for log4j, thousands of projects that depend on it transitively have no idea they're affected. There's no alert, no email, no dashboard.",
  },
  {
    icon: "⛓",
    title: "The Transitive Trap",
    body: "Your code depends on Package A. Package A depends on Package B. Package B is vulnerable. You are vulnerable. Most scanners miss this chain.",
  },
  {
    icon: "✕",
    title: "No Actionable Output",
    body: "Existing tools tell you what's vulnerable. None of them automatically draft the GitHub issue, write the patch request, and hand it to the right maintainer.",
  },
];

const FEATURES = [
  {
    icon: "🛡",
    title: "CVE Ingestion",
    body: "Enter any CVE ID. Vulnerability details fetched live from the NVD NIST API — CVSS score, affected version range, ecosystem.",
  },
  {
    icon: "⬡",
    title: "Dependency Tree Traversal",
    body: "Recursively maps npm and PyPI ecosystems 2–3 levels deep. Identifies every downstream package in the blast radius.",
  },
  {
    icon: "◈",
    title: "D3.js Blast Radius Graph",
    body: "Interactive force-directed graph. Every affected node color-coded by severity. Draggable, zoomable, filterable.",
  },
  {
    icon: "✦",
    title: "Gemini AI Patch Issues",
    body: "Gemini 2.0 Flash auto-drafts professional GitHub patch-request issues for every affected maintainer. One click to post.",
  },
];

const STEPS = [
  { title: "Enter CVE ID",         body: "Paste a CVE-XXXX-NNNN identifier." },
  { title: "Fetch NVD Data",       body: "Live pull from the NIST database." },
  { title: "Traverse Dependencies",body: "Recursive ecosystem walk, 2–3 levels." },
  { title: "Score Exposure",       body: "Per-package severity & blast scoring." },
  { title: "Draft Patch Issues",   body: "Gemini drafts GitHub-ready issues." },
];

const STACK = [
  { layer: "FRONTEND UI",  tech: "React + Tailwind CSS",         dot: C.indigo },
  { layer: "VISUALIZATION",tech: "D3.js Force Graph",            dot: C.indigo },
  { layer: "CHARTS",       tech: "Recharts",                     dot: C.indigo },
  { layer: "CVE DATA",     tech: "NVD API (NIST)",               dot: C.red },
  { layer: "NPM REGISTRY", tech: "registry.npmjs.org",           dot: C.red },
  { layer: "PYPI REGISTRY",tech: "pypi.org/pypi/{pkg}/json",     dot: C.red },
  { layer: "AI LAYER",     tech: "Gemini API · gemini-2.0-flash",dot: "#22c55e" },
  { layer: "DEPLOYMENT",   tech: "Vercel",                       dot: "#22c55e" },
  { layer: "BACKEND",      tech: "None required",                dot: "#22c55e" },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Inline styles
   ───────────────────────────────────────────────────────────────────────────── */
const pageStyle = {
  background: C.bg,
  color: C.text,
  minHeight: "100vh",
  fontFamily: FONT_MONO,
  WebkitFontSmoothing: "antialiased",
  overflowY: "auto",
  position: "relative",
};

const navStyle = {
  position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
  transition: "background 220ms ease, border-color 220ms ease, backdrop-filter 220ms ease",
};
const navInner = {
  maxWidth: 1280, margin: "0 auto",
  padding: "16px 28px",
  display: "flex", alignItems: "center", justifyContent: "space-between",
  gap: 16,
};
const logoStyle = { display: "flex", alignItems: "center", gap: 10 };
const logoImg = {
  width: 28, height: 28,
  objectFit: "contain",
  borderRadius: 7,
};
const logoBolt  = {
  width: 28, height: 28, display: "grid", placeItems: "center",
  background: `linear-gradient(135deg, ${C.red}, #ff7a45)`,
  borderRadius: 7, fontSize: 14,
  boxShadow: "0 0 18px rgba(240,62,62,0.5)",
};
const logoText  = { fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 17, letterSpacing: -0.3, color: C.text };
const navLinks = {
  display: "flex", alignItems: "center", gap: 4,
};
const navLink = {
  fontFamily: FONT_MONO, fontSize: 12, color: "#a0a2bb", letterSpacing: 0.3,
  textDecoration: "none",
  padding: "7px 13px", borderRadius: 6,
  transition: "color 160ms ease, background 160ms ease",
};
const navCTA = {
  fontFamily: FONT_MONO, fontSize: 12, letterSpacing: 0.5,
  background: C.text, color: "#000", border: "none",
  padding: "9px 16px", borderRadius: 7, cursor: "pointer",
  fontWeight: 600,
  transition: "transform 160ms ease, box-shadow 160ms ease",
};

const heroStyle = {
  position: "relative", minHeight: "100vh",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "120px 28px 80px",
  overflow: "hidden",
};
const heroContent = {
  position: "relative", zIndex: 2, maxWidth: 920,
  textAlign: "center",
};
const heroEyebrow = {
  display: "inline-flex", alignItems: "center", gap: 10,
  fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 3, color: C.muted,
  border: `1px solid ${C.border}`, padding: "8px 16px", borderRadius: 999,
  marginBottom: 28, background: "rgba(255,255,255,0.02)",
};
const heroH1 = {
  fontFamily: FONT_HEAD, fontWeight: 800,
  fontSize: "clamp(40px, 7vw, 84px)", lineHeight: 1.02,
  letterSpacing: -2, color: C.text,
  marginBottom: 22,
};
const heroUnderline = {
  position: "absolute", left: 0, right: 0, bottom: -4, height: 3,
  background: C.red, borderRadius: 2,
  boxShadow: `0 0 12px ${C.red}`,
};
const heroSub = {
  fontFamily: FONT_MONO, fontSize: 14, color: "#a4a6bd",
  maxWidth: 620, margin: "0 auto 36px",
  lineHeight: 1.7,
};
const heroCTAs = {
  display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
  marginBottom: 40,
};
const btnPrimary = {
  fontFamily: FONT_MONO, fontSize: 13, letterSpacing: 0.5,
  background: C.red, color: "#fff",
  border: `1px solid ${C.red}`,
  padding: "12px 22px", borderRadius: 8, cursor: "pointer",
  fontWeight: 600,
  boxShadow: `0 0 20px rgba(240,62,62,0.4)`,
  transition: "transform 160ms ease, box-shadow 160ms ease",
  willChange: "transform, box-shadow",
};
const btnGhost = {
  fontFamily: FONT_MONO, fontSize: 13, letterSpacing: 0.5,
  background: "transparent", color: C.text,
  border: `1px solid ${C.indigo}66`,
  padding: "12px 22px", borderRadius: 8, cursor: "pointer",
  fontWeight: 500,
  transition: "background 160ms ease, border-color 160ms ease",
};
const heroPills = {
  display: "flex", gap: 16, alignItems: "center", justifyContent: "center",
  flexWrap: "wrap",
  paddingTop: 18, borderTop: `1px solid ${C.border}`, maxWidth: 620, margin: "0 auto",
};
const scrollIndicator = {
  position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  zIndex: 2,
};

const section = {
  position: "relative",
  maxWidth: 1180, margin: "0 auto",
  padding: "100px 28px",
};
const sectionGridBg = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)," +
    "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
  backgroundSize: "44px 44px, 44px 44px",
  maxWidth: "100%",
};
const sectionHead = { textAlign: "center", maxWidth: 720, margin: "0 auto 56px" };
const h2 = {
  fontFamily: FONT_HEAD, fontWeight: 700,
  fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 1.1,
  letterSpacing: -1.2, color: C.text, marginBottom: 14,
};
const subH = { fontFamily: FONT_MONO, fontSize: 13, color: C.muted, lineHeight: 1.7 };

const grid3 = {
  display: "grid", gap: 18,
  gridTemplateColumns: "repeat(3, 1fr)",
};
const grid2 = {
  display: "grid", gap: 16,
  gridTemplateColumns: "repeat(4, 1fr)",
};

const cardBase = {
  background: C.bg1,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: "28px 24px",
  position: "relative",
  overflow: "hidden",
  transition: "border-color 240ms ease, transform 240ms ease, box-shadow 240ms ease",
};
const problemCard = { ...cardBase };
const problemNum = {
  position: "absolute", top: 18, right: 22,
  fontFamily: FONT_MONO, fontSize: 12, color: `${C.red}aa`, letterSpacing: 1.5,
};
const featureCard = {
  ...cardBase,
  background: `radial-gradient(circle at top left, rgba(99,102,241,0.06), transparent 60%), ${C.bg1}`,
  minHeight: 320,
  display: "flex",
  flexDirection: "column",
};
const featureIcon = {
  width: 42, height: 42, borderRadius: 9,
  display: "grid", placeItems: "center",
  background: `${C.indigo}22`, border: `1px solid ${C.indigo}44`,
  fontSize: 18, marginBottom: 18,
};
const cardTitle = {
  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 19,
  color: C.text, marginBottom: 10, letterSpacing: -0.4,
};
const cardBody = {
  fontFamily: FONT_MONO, fontSize: 12.5, color: "#9091a8", lineHeight: 1.7,
};

const stepsRow = {
  display: "flex", alignItems: "stretch", gap: 0,
  flexWrap: "wrap",
};
const stepCol = {
  flex: 1, minWidth: 160,
  padding: "20px 14px", textAlign: "center",
};
const stepCircle = {
  width: 44, height: 44, borderRadius: 999,
  border: `1.5px solid ${C.red}`,
  color: C.red, fontFamily: FONT_MONO, fontSize: 12,
  display: "grid", placeItems: "center",
  margin: "0 auto 16px", letterSpacing: 1,
  background: "rgba(240,62,62,0.06)",
  boxShadow: "0 0 16px rgba(240,62,62,0.25)",
};
const stepTitle = {
  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14,
  color: C.text, marginBottom: 6, letterSpacing: -0.2,
};
const stepBody = { fontFamily: FONT_MONO, fontSize: 11.5, color: C.muted, lineHeight: 1.6 };
const stepArrow = {
  position: "relative", width: 60, height: 1,
  background: `linear-gradient(to right, ${C.red}55, ${C.indigo}55)`,
  alignSelf: "center", overflow: "hidden",
};

const stackCard = {
  background: C.bg1,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "20px 22px",
  transition: "border-color 200ms ease, background 200ms ease",
};
const stackTop = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 };
const stackLayer = { fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2, color: C.muted };
const stackDot = { width: 7, height: 7, borderRadius: 999, display: "inline-block" };
const stackTech = { fontFamily: FONT_MONO, fontSize: 14, color: C.text, letterSpacing: 0.2 };

const demoFrameWrap = { maxWidth: 1000, margin: "0 auto", position: "relative" };
const demoFrame = {
  background: C.bg2,
  border: `1px solid ${C.brd2}`,
  borderRadius: 12,
  overflow: "hidden",
  boxShadow:
    `0 0 0 1px ${C.border}, 0 30px 80px -20px rgba(240,62,62,0.18), 0 30px 80px -40px rgba(99,102,241,0.25)`,
};
const browserBar = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "12px 16px",
  borderBottom: `1px solid ${C.border}`,
  background: "rgba(255,255,255,0.02)",
};
const dot = { width: 10, height: 10, borderRadius: 999, display: "inline-block" };
const addressBar = {
  flex: 1, marginLeft: 16,
  fontFamily: FONT_MONO, fontSize: 11, color: C.muted,
  background: "rgba(0,0,0,0.4)", padding: "6px 12px", borderRadius: 6,
  border: `1px solid ${C.border}`, textAlign: "center",
};
const demoBody = { padding: "26px 28px" };
const demoHeader = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  marginBottom: 22, flexWrap: "wrap", gap: 12,
};
const demoStats = { display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" };
const demoGraph = {
  height: 240,
  background: "rgba(0,0,0,0.3)",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: 12,
};

const ctaCard = {
  textAlign: "center",
  padding: "60px 28px",
  background: `radial-gradient(circle at center, rgba(240,62,62,0.08), transparent 70%), ${C.bg1}`,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
};

const footerStyle = {
  borderTop: `1px solid ${C.border}`,
  padding: "64px 28px 32px",
  background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))",
  position: "relative",
};
const footerTop = {
  maxWidth: 1180, margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
  gap: 48,
  paddingBottom: 48,
  alignItems: "start",
};
const footerBrand = {};
const footerTagline = {
  fontFamily: FONT_MONO, fontSize: 12, color: C.muted, lineHeight: 1.8,
  marginBottom: 18, marginTop: 4,
};
const footerBadges = { display: "flex", gap: 8, flexWrap: "wrap" };
const footerBadge = {
  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.2,
  color: C.muted, border: `1px solid ${C.border}`,
  padding: "4px 9px", borderRadius: 4,
};
const footerCols = {};
const footerCol = { display: "flex", flexDirection: "column", gap: 12 };
const footerColHead = {
  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2.5, color: C.muted,
  marginBottom: 4,
};
const footerNavLink = {
  fontFamily: FONT_MONO, fontSize: 12, color: `${C.text}99`,
  textDecoration: "none",
  transition: "color 160ms ease",
};
const footerDivider = {
  maxWidth: 1180, margin: "0 auto",
  height: 1,
  background: `linear-gradient(to right, transparent, ${C.border} 20%, ${C.border} 80%, transparent)`,
};
const footerBottom = {
  maxWidth: 1180, margin: "0 auto",
  paddingTop: 24,
  display: "flex", justifyContent: "center", alignItems: "center",
  fontFamily: FONT_MONO, fontSize: 11, color: C.muted,
};

/* ─────────────────────────────────────────────────────────────────────────────
   Global CSS injected via <style>
   ───────────────────────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: "Problem",  href: "#problem" },
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how" },
  { label: "Stack",    href: "#stack" },
  { label: "Demo",     href: "#demo" },
];

const globalCSS = `
html { scroll-behavior: smooth; }

.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 700ms ease, transform 700ms ease;
  will-change: transform, opacity;
}
.reveal.is-visible { opacity: 1; transform: translateY(0); }

@keyframes pulseRed {
  0%, 100% { box-shadow: 0 0 18px rgba(240,62,62,0.35); }
  50%      { box-shadow: 0 0 32px rgba(240,62,62,0.65); }
}
.btn-primary { animation: pulseRed 2.6s ease-in-out infinite; }
.btn-primary:hover { transform: translateY(-1px); }

.problem-card:hover {
  border-color: rgba(240,62,62,0.35) !important;
  box-shadow: -3px 0 0 0 ${C.red}, 0 12px 30px -10px rgba(240,62,62,0.2);
  transform: translateY(-2px);
}
.feature-card:hover {
  border-color: rgba(99,102,241,0.4) !important;
  box-shadow: 0 0 0 1px rgba(99,102,241,0.25), 0 18px 40px -16px rgba(99,102,241,0.35);
  transform: translateY(-2px);
}

@keyframes scrollDot {
  0%   { transform: translateY(0);    opacity: 0.2; }
  50%  { transform: translateY(8px);  opacity: 1; }
  100% { transform: translateY(16px); opacity: 0; }
}
.scroll-dot {
  width: 5px; height: 5px; border-radius: 999px;
  background: ${C.text};
  animation: scrollDot 1.6s ease-in-out infinite;
}

@keyframes travel {
  0%   { left: -8%; opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { left: 108%; opacity: 0; }
}
.travel-dot {
  position: absolute; top: -2px; width: 5px; height: 5px;
  border-radius: 999px; background: ${C.red};
  box-shadow: 0 0 10px ${C.red};
  animation: travel 2.4s linear infinite;
}

.hero-cursor-glow {
  position: absolute; inset: 0;
  background: radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%),
              rgba(240,62,62,0.15), transparent 60%);
  pointer-events: none; z-index: 1;
  transition: background 60ms linear;
}

.nav-link:hover { color: #ffffff !important; background: rgba(255,255,255,0.07); }
.footer-link:hover { color: #e8e8f0 !important; }

@media (max-width: 860px) {
  .nav-links-center { display: none !important; }
}
@media (max-width: 900px) {
  .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 480px) {
  .features-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 720px) {
  .stepsRow { flex-direction: column; }
}
`;
