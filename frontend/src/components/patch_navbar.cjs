const fs = require('fs');
const file = String.raw`c:\Users\user\HospitalBooking\frontend\src\components\Navbar.tsx`;
let content = fs.readFileSync(file, 'utf8');

// Fix: replace <button with <motion.button for the desktop nav, add spring props
const OLD = `                <button\r\n                  key={item.id}\r\n                  ref={(el) => {\r\n                    desktopBtnRefs.current[item.id] = el;\r\n                  }}\r\n                  type="button"\r\n                  onClick={() => setActiveTab(item.id)}\r\n                  className={\`group/nav relative z-10 flex items-center gap-1.5 rounded-xl px-2.5 py-2 xl:px-3 text-[11px] xl:text-xs font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-[0.97] \${\r\n                    isActive\r\n                      ? \`\${!desktopPill.ready ? 'bg-slate-900 shadow-xs' : ''} text-white\`\r\n                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/55'\r\n                  }\`}\r\n                >`;

const NEW = `                <motion.button\r\n                  key={item.id}\r\n                  ref={(el) => {\r\n                    desktopBtnRefs.current[item.id] = el;\r\n                  }}\r\n                  type="button"\r\n                  onClick={() => setActiveTab(item.id)}\r\n                  whileHover={{ scale: isActive ? 1 : 1.07, y: isActive ? 0 : -1 }}\r\n                  whileTap={{ scale: 0.94 }}\r\n                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}\r\n                  className={\`group/nav relative z-10 flex items-center gap-1.5 rounded-xl px-2.5 py-2 xl:px-3 text-[11px] xl:text-xs font-bold tracking-tight whitespace-nowrap cursor-pointer \${\r\n                    isActive\r\n                      ? \`\${!desktopPill.ready ? 'bg-slate-900 shadow-xs' : ''} text-white\`\r\n                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/55'\r\n                  }\`}\r\n                >`;

if (content.includes(OLD)) {
  content = content.replace(OLD, NEW);
  console.log('Desktop button opening replaced');
} else {
  console.log('OLD not found, trying line-by-line search...');
  // Try to find the button section
  const idx = content.indexOf('<button\r\n                  key={item.id}');
  console.log('button idx:', idx);
  if (idx !== -1) {
    const closeIdx = content.indexOf('>', idx + 200);
    console.log('close idx:', closeIdx);
    const btnText = content.slice(idx, closeIdx + 1);
    console.log('btn text:', JSON.stringify(btnText.substring(0, 100)));
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done');
