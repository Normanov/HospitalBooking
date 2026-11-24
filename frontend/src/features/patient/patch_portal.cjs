const fs = require('fs');

const file = String.raw`c:\Users\user\HospitalBooking\frontend\src\features\patient\LivePatientPortal.tsx`;
let content = fs.readFileSync(file, 'utf8');

// ── 1. Add MagnificationDock import ──────────────────────────────────────────
const IMPORT_ANCHOR = "import { apiRequest, signOut } from '../../lib/api';";
if (!content.includes("MagnificationDock")) {
  content = content.replace(
    IMPORT_ANCHOR,
    IMPORT_ANCHOR + "\r\nimport { MagnificationDock } from '../../components/ui/MagnificationDock';"
  );
  console.log('Import added:', content.includes('MagnificationDock'));
} else {
  console.log('Import already present');
}

// ── 2. Replace sidebar nav with enhanced spring animation ─────────────────────
const OLD_SIDEBAR_NAV = `        {/* Nav items */}\r\n        <nav className="flex-1 px-3 py-4 space-y-1">\r\n          {NAV_ITEMS.map((item) => {\r\n            const isActive = activeTab === item.id;\r\n            return (\r\n              <motion.button\r\n                key={item.id}\r\n                type="button"\r\n                onClick={() => handleTabChange(item.id)}\r\n                whileHover={{ x: 3 }}\r\n                whileTap={{ scale: 0.97 }}\r\n                transition={{ type: 'spring', stiffness: 400, damping: 28 }}\r\n                className={\`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer text-left relative \${\r\n                  isActive\r\n                    ? 'bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-md shadow-teal-900/15'\r\n                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'\r\n                }\`}\r\n              >\r\n                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>\r\n                <span className="font-bold">{item.label}</span>\r\n                {isActive && (\r\n                  <motion.span\r\n                    layoutId="sidebarActiveIndicator"\r\n                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/70"\r\n                  />\r\n                )}\r\n              </motion.button>\r\n            );\r\n          })}\r\n        </nav>`;

const NEW_SIDEBAR_NAV = `        {/* Nav items — spring-animated macOS dock style */}\r\n        <nav className="flex-1 px-3 py-4 space-y-1">\r\n          {NAV_ITEMS.map((item) => {\r\n            const isActive = activeTab === item.id;\r\n            return (\r\n              <motion.button\r\n                key={item.id}\r\n                type="button"\r\n                onClick={() => handleTabChange(item.id)}\r\n                whileHover={{ scale: 1.03, x: 4 }}\r\n                whileTap={{ scale: 0.96 }}\r\n                transition={{ type: 'spring', stiffness: 380, damping: 22 }}\r\n                className={\`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold cursor-pointer text-left relative \${\r\n                  isActive\r\n                    ? 'bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-md shadow-teal-900/15'\r\n                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'\r\n                }\`}\r\n              >\r\n                <motion.span\r\n                  animate={{ scale: isActive ? 1.15 : 1 }}\r\n                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}\r\n                  className={isActive ? 'text-white' : 'text-slate-400'}\r\n                >\r\n                  {item.icon}\r\n                </motion.span>\r\n                <span className="font-bold">{item.label}</span>\r\n                {isActive && (\r\n                  <motion.span\r\n                    layoutId="sidebarActiveIndicator"\r\n                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/70"\r\n                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}\r\n                  />\r\n                )}\r\n              </motion.button>\r\n            );\r\n          })}\r\n        </nav>`;

if (content.includes(OLD_SIDEBAR_NAV)) {
  content = content.replace(OLD_SIDEBAR_NAV, NEW_SIDEBAR_NAV);
  console.log('Sidebar nav replaced');
} else {
  console.error('Sidebar nav OLD block not found — check exact whitespace');
}

// ── 3. Replace mobile bottom tab bar → MagnificationDock ─────────────────────
const MOBILE_START = `      {/* -- Mobile Bottom Tab Bar -- */}\r\n      <nav className="lg:hidden fixed bottom-4 left-3 right-3 z-50 mx-auto w-auto max-w-sm bottom-dock rounded-[22px] px-1.5 py-2">`;
const MOBILE_END   = `\r\n      </nav>\r\n    </div>\r\n  );\r\n};`;

const mStart = content.indexOf('Mobile Bottom Tab Bar');
const mEnd   = content.lastIndexOf('\r\n    </div>\r\n  );\r\n};');

if (mStart === -1 || mEnd === -1) {
  console.error('Mobile bar markers not found', mStart, mEnd);
  process.exit(1);
}

// Find opening of that nav/comment
const navCommentStart = content.lastIndexOf('{/* --', mStart);
const navCommentFallback = content.lastIndexOf('{/*', mStart);
const realNavStart = content.lastIndexOf('\r\n      {/* ', mStart);

console.log('navCommentStart:', navCommentStart, 'fallback:', navCommentFallback, 'realNavStart:', realNavStart);

// Find from the nearest newline before "Mobile Bottom Tab Bar"
const lineStart = content.lastIndexOf('\r\n', mStart - 1) + 2; // start of that comment line

const NEW_MOBILE = `{/* -- Magnification Dock -- Mobile Bottom Nav (macOS spring physics) -- */}\r\n      <nav\r\n        className="lg:hidden fixed bottom-4 inset-x-3 sm:inset-x-4 z-50 flex justify-center pointer-events-none"\r\n        aria-label="Mobil pastki menyu"\r\n      >\r\n        <div className="pointer-events-auto w-full max-w-sm">\r\n          <MagnificationDock\r\n            panelHeight={64}\r\n            baseItemSize={44}\r\n            magnification={68}\r\n            distance={160}\r\n            items={NAV_ITEMS.map((item) => ({\r\n              icon: item.icon,\r\n              label: item.shortLabel,\r\n              isActive: activeTab === item.id,\r\n              onClick: () => handleTabChange(item.id),\r\n            }))}\r\n          />\r\n        </div>\r\n      </nav>\r\n    </div>\r\n  );\r\n};`;

content = content.slice(0, lineStart) + NEW_MOBILE;

fs.writeFileSync(file, content, 'utf8');
console.log('Done. Length:', content.length);
console.log('Has MagnificationDock:', content.includes('MagnificationDock'));
console.log('Has spring-animated:', content.includes('spring-animated'));
