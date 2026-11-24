const fs = require('fs');

const file = String.raw`c:\Users\user\HospitalBooking\frontend\src\features\crm\LiveStaffCRM.tsx`;
let content = fs.readFileSync(file, 'utf8');

// ── 1. Sidebar nav block ──────────────────────────────────────────────────────
const OLD_NAV_START = '{/* Navigation Items (Single Clean List) */}';
const OLD_NAV_END   = '{/* Footer Actions */}';

const navStart = content.indexOf(OLD_NAV_START);
const navEnd   = content.indexOf(OLD_NAV_END);
if (navStart === -1 || navEnd === -1) {
  console.error('Nav markers not found!', navStart, navEnd);
  process.exit(1);
}

const NEW_NAV = `{/* Navigation Items -- spring-animated macOS dock style */}\r\n        <nav className="mt-5 space-y-1 flex-1" aria-label="Sections">\r\n          {navTabs.map(({ id, label, icon: Icon, badge, alert: tabAlert }) => {\r\n            const isActive = activeTab === id;\r\n            return (\r\n              <motion.button\r\n                key={id}\r\n                type="button"\r\n                onClick={() => setActiveTab(id)}\r\n                title={isSidebarCollapsed ? label : undefined}\r\n                whileHover={{ scale: 1.03, x: isSidebarCollapsed ? 0 : 3 }}\r\n                whileTap={{ scale: 0.96 }}\r\n                transition={{ type: 'spring', stiffness: 380, damping: 22 }}\r\n                className={\`w-full flex items-center rounded-2xl py-2.5 text-xs font-bold cursor-pointer \${\r\n                  isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'\r\n                } \${\r\n                  isActive\r\n                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-700/20'\r\n                    : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'\r\n                }\`}\r\n              >\r\n                <div className="flex items-center gap-3">\r\n                  <motion.span\r\n                    animate={{ scale: isActive ? 1.12 : 1 }}\r\n                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}\r\n                    className="inline-flex shrink-0"\r\n                  >\r\n                    <Icon className={\`h-4 w-4 \${isActive ? 'text-white' : 'text-slate-500'}\`} />\r\n                  </motion.span>\r\n                  {!isSidebarCollapsed && <span className="truncate">{label}</span>}\r\n                </div>\r\n\r\n                {!isSidebarCollapsed && badge !== undefined && (\r\n                  <motion.span\r\n                    initial={{ scale: 0.8 }}\r\n                    animate={{ scale: 1 }}\r\n                    className={\`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums \${\r\n                      isActive\r\n                        ? 'bg-white/20 text-white'\r\n                        : tabAlert\r\n                        ? 'bg-rose-100 text-rose-700'\r\n                        : 'bg-slate-200/80 text-slate-700'\r\n                    }\`}\r\n                  >\r\n                    {badge}\r\n                  </motion.span>\r\n                )}\r\n              </motion.button>\r\n            );\r\n          })}\r\n        </nav>\r\n\r\n        `;

content = content.slice(0, navStart) + NEW_NAV + content.slice(navEnd);

// ── 2. Mobile bottom nav → MagnificationDock ─────────────────────────────────
const MOBILE_START_NEEDLE = '3. FLOATING TRANSLUCENT';
const mIdx = content.indexOf(MOBILE_START_NEEDLE);
if (mIdx === -1) { console.error('Mobile nav marker not found!'); process.exit(1); }

// Walk back to find the opening of the comment block
const COMMENT_OPEN = '{/* ===';
const mCommentStart = content.lastIndexOf(COMMENT_OPEN, mIdx);

// The file ends with:  \n    </div>\n  );\n};
const FILE_END = '\r\n    </div>\r\n  );\r\n};';
const fileEndIdx = content.lastIndexOf(FILE_END);
if (fileEndIdx === -1) { console.error('File end marker not found!'); process.exit(1); }

const NEW_MOBILE = `{/* =========================================================================\r\n          3. MAGNIFICATION DOCK -- MOBILE BOTTOM NAV (macOS-inspired, spring physics)\r\n          ========================================================================= */}\r\n      <nav\r\n        className="fixed bottom-4 inset-x-3 sm:inset-x-4 z-40 lg:hidden flex justify-center pointer-events-none"\r\n        aria-label="Mobil pastki menyu"\r\n      >\r\n        <div className="pointer-events-auto w-full max-w-sm">\r\n          <MagnificationDock\r\n            panelHeight={64}\r\n            baseItemSize={44}\r\n            magnification={68}\r\n            distance={160}\r\n            items={navTabs.slice(0, 5).map(({ id, label, icon: Icon, badge, alert: tabAlert }) => ({\r\n              icon: <Icon className="w-5 h-5" />,\r\n              label: label,\r\n              isActive: activeTab === id,\r\n              badge: badge !== undefined ? String(badge) : undefined,\r\n              onClick: () => setActiveTab(id),\r\n            }))}\r\n          />\r\n        </div>\r\n      </nav>\r\n    </div>\r\n  );\r\n};`;

content = content.slice(0, mCommentStart) + NEW_MOBILE;

fs.writeFileSync(file, content, 'utf8');
console.log('Done. Length:', content.length);
console.log('Has motion.button:', content.includes('motion.button'));
console.log('Has MagnificationDock:', content.includes('MagnificationDock'));
console.log('Has spring-animated:', content.includes('spring-animated'));
