"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CheckSquare, ChevronRight, LayoutDashboard, Menu, Users, X } from "lucide-react";
import { useState } from "react";

const navigation = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/leads", label: "客户线索", icon: Users },
  { href: "/pipeline", label: "商机漏斗", icon: BarChart3 },
  { href: "/tasks", label: "跟进任务", icon: CheckSquare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <button className="mobile-menu-button icon-button" type="button" onClick={() => setOpen(true)} aria-label="打开导航">
        <Menu size={20} />
      </button>
      {open && <button className="mobile-scrim" type="button" aria-label="关闭导航" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">C</div>
          <div>
            <div className="brand-name">CrossFlow CRM</div>
            <div className="brand-subtitle">跨境销售工作台</div>
          </div>
          <button className="mobile-close-button icon-button" type="button" onClick={() => setOpen(false)} aria-label="关闭导航">
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">工作空间</div>
        <nav className="nav-list" aria-label="主导航">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-item ${active ? "nav-item-active" : ""}`} onClick={() => setOpen(false)}>
                <Icon size={18} strokeWidth={active ? 2.3 : 1.8} />
                <span>{label}</span>
                {active && <ChevronRight size={15} className="nav-arrow" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="demo-callout">
            <span className="status-dot" />
            <div>
              <strong>演示环境</strong>
              <span>数据仅供本机测试</span>
            </div>
          </div>
          <div className="user-chip">
            <div className="avatar avatar-small">陈</div>
            <div>
              <strong>销售工作台</strong>
              <span>单用户模式</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
