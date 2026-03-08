import { useState, useEffect, useRef, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, Cell, ReferenceLine
} from "recharts";
import {
  Mic, MicOff, Phone, PhoneOff, ShoppingCart, TrendingUp, TrendingDown,
  AlertTriangle, Star, Zap, Globe, CheckCircle, XCircle, Package,
  BarChart2, Utensils, Clock, Plus, Minus, Trash2, ChefHat,
  Activity, Bell, Award, Download, RefreshCw, Upload, FileText, Database
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════
const T = {
  bg:      "#07090E",
  card:    "#0C0F18",
  card2:   "#111520",
  border:  "#191E2E",
  borderB: "#242C40",
  text:    "#DDE3F2",
  muted:   "#5A6480",
  amber:   "#F5A623",
  amberD:  "#C27C0E",
  cyan:    "#22D3EE",
  purple:  "#A855F7",
  green:   "#10B981",
  red:     "#F87171",
  blue:    "#38BDF8",
};

// ═══════════════════════════════════════════════════════════════════
// RAW DATA — RESTAURANT POS DATABASE
// ═══════════════════════════════════════════════════════════════════
const RAW_MENU = [
  {id:1,  name:"Paneer Tikka",         cat:"Starters",  price:280, cost:95,  sales:145, emoji:"🧀"},
  {id:2,  name:"Chicken 65",           cat:"Starters",  price:260, cost:110, sales:89,  emoji:"🍗"},
  {id:3,  name:"Veg Spring Roll",      cat:"Starters",  price:180, cost:85,  sales:42,  emoji:"🥗"},
  {id:4,  name:"Tomato Soup",          cat:"Starters",  price:120, cost:65,  sales:28,  emoji:"🍲"},
  {id:5,  name:"Butter Chicken",       cat:"Mains",     price:380, cost:145, sales:198, emoji:"🍛"},
  {id:6,  name:"Dal Makhani",          cat:"Mains",     price:240, cost:60,  sales:167, emoji:"🥘"},
  {id:7,  name:"Paneer Butter Masala", cat:"Mains",     price:320, cost:105, sales:134, emoji:"🧀"},
  {id:8,  name:"Fish Curry",           cat:"Mains",     price:420, cost:195, sales:56,  emoji:"🐟"},
  {id:9,  name:"Chicken Biryani",      cat:"Mains",     price:350, cost:140, sales:223, emoji:"🍚"},
  {id:10, name:"Veg Biryani",          cat:"Mains",     price:280, cost:90,  sales:88,  emoji:"🌿"},
  {id:11, name:"Butter Naan",          cat:"Breads",    price:60,  cost:12,  sales:342, emoji:"🫓"},
  {id:12, name:"Tandoori Roti",        cat:"Breads",    price:40,  cost:8,   sales:267, emoji:"🫓"},
  {id:13, name:"Laccha Paratha",       cat:"Breads",    price:70,  cost:18,  sales:156, emoji:"🫓"},
  {id:14, name:"Stuffed Kulcha",       cat:"Breads",    price:90,  cost:25,  sales:67,  emoji:"🫓"},
  {id:15, name:"Mango Lassi",          cat:"Beverages", price:120, cost:28,  sales:189, emoji:"🥭"},
  {id:16, name:"Masala Chai",          cat:"Beverages", price:60,  cost:10,  sales:234, emoji:"☕"},
  {id:17, name:"Fresh Lime Soda",      cat:"Beverages", price:80,  cost:15,  sales:145, emoji:"🍋"},
  {id:18, name:"Cold Coffee",          cat:"Beverages", price:140, cost:35,  sales:78,  emoji:"🧋"},
  {id:19, name:"Gulab Jamun",          cat:"Desserts",  price:120, cost:30,  sales:134, emoji:"🍮"},
  {id:20, name:"Kulfi",               cat:"Desserts",  price:140, cost:45,  sales:89,  emoji:"🍦"},
  {id:21, name:"Rasgulla",            cat:"Desserts",  price:100, cost:22,  sales:67,  emoji:"🍮"},
  {id:22, name:"Chocolate Brownie",   cat:"Desserts",  price:180, cost:55,  sales:45,  emoji:"🍫"},
];

const ASSOC_RULES = [
  {ids:[5,11],    lift:2.4, freq:89,  disc:10},
  {ids:[9,17],    lift:1.8, freq:67,  disc:12},
  {ids:[1,15],    lift:2.1, freq:78,  disc:8 },
  {ids:[6,12],    lift:1.9, freq:112, disc:10},
  {ids:[7,13],    lift:2.0, freq:65,  disc:10},
  {ids:[5,9,11],  lift:3.1, freq:45,  disc:15},
  {ids:[16,19],   lift:2.3, freq:89,  disc:8 },
  {ids:[2,17],    lift:1.7, freq:54,  disc:10},
];

// ═══════════════════════════════════════════════════════════════════
// REVENUE INTELLIGENCE ENGINE
// ═══════════════════════════════════════════════════════════════════
function enrichMenu(raw) {
  const maxSales = Math.max(...raw.map(i => i.sales));
  const allMargins = raw.map(i => ((i.price - i.cost) / i.price) * 100);
  const avgMargin = allMargins.reduce((a, b) => a + b, 0) / allMargins.length;
  const sorted = [...raw].sort((a, b) => a.sales - b.sales);
  const medianSales = sorted[Math.floor(sorted.length / 2)].sales;

  return raw.map(item => {
    const cm = item.price - item.cost;
    const marginPct = (cm / item.price) * 100;
    const popScore = (item.sales / maxSales) * 100;
    const totalRevenue = item.price * item.sales;
    const totalProfit = cm * item.sales;
    const highM = marginPct > avgMargin;
    const highP = item.sales > medianSales;

    let cls, clsColor, rec, urgency;
    if (highM && highP) {
      cls = "Star"; clsColor = "#FBBF24"; urgency = "none";
      rec = "Top performer — promote aggressively on all channels, maintain pricing.";
    } else if (!highM && highP) {
      cls = "Plowhorse"; clsColor = "#38BDF8"; urgency = "medium";
      rec = `Popular but margin is thin. Raise price to ₹${Math.ceil(item.price * 1.12 / 10) * 10} or reduce food cost by ₹${Math.ceil(item.cost * 0.1)}.`;
    } else if (highM && !highP) {
      cls = "Puzzle"; clsColor = "#C084FC"; urgency = "medium";
      rec = "High margin, low visibility. Feature in combo deals and promoted sections.";
    } else {
      cls = "Dog"; clsColor = "#F87171"; urgency = "high";
      rec = "Low margin AND low demand. Revamp recipe, reprice, or remove from menu.";
    }

    const targetMargin = 0.68;
    const optimalPrice = Math.ceil(item.cost / (1 - targetMargin) / 10) * 10;
    const profitGainAtOptimal = (optimalPrice - item.price) * item.sales;

    return {
      ...item, cm, marginPct, popScore, totalRevenue, totalProfit,
      cls, clsColor, rec, urgency, optimalPrice, profitGainAtOptimal,
    };
  });
}

function buildCombos(menu, rules) {
  const map = Object.fromEntries(menu.map(i => [i.id, i]));
  return rules.map(r => {
    const items = r.ids.map(id => map[id]).filter(Boolean);
    const origTotal = items.reduce((s, i) => s + i.price, 0);
    const comboPrice = Math.ceil(origTotal * (1 - r.disc / 100) / 10) * 10;
    const savings = origTotal - comboPrice;
    const combinedCM = items.reduce((s, i) => s + i.cm, 0);
    return { ...r, items, origTotal, comboPrice, savings, combinedCM, profitAtCombo: combinedCM - savings };
  }).sort((a, b) => b.lift - a.lift);
}

function getSmartUpsells(orderItems, allMenu, combos) {
  const orderedIds = orderItems.map(o => o.id);
  const relevantCombos = combos.filter(c =>
    c.items.some(ci => orderedIds.includes(ci.id)) &&
    c.items.some(ci => !orderedIds.includes(ci.id))
  ).slice(0, 2);
  const highMarginItems = allMenu
    .filter(i => !orderedIds.includes(i.id) && (i.cls === "Star" || i.cls === "Puzzle"))
    .sort((a, b) => b.marginPct - a.marginPct)
    .slice(0, 3);
  return { combos: relevantCombos, items: highMarginItems };
}

// ═══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════
function Card({ children, style = {}, highlight, ...rest }) {
  return (
    <div {...rest} style={{
      background: T.card, border: `1px solid ${highlight ? T.borderB : T.border}`,
      borderRadius: 12, padding: "20px 24px",
      boxShadow: highlight ? `0 0 32px rgba(245,166,35,0.08)` : "0 2px 20px rgba(0,0,0,0.4)",
      ...style
    }}>
      {children}
    </div>
  );
}

function Pill({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      cursor: "pointer", border: "none", transition: "all 0.15s",
      background: active ? (color || T.amber) : T.border,
      color: active ? (color === T.cyan ? "#000" : color ? "#fff" : "#000") : T.muted,
    }}>{label}</button>
  );
}

function ClassBadge({ cls }) {
  const map = {
    Star:      { color: "#FBBF24", bg: "rgba(251,191,36,0.1)",  icon: "⭐" },
    Plowhorse: { color: "#38BDF8", bg: "rgba(56,189,248,0.1)",  icon: "🐴" },
    Puzzle:    { color: "#C084FC", bg: "rgba(192,132,252,0.1)", icon: "🔮" },
    Dog:       { color: "#F87171", bg: "rgba(248,113,113,0.1)", icon: "🐶" },
  };
  const c = map[cls] || map.Dog;
  return (
    <span style={{
      background: c.bg, color: c.color,
      border: `1px solid ${c.color}33`, borderRadius: 6,
      padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    }}>{c.icon} {cls}</span>
  );
}

function MarginBar({ pct }) {
  const col = pct > 60 ? T.green : pct > 40 ? T.amber : T.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 48, height: 4, borderRadius: 2, background: T.border, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: col, borderRadius: 2 }} />
      </div>
      <span style={{ color: col, fontSize: 12, fontWeight: 700, minWidth: 36 }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: REVENUE DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function Dashboard({ menu, combos }) {
  const kpis = useMemo(() => {
    const totalRev    = menu.reduce((s, i) => s + i.totalRevenue, 0);
    const totalProfit = menu.reduce((s, i) => s + i.totalProfit, 0);
    const totalOrders = menu.reduce((s, i) => s + i.sales, 0);
    const avgMargin   = menu.reduce((s, i) => s + i.marginPct, 0) / menu.length;
    const aov         = totalRev / totalOrders;
    const dogCount    = menu.filter(i => i.cls === "Dog").length;
    const plowCount   = menu.filter(i => i.cls === "Plowhorse").length;
    return { totalRev, totalProfit, totalOrders, avgMargin, aov, dogCount, plowCount };
  }, [menu]);

  const topProfit = useMemo(() => [...menu].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 8), [menu]);
  const scatterData = useMemo(() => menu.map(i => ({
    x: parseFloat(i.popScore.toFixed(1)), y: parseFloat(i.marginPct.toFixed(1)),
    name: i.name, color: i.clsColor, size: Math.max(6, Math.min(20, Math.sqrt(i.totalProfit / 8))),
  })), [menu]);
  const clsDist = useMemo(() => [
    { name: "Stars",      val: menu.filter(i => i.cls === "Star").length,      fill: "#FBBF24" },
    { name: "Plowhorses", val: menu.filter(i => i.cls === "Plowhorse").length, fill: "#38BDF8" },
    { name: "Puzzles",    val: menu.filter(i => i.cls === "Puzzle").length,    fill: "#C084FC" },
    { name: "Dogs",       val: menu.filter(i => i.cls === "Dog").length,        fill: "#F87171" },
  ], [menu]);

  const CustomDot = ({ cx, cy, payload }) => (
    <circle cx={cx} cy={cy} r={payload.size} fill={payload.color} fillOpacity={0.85}
      stroke={payload.color} strokeWidth={1.5} strokeOpacity={0.4} />
  );

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: T.card2, border: `1px solid ${T.borderB}`, borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{d.name}</div>
        <div style={{ color: T.muted, fontSize: 11 }}>Popularity: {d.x}% · Margin: {d.y}%</div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { label: "Total Revenue (30D)", val: `₹${(kpis.totalRev / 100000).toFixed(2)}L`, sub: `${kpis.totalOrders.toLocaleString()} orders`, icon: <TrendingUp size={18} />, col: T.amber },
          { label: "Total Profit (30D)",  val: `₹${(kpis.totalProfit / 100000).toFixed(2)}L`, sub: `${kpis.avgMargin.toFixed(1)}% avg margin`, icon: <Award size={18} />, col: T.green },
          { label: "Avg Order Value",     val: `₹${kpis.aov.toFixed(0)}`, sub: "per order (blended)", icon: <ShoppingCart size={18} />, col: T.cyan },
          { label: "Risk Items",          val: `${kpis.dogCount + kpis.plowCount}`, sub: `${kpis.dogCount} Dogs · ${kpis.plowCount} Plowhorses`, icon: <AlertTriangle size={18} />, col: T.red },
        ].map((k, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>{k.label}</div>
                <div style={{ color: T.text, fontSize: 28, fontWeight: 800, fontFamily: "'Fraunces',serif", lineHeight: 1 }}>{k.val}</div>
                <div style={{ color: T.muted, fontSize: 11, marginTop: 6 }}>{k.sub}</div>
              </div>
              <div style={{ color: k.col, background: `${k.col}18`, padding: 10, borderRadius: 10 }}>{k.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Top Items by Profit Contribution (30D)</div>
          <div style={{ color: T.muted, fontSize: 11, marginBottom: 16 }}>Colour-coded by classification · Hover for details</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProfit} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={52} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: T.card2, border: `1px solid ${T.borderB}`, borderRadius: 8 }} formatter={v => [`₹${v.toLocaleString()}`, "Profit"]} />
              <Bar dataKey="totalProfit" radius={[5, 5, 0, 0]}>
                {topProfit.map((e, i) => <Cell key={i} fill={e.clsColor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Menu Classification Breakdown</div>
          <ResponsiveContainer width="100%" height={176}>
            <BarChart data={clsDist} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: T.muted, fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: T.muted, fontSize: 12 }} width={84} />
              <Tooltip contentStyle={{ background: T.card2, border: `1px solid ${T.borderB}`, borderRadius: 8 }} />
              <Bar dataKey="val" radius={[0, 5, 5, 0]}>
                {clsDist.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {clsDist.map(c => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.fill }} />
                <span style={{ color: T.muted, fontSize: 11 }}>{c.name}: <strong style={{ color: T.text }}>{c.val}</strong></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* BCG Matrix Scatter */}
      <Card>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>BCG Menu Matrix — Popularity Score vs Contribution Margin</div>
        <div style={{ color: T.muted, fontSize: 11, marginBottom: 16 }}>Bubble size proportional to total profit. Each item plotted by sales velocity and margin percentage.</div>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <ReferenceLine x={50} stroke={T.borderB} strokeDasharray="4 4" />
            <ReferenceLine y={66} stroke={T.borderB} strokeDasharray="4 4" />
            <XAxis dataKey="x" type="number" name="Popularity" domain={[0, 105]}
              tick={{ fill: T.muted, fontSize: 10 }}
              label={{ value: "Popularity Score  →", position: "insideBottomRight", offset: -8, fill: T.muted, fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="Margin %" domain={[0, 90]}
              tick={{ fill: T.muted, fontSize: 10 }}
              label={{ value: "Margin %  →", angle: -90, position: "insideLeft", fill: T.muted, fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: T.muted }} />
            <Scatter data={scatterData} shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 8 }}>
          {[["⭐ Stars","#FBBF24"],["🐴 Plowhorses","#38BDF8"],["🔮 Puzzles","#C084FC"],["🐶 Dogs","#F87171"]].map(([l,c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.85 }} />
              <span style={{ color: T.muted, fontSize: 11 }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Combo Recommendations */}
      <Card>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          <Zap size={14} style={{ color: T.amber, marginRight: 6, verticalAlign: "middle" }} />
          Association Analysis — Smart Combo Recommendations
        </div>
        <div style={{ color: T.muted, fontSize: 11, marginBottom: 16 }}>Items frequently bought together · Lift score indicates co-purchase strength vs random</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {combos.slice(0, 4).map((c, i) => (
            <div key={i} style={{
              background: T.card2, borderRadius: 10, padding: 16,
              border: `1px solid ${T.border}`, borderTop: `2px solid ${T.amber}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: T.amber, fontSize: 11, fontWeight: 800 }}>LIFT {c.lift.toFixed(1)}×</span>
                <span style={{ color: T.green, fontSize: 11, fontWeight: 700 }}>{c.disc}% OFF</span>
              </div>
              <div style={{ color: T.text, fontSize: 12, fontWeight: 700, marginBottom: 8, lineHeight: 1.5 }}>
                {c.items.map(i => `${i.emoji} ${i.name}`).join("\n+ ")}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: T.muted, fontSize: 11, textDecoration: "line-through" }}>₹{c.origTotal}</span>
                <span style={{ color: T.green, fontWeight: 800, fontSize: 14 }}>₹{c.comboPrice}</span>
              </div>
              <div style={{ color: T.muted, fontSize: 10 }}>Save ₹{c.savings} · Co-ordered {c.freq}×</div>
            </div>
          ))}
        </div>
      </Card>

      {/* High-margin under-promoted */}
      <Card>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          <Star size={14} style={{ color: T.purple, marginRight: 6, verticalAlign: "middle" }} />
          Upsell Prioritization — High-Margin Under-Promoted Items
        </div>
        <div style={{ color: T.muted, fontSize: 11, marginBottom: 16 }}>Puzzle items with strong profit potential. Feature these in combos and promotions to boost AOV.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
          {menu.filter(i => i.cls === "Puzzle").map(item => (
            <div key={item.id} style={{ background: T.card2, borderRadius: 10, padding: 14, border: `1px solid rgba(192,132,252,0.2)` }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{item.emoji}</div>
              <div style={{ color: T.text, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
              <div style={{ color: T.purple, fontSize: 13, fontWeight: 800 }}>₹{item.cm} CM</div>
              <div style={{ color: T.muted, fontSize: 10, marginTop: 2 }}>{item.marginPct.toFixed(0)}% margin · {item.sales} sold</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: MENU ANALYSIS
// ═══════════════════════════════════════════════════════════════════
function MenuAnalysis({ menu }) {
  const [filterCls, setFilterCls] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [sortBy, setSortBy]   = useState("totalProfit");
  const [selected, setSelected] = useState(null);

  const cats = ["All", ...new Set(RAW_MENU.map(i => i.cat))];
  const clss = ["All", "Star", "Plowhorse", "Puzzle", "Dog"];

  const filtered = useMemo(() => {
    let items = [...menu];
    if (filterCls !== "All") items = items.filter(i => i.cls === filterCls);
    if (filterCat !== "All") items = items.filter(i => i.cat === filterCat);
    return items.sort((a, b) => b[sortBy] - a[sortBy]);
  }, [menu, filterCls, filterCat, sortBy]);

  const dogs   = menu.filter(i => i.cls === "Dog");
  const puzzles = menu.filter(i => i.cls === "Puzzle");
  const plows  = menu.filter(i => i.cls === "Plowhorse");

  const TH = ({ children }) => (
    <th style={{ padding: "11px 14px", textAlign: "left", color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}` }}>
      {children}
    </th>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Alert Banners */}
      {dogs.length > 0 && (
        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertTriangle size={15} style={{ color: T.red, flexShrink: 0, marginTop: 1 }} />
          <div style={{ color: T.text, fontSize: 13 }}>
            <strong style={{ color: T.red }}>Low-Margin Low-Volume (Dogs):</strong>{" "}
            {dogs.map(i => i.name).join(", ")} — these items are underperforming on both margin and demand.
          </div>
        </div>
      )}
      {plows.length > 0 && (
        <div style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <TrendingDown size={15} style={{ color: T.blue, flexShrink: 0, marginTop: 1 }} />
          <div style={{ color: T.text, fontSize: 13 }}>
            <strong style={{ color: T.blue }}>Low-Margin High-Volume Risk (Plowhorses):</strong>{" "}
            {plows.map(i => i.name).join(", ")} — popular items eating into profits. Price optimization recommended.
          </div>
        </div>
      )}
      {puzzles.length > 0 && (
        <div style={{ background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Star size={15} style={{ color: T.purple, flexShrink: 0, marginTop: 1 }} />
          <div style={{ color: T.text, fontSize: 13 }}>
            <strong style={{ color: T.purple }}>High-Margin Under-Promoted (Puzzles):</strong>{" "}
            {puzzles.map(i => i.name).join(", ")} — strong profit potential; increase visibility through combos.
          </div>
        </div>
      )}

      {/* Filters */}
      <Card style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {clss.map(c => <Pill key={c} label={c} active={filterCls === c} color={c === "All" ? T.amber : undefined} onClick={() => setFilterCls(c)} />)}
          </div>
          <div style={{ width: 1, height: 22, background: T.border }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {cats.map(c => <Pill key={c} label={c} active={filterCat === c} color={T.cyan} onClick={() => setFilterCat(c)} />)}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: T.muted, fontSize: 12 }}>Sort by:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
              background: T.card2, border: `1px solid ${T.border}`, color: T.text,
              padding: "5px 10px", borderRadius: 7, fontSize: 12, outline: "none"
            }}>
              <option value="totalProfit">Total Profit</option>
              <option value="marginPct">Margin %</option>
              <option value="sales">Sales Volume</option>
              <option value="totalRevenue">Revenue</option>
              <option value="cm">Contribution Margin</option>
              <option value="popScore">Popularity Score</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.card2 }}>
                <TH>Item</TH><TH>Category</TH><TH>Price</TH><TH>Food Cost</TH>
                <TH>Cont. Margin</TH><TH>Margin %</TH><TH>30D Sales</TH>
                <TH>Revenue</TH><TH>Profit</TH><TH>Optimal Price</TH>
                <TH>Classification</TH><TH>Urgency</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  style={{
                    borderBottom: `1px solid ${T.border}`,
                    background: selected?.id === item.id ? T.card2 : "transparent",
                    cursor: "pointer", transition: "background 0.12s",
                  }}>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 17 }}>{item.emoji}</span>
                      <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", color: T.muted, fontSize: 12 }}>{item.cat}</td>
                  <td style={{ padding: "11px 14px", color: T.text, fontSize: 13, fontWeight: 600 }}>₹{item.price}</td>
                  <td style={{ padding: "11px 14px", color: T.muted, fontSize: 12 }}>₹{item.cost}</td>
                  <td style={{ padding: "11px 14px", color: T.green, fontSize: 13, fontWeight: 700 }}>₹{item.cm}</td>
                  <td style={{ padding: "11px 14px" }}><MarginBar pct={item.marginPct} /></td>
                  <td style={{ padding: "11px 14px", color: T.text, fontSize: 13 }}>{item.sales}</td>
                  <td style={{ padding: "11px 14px", color: T.text, fontSize: 12 }}>₹{item.totalRevenue.toLocaleString()}</td>
                  <td style={{ padding: "11px 14px", color: T.green, fontSize: 12, fontWeight: 700 }}>₹{item.totalProfit.toLocaleString()}</td>
                  <td style={{ padding: "11px 14px" }}>
                    {item.optimalPrice !== item.price
                      ? <span style={{ color: T.amber, fontWeight: 700, fontSize: 12 }}>₹{item.optimalPrice}</span>
                      : <span style={{ color: T.green, fontSize: 11 }}>✓ Optimal</span>}
                  </td>
                  <td style={{ padding: "11px 14px" }}><ClassBadge cls={item.cls} /></td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      color: item.urgency === "high" ? T.red : item.urgency === "medium" ? T.amber : T.green,
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase"
                    }}>
                      {item.urgency === "none" ? "✓ Good" : item.urgency === "high" ? "⚠ High" : "• Medium"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Panel */}
      {selected && (
        <Card highlight style={{ borderLeft: `3px solid ${selected.clsColor}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 36 }}>{selected.emoji}</span>
              <div>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 20, fontFamily: "'Fraunces',serif" }}>{selected.name}</div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{selected.cat} · Item #{selected.id}</div>
              </div>
              <ClassBadge cls={selected.cls} />
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}>
              <XCircle size={18} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
            <div>
              <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>ITEM PERFORMANCE METRICS</div>
              {[
                ["Selling Price", `₹${selected.price}`, T.text],
                ["Food Cost", `₹${selected.cost}`, T.muted],
                ["Contribution Margin", `₹${selected.cm}`, T.green],
                ["Margin %", `${selected.marginPct.toFixed(1)}%`, selected.marginPct > 60 ? T.green : selected.marginPct > 40 ? T.amber : T.red],
                ["Popularity Score", `${selected.popScore.toFixed(0)} / 100`, T.cyan],
                ["30-Day Sales", `${selected.sales} orders`, T.text],
                ["Monthly Revenue", `₹${selected.totalRevenue.toLocaleString()}`, T.text],
                ["Monthly Profit", `₹${selected.totalProfit.toLocaleString()}`, T.green],
              ].map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.muted, fontSize: 12 }}>{k}</span>
                  <span style={{ color: c, fontSize: 13, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>AI RECOMMENDATION</div>
                <div style={{ background: T.card2, borderRadius: 10, padding: 16, border: `1px solid ${selected.clsColor}33` }}>
                  <div style={{ color: selected.clsColor, fontSize: 11, fontWeight: 800, marginBottom: 6 }}>ACTION REQUIRED</div>
                  <div style={{ color: T.text, fontSize: 13, lineHeight: 1.65 }}>{selected.rec}</div>
                </div>
              </div>
              {selected.optimalPrice !== selected.price && (
                <div style={{ background: T.card2, borderRadius: 10, padding: 16, border: `1px solid ${T.amber}33` }}>
                  <div style={{ color: T.amber, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>💰 PRICE OPTIMIZATION (Target: 68% Margin)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ color: T.red, fontWeight: 800, fontSize: 16 }}>₹{selected.price}</span>
                    <span style={{ color: T.muted }}>→</span>
                    <span style={{ color: T.green, fontWeight: 800, fontSize: 18 }}>₹{selected.optimalPrice}</span>
                  </div>
                  <div style={{ color: T.muted, fontSize: 11 }}>
                    Expected monthly profit gain:{" "}
                    <strong style={{ color: T.amber }}>
                      ₹{Math.abs(selected.profitGainAtOptimal).toLocaleString()}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODULE-LEVEL LOG STORE — persists across re-renders, survives HMR
// ═══════════════════════════════════════════════════════════════════
let _persistedLogs = [];

// ═══════════════════════════════════════════════════════════════════
// TAB: VOICE COPILOT
// ═══════════════════════════════════════════════════════════════════
function VoiceCopilot({ menu, combos, onKotCreated }) {
  const [isCallActive, setIsCallActive]     = useState(false);
  const [isListening, setIsListening]       = useState(false);
  const [transcript, setTranscript]         = useState("");
  const [interim, setInterim]               = useState("");
  const [language, setLanguage]             = useState("en-IN");
  const [tableNum, setTableNum]             = useState("T-1");
  const [currentOrder, setCurrentOrder]     = useState([]);
  const [aiResult, setAiResult]             = useState(null);
  const [upsells, setUpsells]               = useState({ combos: [], items: [] });
  const [isProcessing, setIsProcessing]     = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [callLog, setCallLog]               = useState(_persistedLogs);

  const recogRef       = useRef(null);
  const logEndRef      = useRef(null);
  const isListeningRef = useRef(false);
  const workerRef      = useRef(null);
  const menuMap = useMemo(() => Object.fromEntries(menu.map(i => [i.id, i])), [menu]);

  const LANGS = [
    { code: "en-IN", label: "English (India)", flag: "🇮🇳" },
    { code: "hi-IN", label: "Hindi",           flag: "🇮🇳" },
    { code: "en-US", label: "English (US)",    flag: "🇺🇸" },
    { code: "ta-IN", label: "Tamil",           flag: "🇮🇳" },
    { code: "te-IN", label: "Telugu",          flag: "🇮🇳" },
    { code: "mr-IN", label: "Marathi",         flag: "🇮🇳" },
  ];

  const speechOK = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Initialize the worker safely inside the component lifecycle
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [callLog]);

  function addLog(role, text) {
    const entry = { role, text, time: new Date() };
    _persistedLogs = [..._persistedLogs, entry];
    setCallLog([..._persistedLogs]);
  }

  function startCall() {
    _persistedLogs = [{ role: "system", text: `📞 Call started · Table: ${tableNum} · Language: ${LANGS.find(l => l.code === language)?.label}`, time: new Date() }];
    setIsCallActive(true);
    setCurrentOrder([]);
    setAiResult(null);
    setOrderConfirmed(false);
    setCallLog([..._persistedLogs]);
  }

  function endCall() {
    stopListening();
    window.speechSynthesis?.cancel();
    setIsCallActive(false);
    setTranscript("");
    setInterim("");
    addLog("system", "📵 Call ended.");
  }

  function spawnRecognizer() {
    if (!isListeningRef.current) return;
    const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang             = language;
    rec.continuous       = true;
    rec.interimResults   = true;
    rec.maxAlternatives  = 1;

    rec.onresult = e => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else int += t;
      }
      setInterim(int);
      if (fin) setTranscript(prev => (prev ? prev + " " : "") + fin);
    };

    rec.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) spawnRecognizer();
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    rec.onerror = e => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      console.error("SpeechRecognition error:", e.error);
      setIsListening(false);
      isListeningRef.current = false;
    };

    recogRef.current = rec;
    try { rec.start(); } catch (err) { console.error(err); }
  }

  function startListening() {
    if (!speechOK) return;
    isListeningRef.current = true;
    setIsListening(true);
    spawnRecognizer();
  }

  function stopListening() {
    isListeningRef.current = false;
    setIsListening(false);
    setInterim("");
    try { recogRef.current?.stop(); } catch (_) {}
    recogRef.current = null;
  }

  function speakText(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.rate   = 1.0;
    utt.pitch  = 1.0;
    utt.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Female"))
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utt.voice = preferred;
    window.speechSynthesis.speak(utt);
  }

  // ═══════════════════════════════════════════════════════════════════
  // THE NEW, INDESTRUCTIBLE SPLIT PARSER 
  // ═══════════════════════════════════════════════════════════════════
  // Local processing function for the Qwen 1.5B model
  // Local processing function with React-Generated Conversations
  // Local processing function with React-Generated Conversations
  // Local processing function with Rigorous Matching & Hinglish Dictionary
  // Local processing function with React doing all the talking
  // Local processing function using the "Bracket Trap" Scanner
  async function processOrderLocally(transcriptText, fullMenu) {
    if (!workerRef.current) throw new Error("Worker is still loading or unavailable.");
    
    return new Promise((resolve, reject) => {
      workerRef.current.postMessage({ text: transcriptText, menu: fullMenu });
      
      const handleMessage = (e) => {
        const data = e.data;

        if (data.status === 'info') {
            addLog('system', `⚙️ ${data.message}`);
        } 
        else if (data.status === 'error') {
            cleanup();
            reject(new Error(`Worker Error: ${data.error}`));
        }
        else if (data.status === 'complete') {
            cleanup();
            let raw = data.result || "";
            raw = raw.replace(/<\|im_end\|>/g, '').trim(); 
            console.log("🧠 RAW AI OUTPUT:", raw);

            let parsedItems = [];
            
            // 1. Erase the brackets from the string for the UI chat
            let parsedResponse = raw.replace(/\[.*?\]/g, '').trim();

            const wordToNum = {
                "ek": 1, "one": 1, "a": 1, "an": 1, "single": 1,
                "do": 2, "two": 2, "tu": 2,
                "teen": 3, "three": 3, "tin": 3,
                "char": 4, "four": 4,
                "paanch": 5, "five": 5, "panch": 5
            };

            function parseQuantity(qtyStr) {
                if (!qtyStr) return 1;
                const cleanStr = qtyStr.toLowerCase().trim();
                if (!isNaN(parseInt(cleanStr))) return parseInt(cleanStr);
                return wordToNum[cleanStr] || 1; 
            }

            try {
                // 2. Scan the raw text for [Item Name, Quantity]
                const bracketRegex = /\[(.*?)\s*,\s*(.*?)\]/g;
                const matches = [...raw.matchAll(bracketRegex)];

                matches.forEach(m => {
                    const aiItemName = m[1].trim().toLowerCase();
                    const itemQty = parseQuantity(m[2]);

                    // Ignore if the AI output [NONE, 0]
                    if (aiItemName !== 'none') {
                        // Fuzzy match to your actual database
                        const menuItem = fullMenu.find(item => {
                            const dbName = item.name.toLowerCase();
                            return dbName === aiItemName || 
                                   dbName.includes(aiItemName) || 
                                   aiItemName.includes(dbName);
                        });

                        if (menuItem) {
                            parsedItems.push({ id: menuItem.id, qty: itemQty });
                        }
                    }
                });

                // 3. Dynamic UI Fallbacks
                if (!parsedResponse) {
                    if (parsedItems.length > 0) {
                        parsedResponse = "I've added those items to your order.";
                    } else {
                        parsedResponse = "I can help you with the menu, or tell me what you'd like to order!";
                    }
                }

                resolve({ 
                    items: parsedItems, 
                    assistantResponse: parsedResponse 
                });

            } catch (err) {
                console.error("Parsing failed entirely:", err);
                reject(new Error("Could not understand the AI's output."));
            }
        }
      };

      const handleError = (err) => {
        cleanup();
        reject(new Error("Worker initialization error: " + err.message));
      };

      const cleanup = () => {
        workerRef.current.removeEventListener('message', handleMessage);
        workerRef.current.removeEventListener('error', handleError);
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.addEventListener('error', handleError);
    });
  }
  // ═══════════════════════════════════════════════════════════════════

  async function processOrder() {
    if (!transcript.trim()) return;
    const text = transcript.trim();
    setIsProcessing(true);
    addLog("customer", text);

    try {
      const result = await processOrderLocally(text, menu);
      setAiResult(result);
      addLog("ai", result.assistantResponse);
      speakText(result.assistantResponse);

      const newOrder = [...currentOrder];
      for (const item of result.items || []) {
        const existing = newOrder.find(o => o.id === item.id);
        if (existing) existing.qty += item.qty;
        else {
          const menuItem = menuMap[item.id];
          if (menuItem) newOrder.push({ ...menuItem, qty: item.qty, modifiers: item.modifiers || { spice: "medium", size: "regular", addons: [] } });
        }
      }
      setCurrentOrder(newOrder);
      setUpsells(getSmartUpsells(newOrder, menu, combos));

      if (result.clarifications?.length) {
        result.clarifications.forEach(q => addLog("clarify", q));
      }

      setTranscript("");
      setInterim("");
    } catch (err) {
      console.error("processOrder error:", err);
      addLog("error", `⚠ ${err.message || "Could not process order. Check console for details."}`);
    } finally {
      setIsProcessing(false);
    }
  }

  function addItemManually(item) {
    setCurrentOrder(prev => {
      const ex = prev.find(o => o.id === item.id);
      if (ex) return prev.map(o => o.id === item.id ? { ...o, qty: o.qty + 1 } : o);
      return [...prev, { ...item, qty: 1, modifiers: { spice: "medium", size: "regular", addons: [] } }];
    });
  }

  function adjustQty(id, delta) {
    setCurrentOrder(prev =>
      prev.map(o => o.id === id ? { ...o, qty: Math.max(0, o.qty + delta) } : o).filter(o => o.qty > 0)
    );
  }

  function removeItem(id) {
    setCurrentOrder(prev => prev.filter(o => o.id !== id));
  }

  function confirmOrder() {
    if (!currentOrder.length) return;
    const kotId = `KOT-${Date.now().toString().slice(-6)}`;
    const subtotal = currentOrder.reduce((s, o) => s + (o.price || 0) * o.qty, 0);
    const kot = {
      id: kotId, table: tableNum,
      items: currentOrder,
      time: new Date(), total: subtotal, status: "pending",
      json: JSON.stringify({
        kotId, table: tableNum,
        items: currentOrder.map(o => ({
          itemId: o.id, name: o.name, qty: o.qty,
          unitPrice: o.price || 0, total: (o.price || 0) * o.qty,
          modifiers: o.modifiers || {}
        })),
        subtotal, gst: Math.round(subtotal * 0.05),
        grandTotal: Math.round(subtotal * 1.05),
        createdAt: new Date().toISOString(),
      }, null, 2)
    };
    onKotCreated(kot);
    setOrderConfirmed(true);
    addLog("system", `✅ KOT created: ${kotId} · Sent to kitchen`);
  }

  const orderTotal = currentOrder.reduce((s, o) => s + (o.price || 0) * o.qty, 0);
  const logRoleColor = { customer: T.cyan, ai: T.green, system: T.muted, error: T.red, clarify: T.amber };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, minHeight: "calc(100vh - 210px)" }}>
      {/* LEFT COLUMN */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Controls */}
        <Card style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: T.muted, fontSize: 12 }}>Table</span>
              <select value={tableNum} onChange={e => setTableNum(e.target.value)} disabled={isCallActive}
                style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, padding: "6px 10px", borderRadius: 8, fontSize: 13, outline: "none" }}>
                {["T-1","T-2","T-3","T-4","T-5","T-6","T-7","T-8","Takeaway","Delivery"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={13} style={{ color: T.muted }} />
              <select value={language} onChange={e => setLanguage(e.target.value)} disabled={isCallActive}
                style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, padding: "6px 10px", borderRadius: 8, fontSize: 13, outline: "none" }}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
              </select>
            </div>
            <div style={{ marginLeft: "auto" }}>
              {!isCallActive ? (
                <button onClick={startCall} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: `linear-gradient(135deg,${T.green},#059669)`,
                  color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px",
                  fontWeight: 800, fontSize: 14, cursor: "pointer"
                }}>
                  <Phone size={15} /> Start Call
                </button>
              ) : (
                <button onClick={endCall} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: `linear-gradient(135deg,${T.red},#DC2626)`,
                  color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px",
                  fontWeight: 800, fontSize: 14, cursor: "pointer"
                }}>
                  <PhoneOff size={15} /> End Call
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Voice Interface */}
        {isCallActive && (
          <Card style={{ flex: 1 }}>
            {/* Mic */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 20px" }}>
              <div style={{ position: "relative", marginBottom: 12 }}>
                {isListening && [0, 1, 2].map(i => (
                  <div key={i} style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 80 + i * 28, height: 80 + i * 28,
                    borderRadius: "50%", border: `2px solid ${T.amber}`,
                    opacity: 0.25 - i * 0.06,
                    animation: `voicePulse ${1 + i * 0.35}s ease-in-out infinite`,
                  }} />
                ))}
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={!speechOK}
                  style={{
                    width: 78, height: 78, borderRadius: "50%", border: "none",
                    cursor: speechOK ? "pointer" : "not-allowed",
                    background: isListening
                      ? `radial-gradient(circle at 40% 40%,#FF6B6B,#DC2626)`
                      : `radial-gradient(circle at 40% 40%,${T.card2},${T.border})`,
                    color: isListening ? "#fff" : T.amber,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", zIndex: 1,
                    boxShadow: isListening ? `0 0 28px rgba(220,38,38,0.4)` : `0 4px 16px rgba(0,0,0,0.4)`,
                    transition: "all 0.2s",
                  }}>
                  {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
              </div>
              <div style={{ color: T.muted, fontSize: 12, textAlign: "center" }}>
                {!speechOK
                  ? "⚠️ Use Chrome or Edge browser for voice input"
                  : isListening
                    ? "🔴 Listening... speak your order"
                    : "Tap mic to start · Or type below"}
              </div>
            </div>

            {/* Transcript */}
            <div style={{ background: T.card2, borderRadius: 10, padding: 14, minHeight: 64, border: `1px solid ${T.border}`, marginBottom: 12 }}>
              <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>TRANSCRIPT</div>
              <div style={{ color: T.text, fontSize: 14, lineHeight: 1.6 }}>
                {transcript}
                {interim && <span style={{ color: T.muted }}> {interim}</span>}
                {!transcript && !interim && (
                  <span style={{ color: T.muted, fontStyle: "italic" }}>
                    Try: "2 Butter Chicken, 4 Naan, ek Mango Lassi"
                  </span>
                )}
              </div>
            </div>

            {/* Text input + send */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isProcessing && processOrder()}
                placeholder='Type order or use mic... e.g. "do butter chicken, char naan, mango lassi"'
                style={{
                  flex: 1, background: T.card2, border: `1px solid ${T.border}`, color: T.text,
                  padding: "10px 14px", borderRadius: 8, fontSize: 13, outline: "none"
                }}
              />
              <button onClick={processOrder}
                disabled={!transcript.trim() || isProcessing}
                style={{
                  background: T.amber, color: "#000", border: "none", borderRadius: 8,
                  padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer",
                  opacity: (!transcript.trim() || isProcessing) ? 0.4 : 1, minWidth: 90,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                {isProcessing
                  ? <RefreshCw size={15} style={{ animation: "spin 0.8s linear infinite" }} />
                  : <>Process <span>→</span></>}
              </button>
            </div>

            {/* AI Response */}
            {aiResult && (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ color: T.green, fontSize: 10, fontWeight: 800, letterSpacing: 0.8, marginBottom: 6 }}>
                  🤖 AI ASSISTANT · {aiResult.detectedLanguage} detected · {((aiResult.confidence || 0) * 100).toFixed(0)}% confidence
                </div>
                <div style={{ color: T.text, fontSize: 13, lineHeight: 1.65 }}>{aiResult.assistantResponse}</div>
                {aiResult.clarifications?.length > 0 && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(245,166,35,0.08)", borderRadius: 8 }}>
                    <div style={{ color: T.amber, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>⚠️ CLARIFICATIONS NEEDED</div>
                    {aiResult.clarifications.map((q, i) => <div key={i} style={{ color: T.text, fontSize: 12, marginLeft: 8 }}>• {q}</div>)}
                  </div>
                )}
              </div>
            )}

            {/* Smart Upsells */}
            {(upsells.combos.length > 0 || upsells.items.length > 0) && currentOrder.length > 0 && (
              <div style={{ background: "rgba(245,166,35,0.05)", border: "1px solid rgba(245,166,35,0.18)", borderRadius: 10, padding: 14 }}>
                <div style={{ color: T.amber, fontSize: 10, fontWeight: 800, letterSpacing: 0.8, marginBottom: 10 }}>
                  <Zap size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  SMART UPSELL RECOMMENDATIONS
                </div>
                {upsells.combos.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                    <div>
                      <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>
                        🎁 Combo: {c.items.map(i => i.name).join(" + ")}
                      </div>
                      <div style={{ color: T.muted, fontSize: 11 }}>Save ₹{c.savings} · Lift {c.lift}× co-purchase</div>
                    </div>
                    <button onClick={() => c.items.forEach(i => !currentOrder.find(o => o.id === i.id) && addItemManually(i))}
                      style={{ background: T.amber, color: "#000", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                      Add
                    </button>
                  </div>
                ))}
                {upsells.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                    <div>
                      <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{item.emoji} {item.name} — ₹{item.price}</div>
                      <div style={{ color: T.muted, fontSize: 11 }}>{item.marginPct.toFixed(0)}% margin · <ClassBadge cls={item.cls} /></div>
                    </div>
                    <button onClick={() => addItemManually(item)}
                      style={{ background: "none", color: T.amber, border: `1px solid ${T.amber}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Call Log */}
        <Card style={{ padding: 16 }}>
          <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>CALL LOG</div>
          <div style={{ maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
            {callLog.length === 0 && (
              <div style={{ color: T.muted, fontSize: 12, fontStyle: "italic" }}>Start a call to begin ordering.</div>
            )}
            {callLog.map((log, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: logRoleColor[log.role] || T.muted, fontSize: 9, fontWeight: 800, width: 60, flexShrink: 0, paddingTop: 2, textTransform: "uppercase" }}>
                  {log.role === "customer" ? "CUSTOMER" : log.role === "ai" ? "AI BOT" : log.role === "clarify" ? "CLARIFY" : log.role === "error" ? "ERROR" : "SYSTEM"}
                </span>
                <span style={{ color: log.role === "error" ? T.red : T.text, fontSize: 12, lineHeight: 1.5 }}>{log.text}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </Card>
      </div>

      {/* RIGHT COLUMN — ORDER CART */}
      <Card style={{ display: "flex", flexDirection: "column", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>
            <ShoppingCart size={14} style={{ color: T.amber, marginRight: 6, verticalAlign: "middle" }} />
            Order — {tableNum}
          </div>
          {currentOrder.length > 0 && (
            <button onClick={() => setCurrentOrder([])} style={{ background: "none", border: "none", color: T.red, fontSize: 11, cursor: "pointer" }}>
              Clear All
            </button>
          )}
        </div>

        {/* Order Items */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minHeight: 100 }}>
          {currentOrder.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.muted, gap: 8, padding: 24 }}>
              <ShoppingCart size={28} style={{ opacity: 0.25 }} />
              <span style={{ fontSize: 13 }}>Order is empty</span>
              <span style={{ fontSize: 11 }}>Use voice or text to add items</span>
            </div>
          ) : (
            currentOrder.map(order => (
              <div key={order.id} style={{ background: T.card2, borderRadius: 8, padding: 11, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 15 }}>{order.emoji || "🍽️"}</span>
                      <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{order.name}</span>
                    </div>
                    {order.modifiers?.spice && order.modifiers.spice !== "medium" && (
                      <div style={{ color: T.muted, fontSize: 10, marginLeft: 21, marginTop: 2 }}>
                        Spice: {order.modifiers.spice}
                        {order.modifiers.size && order.modifiers.size !== "regular" && ` · ${order.modifiers.size}`}
                      </div>
                    )}
                    <div style={{ color: T.amber, fontSize: 12, fontWeight: 800, marginLeft: 21, marginTop: 2 }}>
                      ₹{(order.price || 0) * order.qty}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <button onClick={() => adjustQty(order.id, -1)}
                      style={{ width: 22, height: 22, borderRadius: "50%", background: T.border, border: "none", color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Minus size={10} />
                    </button>
                    <span style={{ color: T.text, fontWeight: 800, fontSize: 14, minWidth: 20, textAlign: "center" }}>{order.qty}</span>
                    <button onClick={() => adjustQty(order.id, 1)}
                      style={{ width: 22, height: 22, borderRadius: "50%", background: T.border, border: "none", color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Plus size={10} />
                    </button>
                    <button onClick={() => removeItem(order.id)}
                      style={{ width: 22, height: 22, borderRadius: "50%", background: "none", border: "none", color: T.red, cursor: "pointer", marginLeft: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick-add high-margin items */}
        {isCallActive && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
            <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>QUICK ADD (HIGH-MARGIN)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 90, overflowY: "auto" }}>
              {menu.filter(i => i.cls === "Star" || i.cls === "Puzzle").map(i => (
                <button key={i.id} onClick={() => addItemManually(i)} style={{
                  background: T.card2, border: `1px solid ${T.border}`, color: T.text,
                  borderRadius: 6, padding: "3px 9px", fontSize: 10, cursor: "pointer"
                }}>
                  {i.emoji} {i.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Totals & Confirm */}
        {currentOrder.length > 0 && (
          <div style={{ marginTop: 14, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
            {[
              [`Items (${currentOrder.reduce((s, o) => s + o.qty, 0)})`, `₹${orderTotal}`, T.muted],
              ["GST @ 5%", `₹${Math.round(orderTotal * 0.05)}`, T.muted],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: c, fontSize: 12 }}>{l}</span>
                <span style={{ color: T.text, fontSize: 12 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingTop: 6, borderTop: `1px solid ${T.border}` }}>
              <span style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>Grand Total</span>
              <span style={{ color: T.amber, fontWeight: 900, fontSize: 17 }}>₹{Math.round(orderTotal * 1.05)}</span>
            </div>

            {!orderConfirmed ? (
              <button onClick={confirmOrder} style={{
                width: "100%", background: `linear-gradient(135deg,${T.amber},${T.amberD})`,
                color: "#000", border: "none", borderRadius: 10, padding: "13px",
                fontWeight: 900, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}>
                <ChefHat size={16} /> Confirm & Send to Kitchen
              </button>
            ) : (
              <div style={{ textAlign: "center", color: T.green, fontWeight: 800, fontSize: 14, padding: 10 }}>
                <CheckCircle size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                KOT Sent to Kitchen!
              </div>
            )}
          </div>
        )}
      </Card>

      <style>{`
        @keyframes voicePulse {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.25; }
          50%      { transform: translate(-50%,-50%) scale(1.08); opacity: 0.1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: KOT MANAGER
// ═══════════════════════════════════════════════════════════════════
function KOTManager({ kots, setKots }) {
  const [selected, setSelected] = useState(null);

  const STATUSES = ["pending", "preparing", "ready", "served"];
  const STATUS_COLORS = { pending: T.amber, preparing: T.blue, ready: T.green, served: T.muted };

  function advance(id) {
    setKots(prev => prev.map(k => {
      if (k.id !== id) return k;
      const idx = STATUSES.indexOf(k.status);
      return { ...k, status: STATUSES[Math.min(idx + 1, STATUSES.length - 1)] };
    }));
    setSelected(prev => prev?.id === id ? { ...prev, status: STATUSES[Math.min(STATUSES.indexOf(prev.status) + 1, STATUSES.length - 1)] } : prev);
  }

  function downloadJSON(kot) {
    const blob = new Blob([kot.json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${kot.id}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, minHeight: "calc(100vh - 210px)" }}>
      {/* KOT List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {kots.length === 0 ? (
          <Card style={{ textAlign: "center", color: T.muted, padding: 32 }}>
            <ChefHat size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
            <div style={{ fontSize: 13, marginBottom: 4 }}>No KOTs yet</div>
            <div style={{ fontSize: 11 }}>Create orders via Voice Copilot</div>
          </Card>
        ) : (
          kots.map(kot => (
            <div key={kot.id} onClick={() => setSelected(kot)} style={{
              background: selected?.id === kot.id ? T.card2 : T.card,
              border: `1px solid ${selected?.id === kot.id ? T.borderB : T.border}`,
              borderLeft: `3px solid ${STATUS_COLORS[kot.status] || T.muted}`,
              borderRadius: 10, padding: 14, cursor: "pointer", transition: "background 0.12s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>{kot.id}</div>
                  <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>
                    {kot.table} · {kot.items.length} item type{kot.items.length !== 1 ? "s" : ""} · ₹{kot.total}
                  </div>
                  <div style={{ color: T.muted, fontSize: 10, marginTop: 2 }}>
                    <Clock size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />
                    {new Date(kot.time).toLocaleTimeString("en-IN")}
                  </div>
                </div>
                <span style={{
                  background: `${STATUS_COLORS[kot.status]}18`, color: STATUS_COLORS[kot.status],
                  border: `1px solid ${STATUS_COLORS[kot.status]}33`,
                  borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase"
                }}>{kot.status}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* KOT Detail */}
      {!selected ? (
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.muted }}>
          <Package size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
          <div style={{ fontSize: 13 }}>Select a KOT to view details</div>
        </Card>
      ) : (
        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ color: T.text, fontWeight: 900, fontSize: 22, fontFamily: "'Fraunces',serif" }}>{selected.id}</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 3 }}>
                {selected.table} · {new Date(selected.time).toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {selected.status !== "served" && (
                <button onClick={() => advance(selected.id)} style={{
                  background: T.amber, color: "#000", border: "none", borderRadius: 8,
                  padding: "8px 18px", fontWeight: 800, fontSize: 12, cursor: "pointer"
                }}>
                  → Mark as {STATUSES[STATUSES.indexOf(selected.status) + 1] || "Done"}
                </button>
              )}
              <button onClick={() => downloadJSON(selected)} style={{
                background: T.card2, color: T.text, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "8px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6
              }}>
                <Download size={13} /> JSON
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ background: T.card2, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.25)" }}>
                  {["#", "Item", "Qty", "Unit Price", "Line Total", "Modifiers"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 14px", color: T.muted, fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 15 }}>{item.emoji || "🍽️"}</span>
                        <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: T.amber, fontSize: 13, fontWeight: 800 }}>{item.qty}</td>
                    <td style={{ padding: "10px 14px", color: T.text, fontSize: 13 }}>₹{item.price || 0}</td>
                    <td style={{ padding: "10px 14px", color: T.green, fontSize: 13, fontWeight: 700 }}>₹{(item.price || 0) * item.qty}</td>
                    <td style={{ padding: "10px 14px", color: T.muted, fontSize: 11 }}>
                      {item.modifiers?.spice && item.modifiers.spice !== "medium" && `Spice: ${item.modifiers.spice}`}
                      {item.modifiers?.size && item.modifiers.size !== "regular" && ` · Size: ${item.modifiers.size}`}
                      {(!item.modifiers?.spice || item.modifiers.spice === "medium") && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 24 }}>
              <span style={{ color: T.muted, fontSize: 12 }}>Subtotal: <strong style={{ color: T.text }}>₹{selected.total}</strong></span>
              <span style={{ color: T.muted, fontSize: 12 }}>GST (5%): <strong style={{ color: T.text }}>₹{Math.round(selected.total * 0.05)}</strong></span>
              <span style={{ color: T.amber, fontWeight: 900, fontSize: 15 }}>Grand Total: ₹{Math.round(selected.total * 1.05)}</span>
            </div>
          </div>

          {/* JSON Preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
              📄 STRUCTURED JSON OUTPUT — POS INTEGRATION PAYLOAD
            </div>
            <pre style={{
              background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: 16, overflowY: "auto", maxHeight: 260,
              color: T.green, fontSize: 11, lineHeight: 1.7,
              fontFamily: "'DM Mono','Courier New',monospace", margin: 0,
            }}>
              {selected.json}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CSV PARSER UTILITY
// ═══════════════════════════════════════════════════════════════════
function parseMenuCSV(text) {
  const lines  = text.trim().split(/\r?\n/);
  const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/['"]/g, ""));
  const idx = f => header.findIndex(h => h.includes(f));
  const iName  = idx("name");
  const iCat   = idx("cat");
  const iPrice = idx("price");
  const iCost  = [idx("cost"), idx("food"), idx("ingredient")].find(i => i >= 0) ?? -1;
  const iSales = [idx("sales"), idx("qty"), idx("sold"), idx("orders")].find(i => i >= 0) ?? -1;
  const iEmoji = idx("emoji");

  if (iName < 0 || iPrice < 0 || iCost < 0)
    throw new Error("CSV must have columns: name, category, price, cost (or food_cost), sales (optional)");

  const EMOJIS = ["🍛","🥘","🍚","🍗","🧀","🐟","🥗","🍲","🫓","☕","🥭","🍋","🧋","🍮","🍦","🍫","🌿","🍱","🥙","🍜"];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || lines[i].split(",");
    const clean = cols.map(c => (c || "").trim().replace(/^"|"$/g, ""));
    const name  = clean[iName];
    const price = parseFloat(clean[iPrice]);
    const cost  = parseFloat(clean[iCost]);
    if (!name || isNaN(price) || isNaN(cost)) continue;
    rows.push({
      id:    i,
      name,
      cat:   iCat   >= 0 ? (clean[iCat]   || "General") : "General",
      price,
      cost,
      sales: iSales >= 0 ? (parseInt(clean[iSales]) || 50) : 50,
      emoji: iEmoji >= 0 && clean[iEmoji] ? clean[iEmoji] : EMOJIS[(i - 1) % EMOJIS.length],
    });
  }
  if (rows.length === 0) throw new Error("No valid rows found. Check your CSV format.");
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
// TAB: MENU SETUP
// ═══════════════════════════════════════════════════════════════════
function MenuSetup({ onMenuLoaded }) {
  const [dragOver, setDragOver]   = useState(false);
  const [error, setError]         = useState("");
  const [preview, setPreview]     = useState(null);
  const [parsedRows, setParsedRows] = useState(null);
  const fileInputRef              = useRef(null);

  const CSV_TEMPLATE = `name,category,price,cost,sales,emoji
Butter Chicken,Mains,380,145,198,🍛
Dal Makhani,Mains,240,60,167,🥘
Paneer Tikka,Starters,280,95,145,🧀
Butter Naan,Breads,60,12,342,🫓
Mango Lassi,Beverages,120,28,189,🥭`;

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "menu_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function processFile(file) {
    setError(""); setPreview(null); setParsedRows(null);
    if (!file || !file.name.endsWith(".csv")) { setError("Please upload a .csv file."); return; }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const rows = parseMenuCSV(e.target.result);
        setParsedRows(rows);
        setPreview(rows.slice(0, 5));
      } catch (err) { setError(err.message); }
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "32px 0 8px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
        <div style={{ color: T.text, fontWeight: 900, fontSize: 28, fontFamily: "'Fraunces',serif", marginBottom: 8 }}>
          Load Your Menu
        </div>
        <div style={{ color: T.muted, fontSize: 14 }}>
          Use the built-in demo data or import your own restaurant menu from a CSV file
        </div>
      </div>

      {/* Two options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Default */}
        <Card style={{ border: `1px solid ${T.borderB}`, textAlign: "center", padding: 32 }}>
          <Database size={32} style={{ color: T.amber, marginBottom: 14 }} />
          <div style={{ color: T.text, fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Use Demo Menu</div>
          <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            22 pre-loaded Indian restaurant items across Starters, Mains, Breads, Beverages & Desserts with realistic sales data.
          </div>
          <button
            onClick={() => onMenuLoaded(RAW_MENU, "default")}
            style={{
              background: `linear-gradient(135deg,${T.amber},${T.amberD})`,
              color: "#000", border: "none", borderRadius: 10,
              padding: "11px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
            <CheckCircle size={15} /> Load Demo Data
          </button>
        </Card>

        {/* CSV Import */}
        <Card style={{ border: `1px solid ${T.borderB}`, padding: 32, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <Upload size={32} style={{ color: T.cyan, marginBottom: 14 }} />
            <div style={{ color: T.text, fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Import CSV</div>
            <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6 }}>
              Upload your own menu with name, category, price, cost and optional sales data.
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? T.cyan : T.borderB}`,
              borderRadius: 10, padding: "20px 16px", textAlign: "center",
              cursor: "pointer", background: dragOver ? "rgba(34,211,238,0.04)" : T.card2,
              transition: "all 0.15s", marginBottom: 10,
            }}>
            <FileText size={22} style={{ color: T.muted, marginBottom: 6 }} />
            <div style={{ color: T.muted, fontSize: 12 }}>
              {parsedRows ? `✅ ${parsedRows.length} items loaded` : "Drag & drop CSV or click to browse"}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }}
              onChange={e => processFile(e.target.files[0])} />
          </div>

          {error && (
            <div style={{ color: T.red, fontSize: 12, background: "rgba(248,113,113,0.08)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
              ⚠ {error}
            </div>
          )}

          <button onClick={downloadTemplate} style={{
            background: "none", border: `1px solid ${T.border}`, color: T.muted,
            borderRadius: 8, padding: "7px 14px", fontSize: 11, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 10,
          }}>
            <Download size={12} /> Download CSV Template
          </button>

          {parsedRows && (
            <button onClick={() => onMenuLoaded(parsedRows, "csv")} style={{
              background: `linear-gradient(135deg,${T.cyan},#0EA5E9)`,
              color: "#000", border: "none", borderRadius: 10,
              padding: "11px", fontWeight: 800, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Upload size={15} /> Import {parsedRows.length} Items
            </button>
          )}
        </Card>
      </div>

      {/* Preview Table */}
      {preview && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: 700, fontSize: 13 }}>
            Preview — first 5 rows
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.card2 }}>
                {["#","Name","Category","Price","Cost","Sales/mo","Emoji"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ padding: "9px 14px", color: T.muted, fontSize: 12 }}>{r.id}</td>
                  <td style={{ padding: "9px 14px", color: T.text, fontSize: 13, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: "9px 14px", color: T.muted, fontSize: 12 }}>{r.cat}</td>
                  <td style={{ padding: "9px 14px", color: T.green, fontSize: 13, fontWeight: 700 }}>₹{r.price}</td>
                  <td style={{ padding: "9px 14px", color: T.muted, fontSize: 12 }}>₹{r.cost}</td>
                  <td style={{ padding: "9px 14px", color: T.text, fontSize: 12 }}>{r.sales}</td>
                  <td style={{ padding: "9px 14px", fontSize: 18 }}>{r.emoji}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsedRows && parsedRows.length > 5 && (
            <div style={{ padding: "10px 18px", color: T.muted, fontSize: 11, borderTop: `1px solid ${T.border}` }}>
              + {parsedRows.length - 5} more rows
            </div>
          )}
        </Card>
      )}

      {/* CSV Format guide */}
      <Card style={{ padding: 16 }}>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
          📋 CSV Format Guide
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            ["name", "Required", "Item name e.g. Butter Chicken"],
            ["category", "Required", "e.g. Mains, Starters, Beverages"],
            ["price", "Required", "Selling price in ₹"],
            ["cost / food_cost", "Required", "Food/ingredient cost in ₹"],
            ["sales", "Optional", "Monthly orders (default: 50)"],
            ["emoji", "Optional", "Emoji icon for the item"],
          ].map(([col, req, desc]) => (
            <div key={col} style={{ background: T.card2, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <code style={{ color: T.amber, fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{col}</code>
                <span style={{ color: req === "Required" ? T.red : T.muted, fontSize: 9, fontWeight: 700 }}>{req}</span>
              </div>
              <div style={{ color: T.muted, fontSize: 11 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function PetpoojaApp() {
  const [tab, setTab]           = useState("setup");
  const [menu, setMenu]         = useState([]);
  const [combos, setCombos]     = useState([]);
  const [kots, setKots]         = useState([]);
  const [newKots, setNewKots]   = useState(0);
  const [menuSource, setMenuSource] = useState(null); // "default" | "csv"

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700;9..144,900&family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; }
      body { margin: 0; background: ${T.bg}; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: ${T.border}; }
      ::-webkit-scrollbar-thumb { background: ${T.borderB}; border-radius: 10px; }
      select option { background: ${T.card2}; }
    `;
    document.head.appendChild(style);
  }, []);

  function handleMenuLoaded(rawRows, source) {
    const enriched = enrichMenu(rawRows);
    setMenu(enriched);
    setCombos(buildCombos(enriched, ASSOC_RULES));
    setMenuSource(source);
    setTab("dashboard");
  }

  function handleKotCreated(kot) {
    setKots(prev => [kot, ...prev]);
    setNewKots(prev => prev + 1);
  }

  function handleTabChange(t) {
    setTab(t);
    if (t === "kots") setNewKots(0);
  }

  const TABS = [
    { id: "setup",     label: "Menu Setup",       icon: <Database size={14} /> },
    { id: "dashboard", label: "Revenue Dashboard", icon: <BarChart2 size={14} /> },
    { id: "menu",      label: "Menu Analysis",     icon: <Utensils size={14} /> },
    { id: "voice",     label: "Voice Copilot",     icon: <Mic size={14} /> },
    { id: "kots",      label: "KOT Manager",       icon: <ChefHat size={14} />, badge: newKots },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28, paddingTop: 14, paddingBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 4, flexShrink: 0 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `linear-gradient(135deg,${T.amber},${T.amberD})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                boxShadow: `0 4px 14px rgba(245,166,35,0.35)`
              }}>🍽️</div>
              <div>
                <div style={{ color: T.text, fontWeight: 900, fontSize: 17, fontFamily: "'Fraunces',serif", lineHeight: 1 }}>Petpooja</div>
                <div style={{ color: T.muted, fontSize: 8.5, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase" }}>AI Revenue Copilot</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 2 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => handleTabChange(t.id)}
                  disabled={t.id !== "setup" && !menuSource}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "9px 18px", background: "none", border: "none",
                    borderBottom: tab === t.id ? `2px solid ${T.amber}` : "2px solid transparent",
                    color: tab === t.id ? T.amber : (t.id !== "setup" && !menuSource) ? `${T.muted}55` : T.muted,
                    fontWeight: tab === t.id ? 700 : 500, fontSize: 13,
                    cursor: (t.id !== "setup" && !menuSource) ? "not-allowed" : "pointer",
                    position: "relative", marginBottom: -1, transition: "all 0.15s",
                    fontFamily: "'Outfit',sans-serif",
                  }}>
                  {t.icon} {t.label}
                  {t.badge > 0 && (
                    <span style={{
                      background: T.red, color: "#fff", borderRadius: "50%",
                      width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900, position: "absolute", top: 5, right: 5
                    }}>{t.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: menuSource ? T.green : T.amber, boxShadow: `0 0 8px ${menuSource ? T.green : T.amber}` }} />
                <span style={{ color: T.muted, fontSize: 11 }}>{menuSource ? "PoS Live" : "Setup Required"}</span>
              </div>
              {menuSource && (
                <>
                  <div style={{ color: T.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                    <Clock size={11} />
                    {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div style={{ color: T.muted, fontSize: 11 }}>
                    {menu.length} Items · {kots.length} KOTs
                  </div>
                  <button onClick={() => { setTab("setup"); setMenuSource(null); setMenu([]); setCombos([]); setKots([]); }}
                    style={{ background: "none", border: `1px solid ${T.border}`, color: T.muted, borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                    ⟳ Change Menu
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 28px" }}>
        {tab === "setup" && <MenuSetup onMenuLoaded={handleMenuLoaded} />}
        {tab !== "setup" && (
          <>
            {tab === "dashboard" && <Dashboard menu={menu} combos={combos} />}
            {tab === "menu"      && <MenuAnalysis menu={menu} />}
            {tab === "voice"     && <VoiceCopilot menu={menu} combos={combos} onKotCreated={handleKotCreated} />}
            {tab === "kots"      && <KOTManager kots={kots} setKots={setKots} />}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}