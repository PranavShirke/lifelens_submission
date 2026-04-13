"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────
   THREE.JS CANVAS — ambient memory particle field
───────────────────────────────────────────── */
function MemoryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    // ── Floating memory orbs ──
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    const orbColors = [0xffc299, 0xc5d9c3, 0xf2d5d5, 0xe8cfc0, 0xffe6d9];
    const orbs: { mesh: THREE.Mesh; speed: THREE.Vector3; rotSpeed: number }[] = [];

    for (let i = 0; i < 38; i++) {
      const geo = new THREE.SphereGeometry(Math.random() * 0.12 + 0.04, 16, 16);
      const mat = new THREE.MeshPhongMaterial({
        color: orbColors[Math.floor(Math.random() * orbColors.length)],
        transparent: true,
        opacity: Math.random() * 0.4 + 0.15,
        shininess: 80,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 4
      );
      orbGroup.add(mesh);
      orbs.push({
        mesh,
        speed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.001
        ),
        rotSpeed: (Math.random() - 0.5) * 0.008,
      });
    }

    // ── Connection lines between nearby orbs ──
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffa666, transparent: true, opacity: 0.08 });
    const lineGroup = new THREE.Group();
    scene.add(lineGroup);

    // ── Ambient light ──
    scene.add(new THREE.AmbientLight(0xfaf0ff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 5, 5);
    scene.add(dirLight);
    const ptLight = new THREE.PointLight(0xffc299, 1.5, 20);
    ptLight.position.set(-4, 2, 3);
    scene.add(ptLight);

    // ── DNA helix of memories ──
    const helixGroup = new THREE.Group();
    scene.add(helixGroup);
    const helixPoints: THREE.Mesh[] = [];
    for (let i = 0; i < 60; i++) {
      const t = (i / 60) * Math.PI * 6;
      const geo = new THREE.SphereGeometry(0.03, 8, 8);
      const mat = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? 0xffa666 : 0xa8c8a0,
        transparent: true,
        opacity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(t) * 0.5, (i / 60) * 8 - 4, Math.sin(t) * 0.5 - 2);
      helixGroup.add(mesh);
      helixPoints.push(mesh);
    }
    helixGroup.position.x = 4.5;

    // ── Mouse parallax ──
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Resize ──
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      frame++;

      // Orb drift
      orbs.forEach((o) => {
        o.mesh.position.add(o.speed);
        o.mesh.rotation.y += o.rotSpeed;
        // Bounce
        if (Math.abs(o.mesh.position.x) > 7) o.speed.x *= -1;
        if (Math.abs(o.mesh.position.y) > 5) o.speed.y *= -1;
        if (Math.abs(o.mesh.position.z) > 2.5) o.speed.z *= -1;
        // Breathe opacity
        (o.mesh.material as THREE.MeshPhongMaterial).opacity =
          0.15 + Math.sin(frame * 0.02 + o.mesh.position.x) * 0.12;
      });

      // Helix rotate
      helixGroup.rotation.y = frame * 0.004;
      helixPoints.forEach((p, i) => {
        (p.material as THREE.MeshPhongMaterial).opacity =
          0.3 + Math.sin(frame * 0.05 + i * 0.3) * 0.2;
      });

      // Update connection lines every 60 frames
      if (frame % 60 === 0) {
        lineGroup.clear();
        for (let i = 0; i < orbs.length; i++) {
          for (let j = i + 1; j < orbs.length; j++) {
            const dist = orbs[i].mesh.position.distanceTo(orbs[j].mesh.position);
            if (dist < 2.2) {
              const geo = new THREE.BufferGeometry().setFromPoints([
                orbs[i].mesh.position.clone(),
                orbs[j].mesh.position.clone(),
              ]);
              lineGroup.add(new THREE.Line(geo, lineMat));
            }
          }
        }
      }

      // Parallax
      orbGroup.rotation.y += (mouse.x * 0.12 - orbGroup.rotation.y) * 0.03;
      orbGroup.rotation.x += (mouse.y * 0.06 - orbGroup.rotation.x) * 0.03;
      camera.position.x += (mouse.x * 0.3 - camera.position.x) * 0.03;
      camera.position.y += (mouse.y * 0.2 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.85,
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   SCROLL REVEAL HOOK
───────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const delay = el.dataset.delay ?? "0";
            setTimeout(() => el.classList.add("visible"), parseInt(delay));
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ─────────────────────────────────────────────
   TYPED TEXT COMPONENT
───────────────────────────────────────────── */
function TypedText({ phrases }: { phrases: string[] }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[idx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && text.length < current.length) {
      timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), 60);
    } else if (!deleting && text.length === current.length) {
      timeout = setTimeout(() => setDeleting(true), 2400);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => setText(text.slice(0, -1)), 32);
    } else if (deleting && text.length === 0) {
      timeout = setTimeout(() => {
        setDeleting(false);
        setIdx((i) => (i + 1) % phrases.length);
      }, 32);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, idx, phrases]);

  return (
    <span style={{ color: "var(--tangerine)", fontStyle: "italic" }}>
      {text}
      <span className="cursor">|</span>
    </span>
  );
}

/* ─────────────────────────────────────────────
   MEMORY CARD
───────────────────────────────────────────── */
interface MemCardProps {
  icon: string;
  type: string;
  title: string;
  meta: string;
  accentColor: string;
  barWidth?: number;
  delay?: number;
  children?: React.ReactNode;
}
function MemCard({ icon, type, title, meta, accentColor, barWidth, delay = 0, children }: MemCardProps) {
  return (
    <div className="mem-card reveal" data-delay={delay}>
      <div className="mem-icon" style={{ background: accentColor + "22" }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div className="mem-label">{type}</div>
      <div className="mem-title">{title}</div>
      <div className="mem-meta">{meta}</div>
      {barWidth !== undefined && (
        <div className="mood-bar">
          <div className="mood-fill" style={{ width: `${barWidth}%` }} />
        </div>
      )}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────── */
function FeatCard({
  icon, title, desc, accent, delay = 0,
}: { icon: string; title: string; desc: string; accent: string; delay?: number }) {
  return (
    <div className="feat-card reveal" data-delay={delay} style={{ "--accent": accent } as React.CSSProperties}>
      <div className="feat-icon" style={{ background: accent + "18" }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  useReveal();
  const [activeRole, setActiveRole] = useState(0);

  const roles = [
    {
      emoji: "🧓",
      title: "Patient",
      color: "var(--tangerine)",
      bg: "var(--tangerine-pale)",
      desc: "Capture today's moments. Revisit yesterday's stories. Feel the comfort of a memory that never fades. Everything is gentle, calm, and entirely yours.",
      features: ["Voice & photo capture", "Ask in plain language", "Memory map", "Gentle mood check-ins"],
    },
    {
      emoji: "🩺",
      title: "Caretaker",
      color: "var(--sage)",
      bg: "var(--sage-pale)",
      desc: "Monitor mood trends, track medications, receive instant alerts, and gain deep insight into your patient's wellbeing — all from one calm dashboard.",
      features: ["Real-time mood alerts", "Medication adherence analytics", "Multi-patient support", "AI agent observations"],
    },
    {
      emoji: "❤️",
      title: "Family",
      color: "#D4A0A0",
      bg: "#f9eded",
      desc: "Stay connected with your loved one's daily life. Browse their memory lane, request a captured moment, and never feel far away.",
      features: ["Read-only memory lane", "Request new memories", "Photo gallery & milestones", "Message board"],
    },
  ];

  const steps = [
    { n: "01", title: "Capture", desc: "Photo, voice, or words — LifeLens accepts memories in any form, from any device." },
    { n: "02", title: "Understand", desc: "AI describes images, transcribes audio, tags people and places, and reads the emotional tone." },
    { n: "03", title: "Store", desc: "Everything is embedded and saved to a private, encrypted memory vault that grows richer every day." },
    { n: "04", title: "Recall", desc: "Ask a question in plain language. LifeLens finds the answer, shows the evidence, and reads it aloud." },
  ];

  const testimonials = [
    { text: "My mother asked to hear about her wedding day. LifeLens found the audio clip she recorded last year and played it back. She smiled the whole time.", name: "Priya S.", role: "Family member, Mumbai", initial: "P", color: "var(--tangerine)" },
    { text: "The medication alerts have been a lifesaver. I care for three patients and I used to miss things. Now I get notified instantly and can act within minutes.", name: "Ravi M.", role: "Caretaker, Pune", initial: "R", color: "var(--sage)" },
    { text: "I record a little something every evening. It has become my ritual. And when I forget the next morning, I just ask LifeLens — it remembers for me.", name: "Anita K.", role: "Patient, Bangalore", initial: "A", color: "#D4A0A0" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --tangerine: #FF8C42;
          --tangerine-light: #FFC299;
          --tangerine-pale: #FFF5E6;
          --sage: #7A9E7A;
          --sage-light: #B5CEB5;
          --sage-pale: #EAF2E9;
          --cream: #F7F3EC;
          --blush: #F2E8E5;
          --warm-white: #FDFAF6;
          --text-dark: #1E1B2E;
          --text-mid: #5A576E;
          --text-soft: #9896B0;
          --border: rgba(255, 140, 66, 0.15);
          --card-shadow: 0 2px 40px rgba(30,27,46,0.07);
        }

        html { scroll-behavior: smooth; }
        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--warm-white);
          color: var(--text-dark);
          overflow-x: hidden;
        }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 200;
          width: calc(100% - 48px); max-width: 1100px;
          padding: 0 32px;
          height: 64px;
          border-radius: 100px;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(253,250,246,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border);
          box-shadow: 0 8px 32px rgba(30,27,46,0.06);
          transition: background 0.3s, transform 0.3s;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 22px; font-weight: 800;
          color: var(--text-dark); text-decoration: none;
          letter-spacing: -0.03em;
        }
        .logo-gem {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, var(--tangerine) 0%, #7A9E7A 100%);
          display: flex; align-items: center; justify-content: center;
        }
        .nav-links { display: flex; gap: 36px; list-style: none; }
        .nav-links a {
          text-decoration: none; color: var(--text-mid);
          font-size: 14px; font-weight: 400;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--tangerine); }
        .nav-links a.nav-cta {
          background: var(--text-dark); color: white;
          padding: 9px 22px; border-radius: 100px;
          font-size: 13px; font-weight: 600;
          text-decoration: none;
          transition: background 0.25s, transform 0.2s;
          border: none; cursor: pointer;
        }
        .nav-links a.nav-cta:hover { background: var(--tangerine); transform: translateY(-1px); }

        /* ── HERO ── */
        .hero {
          position: relative; z-index: 1;
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          padding: 130px 40px 80px;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255, 140, 66,0.12);
          border: 1px solid rgba(255, 140, 66,0.3);
          border-radius: 100px; padding: 6px 16px;
          font-size: 11px; font-weight: 500;
          color: var(--tangerine); letter-spacing: 0.1em;
          text-transform: uppercase; margin-bottom: 36px;
          animation: fadeUp 0.8s ease both;
        }
        .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--tangerine); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.6)} }

        .hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(52px, 8vw, 100px);
          font-weight: 300; line-height: 1.06;
          color: var(--text-dark); max-width: 900px;
          margin-bottom: 28px;
          animation: fadeUp 0.9s 0.1s ease both;
          letter-spacing: -0.01em;
        }
        .hero-sub {
          font-size: clamp(16px, 2vw, 19px);
          color: var(--text-mid); max-width: 500px;
          line-height: 1.75; margin-bottom: 48px;
          font-weight: 300;
          animation: fadeUp 0.9s 0.2s ease both;
        }
        .hero-actions {
          display: flex; gap: 16px; align-items: center;
          justify-content: center; flex-wrap: wrap;
          animation: fadeUp 0.9s 0.3s ease both;
          margin-bottom: 80px;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--tangerine), #E67329);
          color: white; padding: 15px 36px;
          border-radius: 100px; font-size: 15px; font-weight: 500;
          text-decoration: none; border: none; cursor: pointer;
          box-shadow: 0 6px 28px rgba(255, 140, 66,0.4);
          transition: transform 0.25s, box-shadow 0.25s;
          letter-spacing: 0.02em;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(255, 140, 66,0.5); }
        .btn-ghost {
          color: var(--text-mid); font-size: 15px;
          text-decoration: none; display: flex; align-items: center; gap: 8px;
          transition: color 0.2s;
        }
        .btn-ghost:hover { color: var(--tangerine); }
        .btn-ghost svg { transition: transform 0.2s; }
        .btn-ghost:hover svg { transform: translateX(4px); }

        /* ── FLOATING CARDS ── */
        .hero-cards {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 18px; max-width: 860px; width: 100%;
          animation: fadeUp 1s 0.4s ease both;
        }
        .mem-card {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.95);
          border-radius: 22px; padding: 22px;
          text-align: left;
          box-shadow: 0 8px 40px rgba(30,27,46,0.09);
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .mem-card:hover { transform: translateY(-6px) !important; box-shadow: 0 18px 50px rgba(30,27,46,0.13); }
        .mem-card:nth-child(1) { animation: floatA 7s ease-in-out infinite; }
        .mem-card:nth-child(2) { animation: floatB 8s ease-in-out infinite; }
        .mem-card:nth-child(3) { animation: floatC 6.5s ease-in-out infinite; }
        @keyframes floatA { 0%,100%{transform:translateY(-10px)} 50%{transform:translateY(6px)} }
        @keyframes floatB { 0%,100%{transform:translateY(6px)} 50%{transform:translateY(-8px)} }
        @keyframes floatC { 0%,100%{transform:translateY(-4px)} 50%{transform:translateY(10px)} }
        .mem-icon {
          width: 44px; height: 44px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .mem-label {
          font-size: 10px; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--text-soft); margin-bottom: 6px;
        }
        .mem-title { font-size: 14px; font-weight: 500; color: var(--text-dark); margin-bottom: 8px; }
        .mem-meta { font-size: 12px; color: var(--text-soft); }
        .mood-bar {
          height: 3px; border-radius: 100px;
          background: rgba(255, 140, 66,0.15); margin-top: 14px; overflow: hidden;
        }
        .mood-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, var(--tangerine), var(--sage-light));
        }
        .avatar-row { display: flex; margin-top: 12px; }
        .av {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid white; font-size: 9px; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          color: white; margin-right: -6px;
        }

        /* ── TRUST BAR ── */
        .trust-bar {
          position: relative; z-index: 1;
          background: white;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 36px 60px;
          display: flex; align-items: center; justify-content: center;
          gap: 64px; flex-wrap: wrap;
        }
        .trust-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .trust-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px; font-weight: 400; color: var(--tangerine);
          line-height: 1;
        }
        .trust-label { font-size: 12px; color: var(--text-soft); font-weight: 300; text-align: center; }
        .trust-sep { width: 1px; height: 44px; background: var(--border); }

        /* ── SECTIONS ── */
        .section { position: relative; z-index: 1; padding: 110px 60px; }
        .section-tag {
          display: inline-block; border-radius: 100px;
          padding: 5px 15px; font-size: 10px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 22px;
        }
        .tag-tangerine { background: var(--tangerine-pale); color: var(--tangerine); }
        .tag-sage { background: var(--sage-pale); color: var(--sage); }
        .section-h {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(38px, 5vw, 62px); font-weight: 300;
          line-height: 1.15; color: var(--text-dark); margin-bottom: 18px;
        }
        .section-h em { font-style: italic; color: var(--tangerine); }
        .section-sub {
          font-size: 16px; color: var(--text-mid); line-height: 1.75;
          font-weight: 300; margin-bottom: 60px; max-width: 480px;
        }

        /* ── FEATURES GRID ── */
        .features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        .feat-card {
          background: white; border-radius: 24px;
          border: 1px solid var(--border); padding: 34px 28px;
          position: relative; overflow: hidden;
          transition: transform 0.3s, box-shadow 0.3s;
          cursor: default;
        }
        .feat-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: var(--accent);
          border-radius: 24px 24px 0 0;
        }
        .feat-card:hover { transform: translateY(-5px); box-shadow: var(--card-shadow); }
        .feat-icon {
          width: 54px; height: 54px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
        }
        .feat-card h3 { font-size: 17px; font-weight: 500; color: var(--text-dark); margin-bottom: 10px; }
        .feat-card p { font-size: 14px; color: var(--text-mid); line-height: 1.7; font-weight: 300; }

        /* ── ROLES SECTION ── */
        .roles-bg {
          position: relative; z-index: 1;
          background: linear-gradient(160deg, var(--tangerine-pale) 0%, var(--cream) 55%, var(--sage-pale) 100%);
          padding: 110px 60px;
        }
        .role-tabs {
          display: flex; gap: 8px; margin-bottom: 40px;
          background: rgba(255,255,255,0.6);
          border: 1px solid var(--border);
          border-radius: 100px; padding: 6px;
          width: fit-content;
        }
        .role-tab {
          padding: 10px 26px; border-radius: 100px;
          font-size: 14px; font-weight: 400;
          cursor: pointer; border: none;
          background: transparent; color: var(--text-mid);
          transition: all 0.25s;
        }
        .role-tab.active {
          background: white; color: var(--text-dark);
          box-shadow: 0 2px 12px rgba(30,27,46,0.1); font-weight: 500;
        }
        .role-body {
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
        }
        .role-emoji-box {
          width: 120px; height: 120px; border-radius: 36px;
          display: flex; align-items: center; justify-content: center;
          font-size: 54px; margin-bottom: 28px;
          transition: background 0.4s;
        }
        .role-desc {
          font-size: 18px; color: var(--text-mid); line-height: 1.75;
          font-weight: 300; margin-bottom: 32px;
          font-family: 'Cormorant Garamond', serif; font-style: italic;
        }
        .role-features { list-style: none; display: flex; flex-direction: column; gap: 12px; }
        .role-features li {
          display: flex; align-items: center; gap: 12px;
          font-size: 14px; color: var(--text-mid); font-weight: 300;
        }
        .check {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
        }
        .role-visual {
          display: flex; align-items: center; justify-content: center;
        }
        .role-card-stack { position: relative; width: 320px; height: 360px; }
        .role-card-bg {
          position: absolute; border-radius: 24px;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
        }

        /* ── HOW IT WORKS ── */
        .steps-wrap {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 0; position: relative; margin-top: 64px;
        }
        .steps-wrap::before {
          content: ''; position: absolute;
          top: 40px; left: 12%; right: 12%; height: 1px;
          background: linear-gradient(90deg,transparent,var(--tangerine-light),var(--sage-light),transparent);
        }
        .step { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 16px; }
        .step-circle {
          width: 80px; height: 80px; border-radius: 50%;
          background: white; border: 1.5px solid var(--tangerine-light);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 400; color: var(--tangerine);
          margin-bottom: 22px; position: relative; z-index: 1;
          box-shadow: 0 4px 20px rgba(255, 140, 66,0.18);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .step:hover .step-circle { transform: scale(1.08); box-shadow: 0 8px 32px rgba(255, 140, 66,0.3); }
        .step h4 { font-size: 15px; font-weight: 500; color: var(--text-dark); margin-bottom: 10px; }
        .step p { font-size: 13px; color: var(--text-soft); line-height: 1.6; font-weight: 300; }

        /* ── TESTIMONIALS ── */
        .testi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 60px; }
        .testi-card {
          background: white; border-radius: 22px;
          border: 1px solid var(--border); padding: 30px;
          transition: transform 0.3s;
        }
        .testi-card:hover { transform: translateY(-4px); }
        .stars { color: #C9A96E; font-size: 12px; letter-spacing: 3px; margin-bottom: 16px; }
        .testi-card blockquote {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px; font-style: italic;
          color: var(--text-mid); line-height: 1.75;
          margin-bottom: 22px; font-weight: 300;
        }
        .testi-author { display: flex; align-items: center; gap: 12px; }
        .testi-av {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: white;
        }
        .testi-name { font-size: 13px; font-weight: 500; color: var(--text-dark); }
        .testi-role-label { font-size: 12px; color: var(--text-soft); }

        /* ── CTA ── */
        .cta-wrap {
          position: relative; z-index: 1;
          padding: 120px 60px; text-align: center; overflow: hidden;
        }
        .cta-h {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(40px, 6vw, 72px); font-weight: 300;
          color: var(--text-dark); max-width: 720px;
          margin: 0 auto 22px; line-height: 1.12;
        }
        .cta-h em { font-style: italic; color: var(--tangerine); }
        .cta-p {
          font-size: 17px; color: var(--text-mid); font-weight: 300;
          max-width: 440px; margin: 0 auto 44px; line-height: 1.75;
        }
        .cta-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .btn-outline {
          background: white; color: var(--text-dark);
          padding: 15px 36px; border-radius: 100px;
          font-size: 15px; font-weight: 500; text-decoration: none;
          border: 1px solid var(--border);
          transition: border-color 0.25s, transform 0.2s;
        }
        .btn-outline:hover { border-color: var(--tangerine); transform: translateY(-1px); }

        /* ── FOOTER ── */
        footer {
          position: relative; z-index: 1;
          background: var(--text-dark); color: rgba(255,255,255,0.45);
          padding: 56px 60px 36px;
        }
        .footer-grid {
          display: grid; grid-template-columns: 1.6fr repeat(3,1fr);
          gap: 48px; margin-bottom: 48px;
        }
        .footer-brand-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 400; color: white; margin-bottom: 12px;
          display: flex; align-items: center; gap: 10px;
        }
        .footer-tagline { font-size: 13px; line-height: 1.65; font-weight: 300; max-width: 200px; }
        .footer-col h5 {
          font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(255,255,255,0.35);
          margin-bottom: 16px;
        }
        .footer-col a {
          display: block; font-size: 13px; color: rgba(255,255,255,0.5);
          text-decoration: none; margin-bottom: 10px; font-weight: 300;
          transition: color 0.2s;
        }
        .footer-col a:hover { color: white; }
        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.07);
          padding-top: 24px;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 12px; flex-wrap: wrap; gap: 12px;
        }
        .footer-bottom a { color: rgba(255,255,255,0.35); text-decoration: none; margin-left: 20px; transition: color 0.2s; }
        .footer-bottom a:hover { color: white; }

        /* ── SCROLL REVEAL ── */
        .reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }

        /* ── CURSOR ── */
        .cursor { display: inline-block; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* ── MISC ── */
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width: 900px) {
          .nav { padding: 0 20px; }
          .nav-links { display: none; }
          .section, .roles-bg, .cta-wrap { padding: 64px 24px; }
          .hero { padding: 110px 20px 60px; }
          .features-grid, .testi-grid, .steps-wrap { grid-template-columns: 1fr; }
          .steps-wrap::before { display: none; }
          .hero-cards { grid-template-columns: 1fr; max-width: 340px; }
          .trust-bar { padding: 28px 24px; gap: 28px; }
          .trust-sep { display: none; }
          .role-body { grid-template-columns: 1fr; }
          .role-visual { display: none; }
          .footer-grid { grid-template-columns: 1fr 1fr; }
          footer { padding: 48px 24px 28px; }
        }
      `}</style>

      {/* Three.js background */}
      <MemoryCanvas />

      {/* ── NAV ── */}
      <nav className="nav">
        <a href="#" className="nav-logo">
          <div className="logo-gem">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="1.5" />
              <path d="M3 16c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="7" r="1.5" fill="white" />
            </svg>
          </div>
          LifeLens
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#roles">Who it&apos;s for</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="/login" className="nav-cta">Get started</a></li>
        </ul>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-badge">
          <span className="pulse" />
          AI-powered memory companion
        </div>
        <h1>
          Where every memory<br />
          <TypedText phrases={["finds its way home.", "is kept forever.", "stays alive.", "is cherished."]} />
        </h1>
        <p className="hero-sub">
          A gentle, intelligent companion for people living with dementia and Alzheimer&apos;s —
          preserving what matters most, one memory at a time.
        </p>
        <div className="hero-actions">
          <a href="/login" className="btn-primary">Begin the journey</a>
          <a href="#how" className="btn-ghost">
            See how it works
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Floating memory cards */}
        <div className="hero-cards">
          <MemCard icon="🌸" type="Image Memory" title="Garden walk with Anna" meta="Yesterday · Mumbai · 😊 Happy" accentColor="#FF8C42" barWidth={82} />
          <div className="mem-card">
            <div className="mem-icon" style={{ background: "#7A9E7A22" }}>
              <span style={{ fontSize: 20 }}>🎤</span>
            </div>
            <div className="mem-label">Voice Memory</div>
            <div className="mem-title">&ldquo;My wedding day in 1987…&rdquo;</div>
            <div className="mem-meta">2 days ago · Feeling joyful</div>
            <div className="avatar-row">
              {[["R", "#FF8C42"], ["A", "#7A9E7A"], ["M", "#D4A0A0"]].map(([l, c]) => (
                <div key={l} className="av" style={{ background: c }}>{l}</div>
              ))}
            </div>
          </div>
          <MemCard icon="💊" type="Medication" title="Today's doses — 2 of 3 done" meta="Good adherence · Next at 8 PM" accentColor="#D4A0A0" barWidth={67} />
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div className="trust-bar reveal" data-delay="0">
        {[
          { n: "55M+", l: "People living with dementia worldwide" },
          { n: "18", l: "AI agents working for you" },
          { n: "<200ms", l: "Memory retrieval speed" },
          { n: "9", l: "Specialised memory collections" },
        ].map((item, i) => (
          <div key={i} style={{ display: "contents" }}>
            {i > 0 && <div className="trust-sep" />}
            <div className="trust-item">
              <span className="trust-num">{item.n}</span>
              <span className="trust-label">{item.l}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section className="section" id="features">
        <div className="reveal" data-delay="0">
          <div className="section-tag tag-tangerine">Core features</div>
          <h2 className="section-h">Everything a memory<br /><em>needs to live on</em></h2>
          <p className="section-sub">From capturing a fleeting moment to recalling a decades-old story, LifeLens is there at every step.</p>
        </div>
        <div className="features-grid">
          {[
            { icon: "🧠", title: "Semantic memory search", desc: "Ask in plain words — 'What did I do last Christmas?' — and LifeLens finds the answer from stored photos, voice notes, and text, grounded in real evidence.", accent: "#FF8C42" },
            { icon: "📸", title: "Multimodal capture", desc: "Images, voice recordings, and written notes — all automatically described, tagged with people and places, and stored safely in a personal memory vault.", accent: "#7A9E7A" },
            { icon: "💊", title: "Medication intelligence", desc: "Smart reminders, dose tracking, and adherence analytics. Caretakers receive instant alerts when a dose is missed, so care never has a gap.", accent: "#D4A0A0" },
            { icon: "😊", title: "Mood & wellbeing monitoring", desc: "Multi-signal mood analysis detects patterns and risks early. Risk scores prompt gentle caretaker intervention before things escalate.", accent: "#7A9E7A" },
            { icon: "👥", title: "Family portal", desc: "A safe, read-only window for loved ones. Browse the memory lane, request a new memory capture, or leave a message — with dignity and privacy.", accent: "#FF8C42" },
            { icon: "🗺️", title: "Memory map", desc: "Every memory pinned to the place it happened. Revisit familiar streets, favourite cafés, and meaningful locations through an interactive map.", accent: "#C9A96E" },
          ].map((f, i) => (
            <FeatCard key={i} {...f} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="roles-bg" id="roles">
        <div className="reveal" data-delay="0">
          <div className="section-tag tag-tangerine">Who it&apos;s for</div>
          <h2 className="section-h" style={{ maxWidth: "100%" }}>Care that surrounds<br /><em>every person</em></h2>
        </div>
        <div className="role-tabs reveal" data-delay="100">
          {roles.map((r, i) => (
            <button
              key={i}
              className={`role-tab${activeRole === i ? " active" : ""}`}
              onClick={() => setActiveRole(i)}
            >
              {r.emoji} {r.title}
            </button>
          ))}
        </div>
        <div className="role-body reveal" data-delay="200">
          <div>
            <div className="role-emoji-box" style={{ background: roles[activeRole].bg }}>
              {roles[activeRole].emoji}
            </div>
            <p className="role-desc">&ldquo;{roles[activeRole].desc}&rdquo;</p>
            <ul className="role-features">
              {roles[activeRole].features.map((f, i) => (
                <li key={i}>
                  <div className="check" style={{ background: roles[activeRole].bg, color: roles[activeRole].color }}>✓</div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="role-visual">
            <div style={{ position: "relative", width: 300, height: 320 }}>
              {[
                { top: 0, left: 0, w: 260, h: 160, rotate: "-4deg", op: 0.5 },
                { top: 40, left: 20, w: 260, h: 160, rotate: "2deg", op: 0.7 },
                { top: 80, left: -10, w: 280, h: 180, rotate: "0deg", op: 1 },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: s.top, left: s.left,
                    width: s.w, height: s.h,
                    borderRadius: 20,
                    background: `rgba(255,255,255,${s.op})`,
                    border: "1px solid rgba(255,255,255,0.9)",
                    backdropFilter: "blur(12px)",
                    transform: `rotate(${s.rotate})`,
                    boxShadow: "0 4px 24px rgba(30,27,46,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                  }}
                >
                  {i === 2 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{roles[activeRole].emoji}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-dark)" }}>{roles[activeRole].title} view</div>
                      <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>Personalised dashboard</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" id="how" style={{ textAlign: "center" }}>
        <div className="reveal" data-delay="0">
          <div className="section-tag tag-sage" style={{ display: "inline-block" }}>How it works</div>
          <h2 className="section-h" style={{ maxWidth: "100%", margin: "0 auto 18px" }}>
            Four gentle steps to<br /><em>preserve a memory</em>
          </h2>
          <p className="section-sub" style={{ margin: "0 auto" }}>No complexity, no overwhelm — just a calm, guided flow from capture to recall.</p>
        </div>
        <div className="steps-wrap">
          {steps.map((s, i) => (
            <div key={i} className="step reveal" data-delay={i * 100}>
              <div className="step-circle">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="reveal" data-delay="0" style={{ textAlign: "center" }}>
          <div className="section-tag tag-tangerine" style={{ display: "inline-block" }}>Stories of care</div>
          <h2 className="section-h" style={{ maxWidth: "100%", textAlign: "center" }}>
            Words from those<br /><em>who walk this path</em>
          </h2>
        </div>
        <div className="testi-grid">
          {testimonials.map((t, i) => (
            <div key={i} className="testi-card reveal" data-delay={i * 100}>
              <div className="stars">★★★★★</div>
              <blockquote>&ldquo;{t.text}&rdquo;</blockquote>
              <div className="testi-author">
                <div className="testi-av" style={{ background: t.color }}>{t.initial}</div>
                <div>
                  <div className="testi-name">{t.name}</div>
                  <div className="testi-role-label">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-wrap">
        <div className="reveal" data-delay="0">
          <div className="section-tag tag-tangerine" style={{ display: "inline-block", marginBottom: 28 }}>Begin today</div>
          <h2 className="cta-h">Because every memory<br /><em>deserves to be remembered</em></h2>
          <p className="cta-p">Start preserving what matters most. Gentle by design, built with love for those who need it most.</p>
          <div className="cta-btns">
            <a href="#" className="btn-primary">Create your memory vault</a>
            <a href="#features" className="btn-outline">Explore features</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-grid">
          <div>
            <div className="footer-brand-name">
              <div className="logo-gem">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="1.5" />
                  <path d="M3 16c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="1.5" fill="white" />
                </svg>
              </div>
              LifeLens
            </div>
            <p className="footer-tagline">Because every memory deserves to be remembered. Built with love for caregivers and patients worldwide.</p>
          </div>
          {[
            { title: "Product", links: ["Memory vault", "Ask LifeLens", "Medication tracker", "Family portal", "Memory map"] },
            { title: "For", links: ["Patients", "Caretakers", "Families", "Therapists"] },
            { title: "Company", links: ["About", "Privacy", "Security", "GitHub", "MIT License"] },
          ].map((col) => (
            <div key={col.title} className="footer-col">
              <h5>{col.title}</h5>
              {col.links.map((l) => <a key={l} href="#">{l}</a>)}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2025 LifeLens. Built for Qdrant Convolve 4.0.</span>
          <div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Open source</a>
          </div>
        </div>
      </footer>
    </>
  );
}
