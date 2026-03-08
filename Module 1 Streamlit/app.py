import json
from itertools import combinations
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st
import numpy as np
from sklearn.linear_model import LinearRegression

APP_DIR = Path(__file__).resolve().parent
MENU_CSV = APP_DIR / "menu_master.csv"
SALES_CSV = APP_DIR / "sales_data.csv"
CUSTOMERS_CSV = APP_DIR / "customers.csv"
UPSELL_JSON = APP_DIR / "upsell_config.json"


st.set_page_config(
    page_title="Petpooja Track | Owner Intelligence",
    page_icon="📈",
    layout="wide",
)

st.markdown("""
<style>

.block-container {
    padding-top: 1.5rem;
}

div[data-testid="metric-container"] {
    background-color: #111827;
    padding: 15px;
    border-radius: 10px;
    color: white;
}

div[data-testid="stSidebar"] {
    background-color: #f9fafb;
}

h1, h2, h3 {
    font-weight: 600;
}

</style>
""", unsafe_allow_html=True)

st.markdown("""
# 📊 Owner Intelligence Dashboard
### AI‑Powered Restaurant Intelligence for Owners

Analyze revenue, optimize menu pricing, discover upsell opportunities,
and understand customer behaviour using data.
""")

st.info(
"""
👋 **Welcome!**

Upload your restaurant POS data and this dashboard will help you:

• Identify high‑profit menu items  
• Discover upsell opportunities  
• Analyze customer retention  
• Build smart combo offers  
• Forecast demand with ML
"""
)

st.divider()

# Use Streamlit's native theme (Settings → Theme). Match Plotly to it.
_theme_base = (st.get_option("theme.base") or "light").lower()
plotly_template = "plotly_dark" if _theme_base == "dark" else "plotly"


def _safe_div(n: float, d: float) -> float:
    return float(n) / float(d) if float(d) != 0 else 0.0


@st.cache_data(show_spinner=False)
def load_data(menu_file: str | None = None, sales_file: str | None = None):
    menu_path = menu_file or str(MENU_CSV)
    sales_path = sales_file or str(SALES_CSV)

    menu_df = pd.read_csv(menu_path)
    sales_df = pd.read_csv(sales_path)
    customers_df = pd.read_csv(CUSTOMERS_CSV) if CUSTOMERS_CSV.exists() else pd.DataFrame()

    # Normalize types
    if "timestamp" in sales_df.columns:
        sales_df["timestamp"] = pd.to_datetime(sales_df["timestamp"], errors="coerce")

    for col in ["selling_price", "food_cost"]:
        if col in menu_df.columns:
            menu_df[col] = pd.to_numeric(menu_df[col], errors="coerce")

    if "quantity" in sales_df.columns:
        sales_df["quantity"] = pd.to_numeric(sales_df["quantity"], errors="coerce").fillna(0).astype(int)

    if "item_id" in menu_df.columns:
        menu_df["item_id"] = pd.to_numeric(menu_df["item_id"], errors="coerce").astype("Int64")
    if "item_id" in sales_df.columns:
        sales_df["item_id"] = pd.to_numeric(sales_df["item_id"], errors="coerce").astype("Int64")

    # Backfill customer_id if dataset doesn't have it
    if "customer_id" not in sales_df.columns:
        sales_df["customer_id"] = "CUST0000"

    if "channel" not in sales_df.columns:
        sales_df["channel"] = "Unknown"

    if "locality" not in sales_df.columns:
        sales_df["locality"] = "Unknown"

    if "payment_method" not in sales_df.columns:
        sales_df["payment_method"] = "Unknown"

    if "discount_pct" not in sales_df.columns:
        sales_df["discount_pct"] = 0.0

    sales_df["discount_pct"] = pd.to_numeric(sales_df["discount_pct"], errors="coerce").fillna(0.0)

    return menu_df, sales_df, customers_df


def build_menu_engineering(menu: pd.DataFrame, sales: pd.DataFrame) -> pd.DataFrame:
    menu = menu.copy()
    sales = sales.copy()

    menu["margin"] = menu["selling_price"] - menu["food_cost"]
    menu["margin_pct"] = menu.apply(
        lambda r: _safe_div(r["margin"], r["selling_price"]) * 100 if pd.notna(r["selling_price"]) else 0.0,
        axis=1,
    )

    popularity = sales.groupby("item_id", dropna=False)["quantity"].sum().reset_index()
    df = pd.merge(menu, popularity, on="item_id", how="left").fillna({"quantity": 0})

    margin_mid = float(df["margin"].median()) if len(df) else 0.0
    volume_mid = float(df["quantity"].median()) if len(df) else 0.0

    def classify(row):
        if row["margin"] >= margin_mid and row["quantity"] >= volume_mid:
            return "Star"
        if row["margin"] < margin_mid and row["quantity"] >= volume_mid:
            return "Plow Horse"
        if row["margin"] >= margin_mid and row["quantity"] < volume_mid:
            return "Puzzle"
        return "Dog"

    df["matrix_category"] = df.apply(classify, axis=1)
    df["margin_mid"] = margin_mid
    df["volume_mid"] = volume_mid
    return df


def find_underperforming_skus(matrix: pd.DataFrame) -> pd.DataFrame:
    """
    Heuristic: SKUs that are either low-margin or loss-making and sell enough volume
    to noticeably drag profitability.
    """
    if matrix.empty:
        return matrix

    vol_mid = float(matrix["quantity"].median())
    low_margin = matrix["margin_pct"] < 30
    enough_volume = matrix["quantity"] >= max(1, vol_mid / 2)
    is_dog_or_plow = matrix["matrix_category"].isin(["Dog", "Plow Horse"])

    skus = matrix[low_margin & enough_volume & is_dog_or_plow].copy()
    skus["profit_impact"] = skus["margin"] * skus["quantity"]
    return skus.sort_values("profit_impact")


def build_combo_suggestions(sales_enriched: pd.DataFrame, top_n: int = 15) -> pd.DataFrame:
    """
    Find intelligent combos by looking at items frequently bought together.
    """
    if sales_enriched.empty:
        return pd.DataFrame()

    pair_stats: dict[tuple[int, int], dict] = {}

    for _, order in sales_enriched.groupby("order_id"):
        items = (
            order[["item_id", "item_name", "selling_price", "margin"]]
            .dropna(subset=["item_id"])
            .drop_duplicates("item_id")
        )
        ids = items["item_id"].astype(int).tolist()
        if len(ids) < 2:
            continue

        name_map = dict(zip(items["item_id"], items["item_name"]))
        price_map = dict(zip(items["item_id"], items["selling_price"]))
        margin_map = dict(zip(items["item_id"], items["margin"]))

        for i, j in combinations(sorted(ids), 2):
            key = (i, j)
            if key not in pair_stats:
                pair_stats[key] = {
                    "pair_orders": 0,
                    "total_revenue": 0.0,
                    "total_margin": 0.0,
                    "item1": name_map.get(i, str(i)),
                    "item2": name_map.get(j, str(j)),
                    "price1": float(price_map.get(i, 0.0)),
                    "price2": float(price_map.get(j, 0.0)),
                    "margin1": float(margin_map.get(i, 0.0)),
                    "margin2": float(margin_map.get(j, 0.0)),
                }
            pair_stats[key]["pair_orders"] += 1
            pair_stats[key]["total_revenue"] += float(price_map.get(i, 0.0) + price_map.get(j, 0.0))
            pair_stats[key]["total_margin"] += float(margin_map.get(i, 0.0) + margin_map.get(j, 0.0))

    if not pair_stats:
        return pd.DataFrame()

    records = []
    for (i, j), s in pair_stats.items():
        base_price = s["price1"] + s["price2"]
        base_margin = s["margin1"] + s["margin2"]
        combo_price = round(base_price * 0.9)  # 10% discount
        combo_margin = combo_price - (base_price - base_margin)

        records.append(
            {
                "item1_id": i,
                "item2_id": j,
                "item1_name": s["item1"],
                "item2_name": s["item2"],
                "pair_orders": s["pair_orders"],
                "avg_revenue_per_order": s["total_revenue"] / s["pair_orders"],
                "avg_margin_per_order": s["total_margin"] / s["pair_orders"],
                "recommended_combo_price": combo_price,
                "estimated_combo_margin": combo_margin,
                "owner_note": "Frequently bought together; offer ~10% cheaper combo to lift AOV.",
            }
        )

    df = pd.DataFrame(records)
    return df.sort_values(["pair_orders", "avg_margin_per_order"], ascending=[False, False]).head(top_n)


def build_order_facts(sales: pd.DataFrame, menu: pd.DataFrame) -> pd.DataFrame:
    m = menu[["item_id", "item_name", "category", "selling_price", "food_cost"]].copy()
    m["margin"] = m["selling_price"] - m["food_cost"]

    s = sales.merge(m, on="item_id", how="left")
    s["line_revenue"] = (s["selling_price"].fillna(0) * s["quantity"]).astype(float)
    s["line_profit"] = (s["margin"].fillna(0) * s["quantity"]).astype(float)
    s["line_discount"] = s["line_revenue"] * (s["discount_pct"].fillna(0) / 100.0)
    s["net_revenue"] = s["line_revenue"] - s["line_discount"]

    order_facts = (
        s.groupby("order_id", dropna=False)
        .agg(
            order_ts=("timestamp", "min"),
            customer_id=("customer_id", "first"),
            channel=("channel", "first"),
            payment_method=("payment_method", "first"),
            locality=("locality", "first"),
            items=("item_id", "nunique"),
            qty=("quantity", "sum"),
            revenue=("net_revenue", "sum"),
            gross_profit=("line_profit", "sum"),
            discount_value=("line_discount", "sum"),
        )
        .reset_index()
    )
    order_facts["margin_pct"] = order_facts.apply(lambda r: _safe_div(r["gross_profit"], r["revenue"]) * 100, axis=1)
    return order_facts, s


def add_rfm_segments(customer_facts: pd.DataFrame, as_of: pd.Timestamp) -> pd.DataFrame:
    df = customer_facts.copy()
    df["recency_days"] = (as_of - df["last_order_ts"]).dt.days.clip(lower=0)

    def _score(series: pd.Series, higher_is_better: bool) -> pd.Series:
        if len(series) < 4 or series.nunique(dropna=True) < 2:
            return pd.Series([2] * len(series), index=series.index, dtype=int)
        labels = [1, 2, 3, 4] if higher_is_better else [4, 3, 2, 1]
        try:
            out = pd.qcut(series.rank(method="first"), 4, labels=labels, duplicates="drop")
            return out.astype(int)
        except Exception:
            return pd.Series([2] * len(series), index=series.index, dtype=int)

    # Scores 1..4, where 4 is best
    df["r_score"] = _score(df["recency_days"], higher_is_better=False)
    df["f_score"] = _score(df["orders"], higher_is_better=True)
    df["m_score"] = _score(df["spend"], higher_is_better=True)

    def segment(r, f, m):
        if r >= 3 and f >= 3 and m >= 3:
            return "Champions"
        if r >= 3 and f >= 3:
            return "Loyal"
        if r >= 3 and f <= 2:
            return "New / Promising"
        if r == 2 and f >= 3:
            return "Needs Attention"
        if r <= 2 and f >= 3:
            return "At Risk"
        return "Hibernating"

    df["segment"] = df.apply(lambda x: segment(x["r_score"], x["f_score"], x["m_score"]), axis=1)
    return df

with st.sidebar:

    st.title("⚙️ Dashboard Controls")

    st.markdown("### 📂 Data Upload")

    uploaded_menu = st.file_uploader(
        "Upload Menu CSV",
        type=["csv","xlsx","xls"],
        key="menu_upload"
    )

    uploaded_sales = st.file_uploader(
        "Upload Sales CSV",
        type=["csv","xlsx","xls"],
        key="sales_upload"
    )

    st.divider()


    st.caption("If you upload files, the dashboard will use them instead of the sample data.")

menu_file_override = None
sales_file_override = None
if uploaded_menu is not None:
    menu_file_override = uploaded_menu
if uploaded_sales is not None:
    sales_file_override = uploaded_sales

try:
    menu, sales, customers = load_data(
        menu_file=menu_file_override,
        sales_file=sales_file_override,
    )
except FileNotFoundError:
    st.error("Missing files. Please ensure `menu_master.csv` and `sales_data.csv` exist in this folder or upload them.")
    st.stop()

if sales.empty or menu.empty:
    st.warning("Your data files are empty (after applying uploads).")
    st.stop()

min_dt = sales["timestamp"].min()
max_dt = sales["timestamp"].max()
if pd.isna(min_dt) or pd.isna(max_dt):
    st.error("Could not parse `timestamp` in your sales data. Please keep format like `2026-03-01 19:00`.")
    st.stop()

with st.sidebar:
    st.divider()
    st.subheader("🔎Data Filters ")
    date_range = st.date_input(
        "Date range",
        value=(min_dt.date(), max_dt.date()),
        min_value=min_dt.date(),
        max_value=max_dt.date(),
    )

    channels = sorted([c for c in sales["channel"].dropna().unique().tolist()])
    channel_sel = st.multiselect("Channel", channels, default=channels)

    categories = sorted([c for c in menu["category"].dropna().unique().tolist()])
    category_sel = st.multiselect("Menu category", categories, default=categories)

    st.divider()
    st.subheader("Owner tools")
    st.caption("This app will keep updating `upsell_config.json` based on the latest filters.")

if isinstance(date_range, tuple):
    start_date, end_date = date_range
else:
    start_date, end_date = date_range, date_range

sales_f = sales[
    (sales["timestamp"].dt.date >= start_date)
    & (sales["timestamp"].dt.date <= end_date)
    & (sales["channel"].isin(channel_sel))
].copy()
menu_f = menu[menu["category"].isin(category_sel)].copy()
sales_f = sales_f[sales_f["item_id"].isin(menu_f["item_id"])].copy()

order_facts, sales_enriched = build_order_facts(sales_f, menu_f)

# Customer facts
customer_facts = (
    order_facts.groupby("customer_id", dropna=False)
    .agg(
        orders=("order_id", "nunique"),
        spend=("revenue", "sum"),
        profit=("gross_profit", "sum"),
        avg_order_value=("revenue", "mean"),
        last_order_ts=("order_ts", "max"),
        primary_channel=("channel", lambda x: x.value_counts().index[0] if len(x) else "Unknown"),
        locality=("locality", lambda x: x.value_counts().index[0] if len(x) else "Unknown"),
    )
    .reset_index()
)
customer_facts["profit_pct"] = customer_facts.apply(lambda r: _safe_div(r["profit"], r["spend"]) * 100, axis=1)
customer_facts = add_rfm_segments(customer_facts, as_of=max_dt)

if not customers.empty and "customer_id" in customers.columns:
    customer_facts = customer_facts.merge(customers, on="customer_id", how="left", suffixes=("", "_cust"))

# KPIs
total_revenue = float(order_facts["revenue"].sum())
total_profit = float(order_facts["gross_profit"].sum())
total_orders = int(order_facts["order_id"].nunique())
unique_customers = int(order_facts["customer_id"].nunique())
repeat_rate = _safe_div((customer_facts["orders"] >= 2).sum(), len(customer_facts)) * 100 if len(customer_facts) else 0.0

top_item_row = (
    sales_enriched.groupby("item_name", dropna=False)["quantity"].sum().sort_values(ascending=False).head(1)
)
top_item = str(top_item_row.index[0]) if len(top_item_row) else "—"

k1, k2, k3, k4, k5 = st.columns(5)

k1.metric("💰 Net Revenue", f"₹{total_revenue:,.0f}")
k2.metric("📈 Gross Profit", f"₹{total_profit:,.0f}")
k3.metric("🧾 Orders", f"{total_orders:,}")
k4.metric("👥 Customers", f"{unique_customers:,}")
k5.metric("🔁 Repeat Rate", f"{repeat_rate:.1f}%")

tabs = st.tabs([
"📊 Overview",
"🍽 Menu Engineering",
"👥 Customers",
"📅 Cohort Retention",
"💡 Upsell Engine",
"🥗 Smart Combos",
"💰 Price Simulator",
"🤖 ML Demand Forecast",
"🧠 Menu Optimizer",
"🏷 Smart Discount Engine"
])

with tabs[0]:
    st.subheader("📊 Business Overview")

    trend = (
        order_facts.assign(day=order_facts["order_ts"].dt.date)
        .groupby("day", dropna=False)["revenue"]
        .sum()
        .reset_index()
    )
    fig = px.line(trend, x="day", y="revenue", markers=True, title="Revenue trend", template=plotly_template)
    st.plotly_chart(fig, use_container_width=True)

    colA, colB = st.columns(2)
    with colA:
        ch = order_facts.groupby("channel", dropna=False)["revenue"].sum().reset_index().sort_values("revenue", ascending=False)
        fig = px.pie(ch, names="channel", values="revenue", title="Revenue by channel", template=plotly_template)
        st.plotly_chart(fig, use_container_width=True)
    with colB:
        cat = (
            sales_enriched.groupby("category", dropna=False)["net_revenue"]
            .sum()
            .reset_index()
            .sort_values("net_revenue", ascending=False)
        )
        fig = px.bar(cat, x="category", y="net_revenue", title="Net revenue by menu category", template=plotly_template)
        st.plotly_chart(fig, use_container_width=True)

    st.divider()
    st.subheader("Top customers (by spend)")
    top_cust = customer_facts.sort_values("spend", ascending=False).head(10)
    show_cols = [c for c in ["customer_id", "customer_name", "locality", "segment", "orders", "spend", "avg_order_value", "recency_days"] if c in top_cust.columns]
    display_df = top_cust[show_cols].rename(columns={
    "customer_id": "Customer ID",
    "customer_name": "Customer Name",
    "locality": "Location",
    "segment": "Customer Segment",
    "orders": "Total Orders",
    "spend": "Total Spend (₹)",
    "avg_order_value": "Average Order Value (₹)",
    "recency_days": "Days Since Last Order"
})

st.dataframe(display_df, use_container_width=True, hide_index=True)

with tabs[1]:
    st.subheader("🍽 Menu Engineering Matrix")
    matrix = build_menu_engineering(menu_f, sales_f)

    margin_mid = float(matrix["margin_mid"].iloc[0]) if len(matrix) else 0.0
    volume_mid = float(matrix["volume_mid"].iloc[0]) if len(matrix) else 0.0

    fig = px.scatter(
        matrix,
        x="quantity",
        y="margin",
        text="item_name",
        color="matrix_category",
        size="selling_price",
        hover_data=["category", "margin_pct"],
        labels={"quantity": "Sales volume", "margin": "Profit margin (₹)"},
        title="Profit vs popularity",
        template=plotly_template,
    )
    fig.add_hline(y=margin_mid, line_dash="dot", annotation_text="Profit threshold")
    fig.add_vline(x=volume_mid, line_dash="dot", annotation_text="Popularity threshold")
    st.plotly_chart(fig, use_container_width=True)

    st.divider()
    st.subheader("Action table")
    action_map = {
        "Star": "Keep prominent, maintain quality, push combos",
        "Plow Horse": "Improve margin (portion/cost), bundle smartly",
        "Puzzle": "Upsell + reposition (menu placement, staff script)",
        "Dog": "Consider replacing or reworking",
    }
    matrix["recommended_action"] = matrix["matrix_category"].map(action_map)
    display_matrix = matrix.sort_values(["matrix_category", "margin"], ascending=[True, False])[[
        "item_id",
        "item_name",
        "category",
        "selling_price",
        "food_cost",
        "margin",
        "margin_pct",
        "quantity",
        "matrix_category",
        "recommended_action"
]].copy()

    display_matrix.columns = [
        "Item ID",
        "Menu Item",
        "Category",
        "Selling Price (₹)",
        "Food Cost (₹)",
        "Profit per Item (₹)",
        "Profit Margin %",
        "Units Sold",
        "Menu Category",
        "Recommended Action"
]

    st.dataframe(display_matrix, use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Summary by category")
    col_me1, col_me2, col_me3, col_me4 = st.columns(4)
    for col, label in zip(
        [col_me1, col_me2, col_me3, col_me4],
        ["Star", "Plow Horse", "Puzzle", "Dog"],
    ):
        count = (matrix["matrix_category"] == label).sum()
        col.metric(label, f"{count}")

with tabs[2]:
    st.subheader("👥 Customer Insights")

    segs = sorted(customer_facts["segment"].dropna().unique().tolist())
    seg_sel = st.multiselect("Segments", segs, default=segs)
    cust_table = customer_facts[customer_facts["segment"].isin(seg_sel)].copy()

    left, right = st.columns([1, 2])
    with left:
        st.caption("Pick a customer to see preferences.")
        cust_table_disp = cust_table.sort_values(["segment", "spend"], ascending=[True, False])
        label_col = "customer_name" if "customer_name" in cust_table_disp.columns else "customer_id"
        options = cust_table_disp["customer_id"].tolist()
        labels = dict(zip(cust_table_disp["customer_id"].tolist(), cust_table_disp[label_col].fillna("").tolist()))
        selected = st.selectbox("Customer", options, format_func=lambda cid: f"{cid} — {labels.get(cid, '')}".rstrip(" — "))

        st.divider()
    customer_display = cust_table_disp[[
        c for c in [
            "customer_id",
            "customer_name",
            "segment",
            "orders",
            "spend",
            "avg_order_value",
            "recency_days",
            "primary_channel",
            "locality"
        ] if c in cust_table_disp.columns
    ]].head(25).copy()

    rename_map = {
        "customer_id": "Customer ID",
        "customer_name": "Customer Name",
        "segment": "Segment",
        "orders": "Total Orders",
        "spend": "Total Spend (₹)",
        "avg_order_value": "Average Order Value (₹)",
        "recency_days": "Days Since Last Order",
        "primary_channel": "Primary Channel",
        "locality": "Location"
    }

    customer_display = customer_display.rename(columns=rename_map)

    st.dataframe(customer_display, use_container_width=True, hide_index=True)

    st.dataframe(customer_display, use_container_width=True, hide_index=True)

    with right:
        if selected:
            st.markdown("#### Customer snapshot")
            row = cust_table_disp[cust_table_disp["customer_id"] == selected].iloc[0]
            a, b, c, d = st.columns(4)
            a.metric("Segment", str(row["segment"]))
            b.metric("Orders", f"{int(row['orders'])}")
            c.metric("Spend", f"₹{float(row['spend']):,.0f}")
            d.metric("Recency", f"{int(row['recency_days'])} days")

            cust_orders = order_facts[order_facts["customer_id"] == selected].copy().sort_values("order_ts")
            fig = px.line(
                cust_orders.assign(day=cust_orders["order_ts"].dt.date).groupby("day")["revenue"].sum().reset_index(),
                x="day",
                y="revenue",
                markers=True,
                title="Spend over time",
                template=plotly_template,
            )
            st.plotly_chart(fig, use_container_width=True)

            cust_items = (
                sales_enriched[sales_enriched["customer_id"] == selected]
                .groupby(["item_name", "category"], dropna=False)["quantity"]
                .sum()
                .reset_index()
                .sort_values("quantity", ascending=False)
                .head(10)
            )
            fig = px.bar(cust_items, x="quantity", y="item_name", color="category", orientation="h", title="Top items for this customer", template=plotly_template)
            fig.update_layout(yaxis={"categoryorder": "total ascending"})
            st.plotly_chart(fig, use_container_width=True)

with tabs[3]:
    st.subheader("📅 Cohort Retention Analysis")

    oc = order_facts.dropna(subset=["order_ts"]).copy()
    oc["order_month"] = oc["order_ts"].dt.to_period("M").dt.to_timestamp()
    first_month = oc.groupby("customer_id")["order_month"].min().reset_index().rename(columns={"order_month": "cohort"})
    oc = oc.merge(first_month, on="customer_id", how="left")
    cohort_counts = (
        oc.groupby(["cohort", "order_month"])["customer_id"]
        .nunique()
        .reset_index(name="customers")
        .sort_values(["cohort", "order_month"])
    )
    cohort_sizes = cohort_counts[cohort_counts["cohort"] == cohort_counts["order_month"]][["cohort", "customers"]].rename(columns={"customers": "cohort_size"})
    cohort_counts = cohort_counts.merge(cohort_sizes, on="cohort", how="left")
    cohort_counts["retention_pct"] = cohort_counts.apply(lambda r: _safe_div(r["customers"], r["cohort_size"]) * 100, axis=1)

    if len(cohort_counts) < 2:
        st.info("Not enough time range for cohorts yet. Add more dates in `sales_data.csv` to see retention.")
    else:
        pivot = cohort_counts.pivot(index="cohort", columns="order_month", values="retention_pct").fillna(0.0)
        fig = px.imshow(
            pivot,
            text_auto=".0f",
            aspect="auto",
            labels=dict(x="Order month", y="Cohort", color="Retention %"),
            title="Customer retention heatmap",
            color_continuous_scale="Blues",
            template=plotly_template,
        )
        st.plotly_chart(fig, use_container_width=True)

with tabs[4]:
    st.subheader("💡 Upsell Opportunities")

    matrix = build_menu_engineering(menu_f, sales_f)
    puzzles = matrix[matrix["matrix_category"] == "Puzzle"].copy().sort_values("margin", ascending=False)

    if puzzles.empty:
        st.info("No Puzzle items in the current filters. Try a wider date range or categories.")
        st.stop()

    st.caption("These items make good profit but are not selling enough. Target them to the right customers.")
    upsell_display = puzzles[[
        "item_id",
        "item_name",
        "category",
        "selling_price",
        "food_cost",
        "margin",
        "margin_pct",
        "quantity"
]].head(20).copy()

    upsell_display.columns = [
        "Item ID",
        "Menu Item",
        "Category",
        "Selling Price (₹)",
        "Food Cost (₹)",
        "Profit per Item (₹)",
        "Profit Margin %",
        "Units Sold"
]

    st.dataframe(upsell_display, use_container_width=True, hide_index=True)

    segs = sorted(customer_facts["segment"].dropna().unique().tolist())
    if not segs:
        st.info("No customers in the current filters.")
        st.stop()

    target_seg = st.selectbox("Target segment", segs, index=0)

    # Simple targeting: customers who already buy from the puzzle's category a lot
    if target_seg:
        cust_in_seg = customer_facts[customer_facts["segment"] == target_seg][["customer_id"]]
        ce = sales_enriched.merge(cust_in_seg, on="customer_id", how="inner")
        cat_pref = ce.groupby(["customer_id", "category"])["quantity"].sum().reset_index()
        total_q = ce.groupby("customer_id")["quantity"].sum().reset_index().rename(columns={"quantity": "total_qty"})
        cat_pref = cat_pref.merge(total_q, on="customer_id", how="left")
        cat_pref["cat_share"] = cat_pref.apply(lambda r: _safe_div(r["quantity"], r["total_qty"]), axis=1)

        item_options = puzzles[["item_id", "item_name", "category"]].copy()
        item_options["label"] = item_options.apply(lambda r: f"{int(r['item_id'])} — {r['item_name']} ({r['category']})", axis=1)
        selected_item_id = st.selectbox(
            "Upsell item",
            item_options["item_id"].astype(int).tolist(),
            format_func=lambda iid: item_options.loc[item_options["item_id"] == iid, "label"].iloc[0],
        )
        item_row = puzzles[puzzles["item_id"] == selected_item_id].iloc[0]
        item_cat = str(item_row["category"])

        best_customers = (
            cat_pref[cat_pref["category"] == item_cat]
            .sort_values(["cat_share", "quantity"], ascending=False)
            .head(15)
            .merge(customer_facts, on="customer_id", how="left")
        )

        st.markdown("#### Who to target (based on category preference)")
        show_cols = [c for c in ["customer_id", "customer_name", "locality", "orders", "spend", "recency_days"] if c in best_customers.columns]
        st.dataframe(best_customers[show_cols], use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Auto-updated `upsell_config.json`")

    recom_list = []
    for _, row in puzzles.iterrows():
        recom_list.append(
            {
                "item_id": int(row["item_id"]) if pd.notna(row["item_id"]) else None,
                "item_name": row["item_name"],
                "category": row.get("category", None),
                "action": "UPSELL",
                "reason": "High margin + low sales (Puzzle)",
                "margin_rupees": float(row["margin"]),
                "margin_pct": float(row["margin_pct"]),
                "sales_qty_in_filter": int(row["quantity"]),
                "script": f"Try our {row['item_name']}, it's a specialty and pairs great with your meal!",
            }
        )

    UPSELL_JSON.write_text(json.dumps(recom_list, indent=2), encoding="utf-8")
    st.success("Updated `upsell_config.json` from current data + filters.")
    st.download_button(
        "Download upsell_config.json",
        data=json.dumps(recom_list, indent=2),
        file_name="upsell_config.json",
        mime="application/json",
    )

with tabs[5]:
    st.subheader("🥗 Smart Combo Generator")

    df = build_menu_engineering(menu_f, sales_f)

    # Try to generate combos from historical co-purchases first
    combo_df = build_combo_suggestions(sales_enriched)

    if combo_df is not None and not combo_df.empty:
        st.caption("Combos derived from historical co-purchases (recommended)")
        display_df = combo_df[[
            "item1_name",
            "item2_name",
            "pair_orders",
            "avg_revenue_per_order",
            "avg_margin_per_order",
            "recommended_combo_price",
            "estimated_combo_margin",
            "owner_note"
]].copy()

        display_df.columns = [
            "Item 1",
            "Item 2",
            "Times Bought Together",
            "Avg Revenue Per Order (₹)",
            "Avg Profit Per Order (₹)",
            "Suggested Combo Price (₹)",
            "Estimated Combo Profit (₹)",
            "Recommendation"
]

        st.dataframe(display_df.head(15), use_container_width=True, hide_index=True)
        fig = px.bar(combo_df.head(10), x="item1_name", y="avg_margin_per_order", color="item2_name", title="Top historical combos")
        st.plotly_chart(fig, use_container_width=True)
    else:
        # Fallback brute-force pair combos by expected profit
        st.caption("No historical pairings found — generating pair combos by expected profit.")
        pairs = []
        m = df.copy()
        for i in range(len(m)):
            for j in range(i + 1, len(m)):
                r1 = m.iloc[i]
                r2 = m.iloc[j]
                price = float(r1.get("selling_price", 0) or 0) + float(r2.get("selling_price", 0) or 0)
                cost = float(r1.get("food_cost", 0) or 0) + float(r2.get("food_cost", 0) or 0)
                pairs.append({
                    "item1_name": r1["item_name"],
                    "item2_name": r2["item_name"],
                    "expected_profit": price - cost,
                    "suggested_combo_price": round(price * 0.9),
                })

        pairs_df = pd.DataFrame(pairs)
        if not pairs_df.empty:
            pairs_df = pairs_df.sort_values("expected_profit", ascending=False).head(15)
            st.dataframe(pairs_df[["item1_name", "item2_name", "expected_profit", "suggested_combo_price"]], use_container_width=True, hide_index=True)
            fig = px.bar(pairs_df, x="item1_name", y="expected_profit", color="item2_name", title="Top pair combos by expected profit")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Not enough menu data to generate combos.")

    with tabs[6]:
        st.subheader("💰 Price Simulator")

        df = build_menu_engineering(menu_f, sales_f)
        if df.empty:
            st.info("Upload menu and sales data or widen filters to enable the simulator.")
        else:
            item = st.selectbox("Select Menu Item", df.item_name.tolist())
            row = df[df.item_name == item].iloc[0]
            cost = float(row.get("food_cost", 0) or 0)
            current = float(row.get("selling_price", 0) or 0)
            qty = int(row.get("quantity", 0) or 0)

            new_price = st.slider("Simulated Price", int(max(0, cost)), int(max(current * 2, cost + 1)), int(current))

            elasticity = 1 - (new_price - current) / (current * 1.5) if current != 0 else 1.0
            elasticity = max(0.4, elasticity)

            predicted_qty = int(qty * elasticity)

            new_profit = (new_price - cost) * predicted_qty
            st.metric("Projected Profit", f"₹{new_profit:,.0f}")

    with tabs[7]:
        st.subheader("ML Demand Forecast")

        df = build_menu_engineering(menu_f, sales_f)
        if df.empty:
            st.info("Upload menu and sales data to run demand forecast.")
        else:
            X = df[["selling_price", "margin_pct"]].fillna(0)
            y = df["quantity"].fillna(0)
            try:
                model = LinearRegression()
                model.fit(X, y)
                df["Predicted Monthly Demand"] = model.predict(X).astype(int)

                display = df[["item_name", "selling_price", "margin_pct", "Predicted Monthly Demand"]].copy()
                display.columns = ["Menu Item", "Selling Price", "Profit Margin %", "Predicted Demand"]
                st.dataframe(display)
                fig = px.bar(display.sort_values("Predicted Demand", ascending=False).head(10), x="Menu Item", y="Predicted Demand")
                st.plotly_chart(fig, use_container_width=True)
            except Exception as e:
                st.error(f"Forecast failed: {e}")

    with tabs[8]:
        st.subheader("🧠 Menu Optimizer")

        df = build_menu_engineering(menu_f, sales_f)
        if df.empty:
            st.info("Upload data to see optimizer recommendations.")
        else:
            st.subheader("⚠ Items That May Need Removal")
            remove = df[df["matrix_category"] == "Dog"][["item_name", "selling_price", "margin", "quantity"]].copy()
            remove.columns = ["Menu Item", "Price", "Profit Per Item", "Units Sold"]
            remove.columns = [
            "Menu Item",
            "Selling Price (₹)",
            "Profit per Item (₹)",
            "Units Sold"
            ]

            st.dataframe(remove, use_container_width=True, hide_index=True)

            st.subheader("🚀 Items To Promote")
            promote = df[df["matrix_category"] == "Puzzle"][["item_name", "selling_price", "margin", "quantity"]].copy()
            promote.columns = ["Menu Item", "Price", "Profit Per Item", "Units Sold"]
            promote.columns = [
            "Menu Item",
            "Selling Price (₹)",
            "Profit per Item (₹)",
            "Units Sold"
            ]

    st.dataframe(promote, use_container_width=True, hide_index=True)

    with tabs[9]:
        st.subheader("🏷 Discount Engine")

        df = build_menu_engineering(menu_f, sales_f)
        if df.empty:
            st.info("Upload data to enable discount simulations.")
        else:
            item = st.selectbox("Select Item", df.item_name.tolist())
            row = df[df.item_name == item].iloc[0]
            price = float(row.get("selling_price", 0) or 0)
            qty = int(row.get("quantity", 0) or 0)

            discount = st.slider("Discount %", 0, 50, 10)
            new_price = price * (1 - discount / 100)
            demand_boost = 1 + (discount / 100) * 1.5
            new_qty = int(qty * demand_boost)
            new_revenue = new_price * new_qty
            old_revenue = price * qty
            c1, c2 = st.columns(2)
            c1.metric("Current Revenue", f"₹{old_revenue:,.0f}")
            c2.metric("Projected Revenue", f"₹{new_revenue:,.0f}")    