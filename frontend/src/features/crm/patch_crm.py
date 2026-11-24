"""Patch LiveStaffCRM.tsx:
1. Replace sidebar nav buttons with spring-animated motion.button
2. Replace mobile bottom nav with MagnificationDock
"""
import re

file = r"c:\Users\user\HospitalBooking\frontend\src\features\crm\LiveStaffCRM.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

# ── 1. Sidebar nav block ──────────────────────────────────────────────────────
old_nav_start = "{/* Navigation Items (Single Clean List) */}"
old_nav_end   = "{/* Footer Actions */}"

start_idx = content.index(old_nav_start)
end_idx   = content.index(old_nav_end)

NEW_NAV = """\
{/* Navigation Items -- spring-animated macOS dock style */}
        <nav className="mt-5 space-y-1 flex-1" aria-label="Sections">
          {navTabs.map(({ id, label, icon: Icon, badge, alert: tabAlert }) => {
            const isActive = activeTab === id;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                title={isSidebarCollapsed ? label : undefined}
                whileHover={{ scale: 1.03, x: isSidebarCollapsed ? 0 : 3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className={`w-full flex items-center rounded-2xl py-2.5 text-xs font-bold cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-700/20'
                    : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={{ scale: isActive ? 1.12 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="inline-flex shrink-0"
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  </motion.span>
                  {!isSidebarCollapsed && <span className="truncate">{label}</span>}
                </div>

                {!isSidebarCollapsed && badge !== undefined && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tabAlert
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {badge}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </nav>

        """

content = content[:start_idx] + NEW_NAV + content[end_idx:]

# ── 2. Mobile bottom nav block → MagnificationDock ───────────────────────────
old_mobile_start = "{/* =========================================================================\n          3. FLOATING TRANSLUCENT iOS-STYLE BOTTOM TAB BAR (ONLY ON MOBILE)"
old_mobile_end   = "\n    </div>\n  );\n};"

m_start = content.index(old_mobile_start)
m_end   = content.rindex(old_mobile_end)  # last occurrence

NEW_MOBILE = """\
{/* =========================================================================
          3. MAGNIFICATION DOCK — MOBILE BOTTOM NAV (macOS-inspired, spring physics)
          ========================================================================= */}
      <nav
        className="fixed bottom-4 inset-x-3 sm:inset-x-4 z-40 lg:hidden flex justify-center pointer-events-none"
        aria-label="Mobil pastki menyu"
      >
        <div className="pointer-events-auto w-full max-w-sm">
          <MagnificationDock
            panelHeight={64}
            baseItemSize={44}
            magnification={68}
            distance={160}
            items={navTabs.slice(0, 5).map(({ id, label, icon: Icon, badge, alert: tabAlert }) => ({
              icon: <Icon className="w-5 h-5" />,
              label: label,
              isActive: activeTab === id,
              badge: badge !== undefined ? badge : undefined,
              onClick: () => setActiveTab(id),
            }))}
          />
        </div>
      </nav>
    </div>
  );
};"""

content = content[:m_start] + NEW_MOBILE

with open(file, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. File length:", len(content))
print("Has motion.button:", "motion.button" in content)
print("Has MagnificationDock:", "MagnificationDock" in content)
