"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  FileSpreadsheet,
  LayoutDashboard,
  MapPinned,
  Menu,
  Network,
  ScrollText,
  Moon,
  Sun,
  Radio,
  ChevronLeft,
  ChevronRight,
  Bot,
} from "lucide-react";
import MiniAgentWidget from "@/src/components/dashboard/MiniAgentWidget";

const navigation = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/api-status", label: "Verificación API", icon: Network },
  { href: "/ejecuciones", label: "Ejecuciones", icon: Activity },
  { href: "/mini-agente", label: "Mini Agente", icon: Bot },
  { href: "/reportes", label: "Excel y reportes", icon: FileSpreadsheet },
  { href: "/zonas", label: "Análisis por zona", icon: MapPinned },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [light, setLight] = useState(true);

  return (
    <div className={light ? "app-shell app-light" : "app-shell"}>
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Radio size={21} /></div>
          {!collapsed && (
            <div>
              <strong>METEOSTREAM</strong>
              <span>Monitoreo automatizado</span>
            </div>
          )}
        </div>
        <button className="sidebar-collapse" onClick={() => setCollapsed((value) => !value)} aria-label="Plegar menú">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "nav-link active" : "nav-link"} title={collapsed ? item.label : undefined} onClick={() => setMobileOpen(false)}>
                <Icon size={19} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button>
          <div className="topbar-context">
            <span>SISTEMA DE MONITOREO RPA</span>
            <strong>{navigation.find((item) => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))?.label ?? "MeteoStream"}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setLight((value) => !value)} aria-label="Cambiar tema">
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="live-status"><span /> API</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
      <MiniAgentWidget />
    </div>
  );
}
