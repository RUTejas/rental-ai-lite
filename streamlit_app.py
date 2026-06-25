import html
import sqlite3
from datetime import datetime
from pathlib import Path

import bcrypt
import altair as alt
import pandas as pd
import streamlit as st


APP_NAME = "RentWise Lite"
BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "rentwise_lite.db"
UPLOAD_DIR = BASE_DIR / "uploaded_documents"
MASTER_EMAIL = "master@rentwise.ai"
MASTER_PASSWORD = "Master@12345"

ROLE_MASTER = "Master Admin"
ROLE_ADMIN = "Admin"
ROLE_TENANT = "Tenant"

STATUS_PENDING = "Pending"
STATUS_APPROVED = "Approved"
STATUS_REJECTED = "Rejected"

st.set_page_config(page_title=APP_NAME, layout="wide")


def now_text():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def run_query(sql, params=(), fetch=False, one=False):
    with get_conn() as conn:
        cur = conn.execute(sql, params)
        conn.commit()
        if one:
            return cur.fetchone()
        if fetch:
            return cur.fetchall()
        return None


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password, password_hash):
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def init_db():
    UPLOAD_DIR.mkdir(exist_ok=True)
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                status TEXT NOT NULL,
                admin_id INTEGER,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS properties (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                tenant_id INTEGER,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                room_number TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agreements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                tenant_id INTEGER NOT NULL,
                property_id INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                rent_amount_info REAL,
                deposit_amount_info REAL,
                house_rules TEXT,
                notice_period TEXT,
                status TEXT NOT NULL,
                accepted_at TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                tenant_id INTEGER NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                status TEXT NOT NULL,
                rejection_reason TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rent_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                tenant_id INTEGER NOT NULL,
                property_id INTEGER,
                rent_month TEXT NOT NULL,
                due_amount REAL NOT NULL,
                paid_amount REAL NOT NULL DEFAULT 0,
                due_date TEXT,
                paid_on TEXT,
                status TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS trouble_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                admin_id INTEGER,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                category TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )
        existing_master = conn.execute(
            "SELECT id FROM users WHERE email = ?", (MASTER_EMAIL,)
        ).fetchone()
        if not existing_master:
            conn.execute(
                """
                INSERT INTO users (name, email, password_hash, role, status, admin_id, created_at)
                VALUES (?, ?, ?, ?, ?, NULL, ?)
                """,
                (
                    "Master Admin",
                    MASTER_EMAIL,
                    hash_password(MASTER_PASSWORD),
                    ROLE_MASTER,
                    STATUS_APPROVED,
                    now_text(),
                ),
            )
        conn.commit()
    seeded = run_query(
        "SELECT value FROM app_settings WHERE key = ?", ("demo_seeded",), one=True
    )
    if not seeded:
        ensure_demo_data()
        run_query(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
            ("demo_seeded", "yes"),
        )


def upsert_user(name, email, password, role, status, admin_id=None):
    existing = get_user_by_email(email)
    if existing:
        run_query(
            """
            UPDATE users
            SET name = ?, password_hash = ?, role = ?, status = ?, admin_id = ?
            WHERE email = ?
            """,
            (name, hash_password(password), role, status, admin_id, email),
        )
        return get_user_by_email(email)["id"]
    run_query(
        """
        INSERT INTO users (name, email, password_hash, role, status, admin_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (name, email, hash_password(password), role, status, admin_id, now_text()),
    )
    return get_user_by_email(email)["id"]


def ensure_demo_data():
    admin_1 = upsert_user(
        "Aarav Owner", "aarav.owner@rentwise.ai", "Owner@12345", ROLE_ADMIN, STATUS_APPROVED
    )
    admin_2 = upsert_user(
        "Meera Owner", "meera.owner@rentwise.ai", "Owner@22345", ROLE_ADMIN, STATUS_APPROVED
    )
    upsert_user(
        "Rohan Pending Owner", "rohan.pending@rentwise.ai", "Owner@32345", ROLE_ADMIN, STATUS_PENDING
    )

    tenants = [
        ("Priya Tenant", "priya.tenant@rentwise.ai", "Tenant@12345", admin_1),
        ("Kabir Tenant", "kabir.tenant@rentwise.ai", "Tenant@22345", admin_1),
        ("Anaya Tenant", "anaya.tenant@rentwise.ai", "Tenant@32345", admin_2),
        ("Dev Tenant", "dev.tenant@rentwise.ai", "Tenant@42345", admin_2),
    ]
    tenant_ids = {}
    for name, email, password, admin_id in tenants:
        tenant_ids[email] = upsert_user(name, email, password, ROLE_TENANT, STATUS_APPROVED, admin_id)

    demo_properties = [
        (admin_1, tenant_ids["priya.tenant@rentwise.ai"], "Skyline Residency", "12 MG Road, Bengaluru", "A-204"),
        (admin_1, tenant_ids["kabir.tenant@rentwise.ai"], "Lakeview Nest", "44 Indiranagar, Bengaluru", "B-101"),
        (admin_2, tenant_ids["anaya.tenant@rentwise.ai"], "Green Courtyard", "8 Jubilee Hills, Hyderabad", "C-303"),
        (admin_2, tenant_ids["dev.tenant@rentwise.ai"], "Metro Heights", "21 Andheri West, Mumbai", "D-1202"),
    ]
    for admin_id, tenant_id, name, address, room_number in demo_properties:
        existing = run_query(
            "SELECT id FROM properties WHERE admin_id = ? AND name = ?",
            (admin_id, name),
            one=True,
        )
        if existing:
            property_id = existing["id"]
            run_query(
                """
                UPDATE properties
                SET tenant_id = ?, address = ?, room_number = ?, status = ?
                WHERE id = ?
                """,
                (tenant_id, address, room_number, "Occupied", property_id),
            )
        else:
            run_query(
                """
                INSERT INTO properties (admin_id, tenant_id, name, address, room_number, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (admin_id, tenant_id, name, address, room_number, "Occupied", now_text()),
            )
            property_id = run_query(
                "SELECT id FROM properties WHERE admin_id = ? AND name = ?",
                (admin_id, name),
                one=True,
            )["id"]

        agreement = run_query(
            "SELECT id FROM agreements WHERE tenant_id = ? AND property_id = ?",
            (tenant_id, property_id),
            one=True,
        )
        if not agreement:
            run_query(
                """
                INSERT INTO agreements (
                    admin_id, tenant_id, property_id, start_date, end_date,
                    rent_amount_info, deposit_amount_info, house_rules,
                    notice_period, status, accepted_at, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
                """,
                (
                    admin_id,
                    tenant_id,
                    property_id,
                    "2026-07-01",
                    "2027-06-30",
                    25000,
                    50000,
                    "Keep the property clean and avoid disturbance after 10 PM.",
                    "30 days",
                    "Sent",
                    now_text(),
                ),
            )

    seed_rent_records()


def seed_rent_records():
    records = [
        ("priya.tenant@rentwise.ai", "2026-06", 25000, 25000, "Paid", "Paid on time"),
        ("priya.tenant@rentwise.ai", "2026-07", 25000, 0, "Pending", "Upcoming rent"),
        ("kabir.tenant@rentwise.ai", "2026-06", 25000, 15000, "Partial", "Balance pending"),
        ("kabir.tenant@rentwise.ai", "2026-07", 25000, 0, "Pending", "Upcoming rent"),
        ("anaya.tenant@rentwise.ai", "2026-06", 25000, 25000, "Paid", "Paid on time"),
        ("anaya.tenant@rentwise.ai", "2026-07", 25000, 0, "Pending", "Upcoming rent"),
        ("dev.tenant@rentwise.ai", "2026-06", 25000, 0, "Overdue", "Needs follow-up"),
        ("dev.tenant@rentwise.ai", "2026-07", 25000, 0, "Pending", "Upcoming rent"),
    ]
    for email, month, due, paid, status, notes in records:
        tenant = get_user_by_email(email)
        if not tenant:
            continue
        prop = run_query(
            "SELECT id FROM properties WHERE tenant_id = ? ORDER BY id DESC LIMIT 1",
            (tenant["id"],),
            one=True,
        )
        existing = run_query(
            "SELECT id FROM rent_records WHERE tenant_id = ? AND rent_month = ?",
            (tenant["id"], month),
            one=True,
        )
        paid_on = "2026-06-05" if status == "Paid" else None
        if existing:
            run_query(
                """
                UPDATE rent_records
                SET admin_id = ?, property_id = ?, due_amount = ?, paid_amount = ?,
                    due_date = ?, paid_on = ?, status = ?, notes = ?
                WHERE id = ?
                """,
                (
                    tenant["admin_id"],
                    prop["id"] if prop else None,
                    due,
                    paid,
                    f"{month}-05",
                    paid_on,
                    status,
                    notes,
                    existing["id"],
                ),
            )
        else:
            run_query(
                """
                INSERT INTO rent_records (
                    admin_id, tenant_id, property_id, rent_month, due_amount,
                    paid_amount, due_date, paid_on, status, notes, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tenant["admin_id"],
                    tenant["id"],
                    prop["id"] if prop else None,
                    month,
                    due,
                    paid,
                    f"{month}-05",
                    paid_on,
                    status,
                    notes,
                    now_text(),
                ),
            )


def to_df(rows):
    return pd.DataFrame([dict(row) for row in rows])


def safe(value):
    return html.escape("" if value is None else str(value))


def money(value):
    return f"INR {float(value):,.0f}"


def pct(value, total):
    if not total:
        return 0
    return max(0, min(100, round((float(value) / float(total)) * 100)))


def get_user_by_email(email):
    return run_query("SELECT * FROM users WHERE lower(email) = lower(?)", (email,), one=True)


def get_user(user_id):
    return run_query("SELECT * FROM users WHERE id = ?", (user_id,), one=True)


def current_user():
    user_id = st.session_state.get("user_id")
    return get_user(user_id) if user_id else None


def get_latest_agreement(tenant_id):
    return run_query(
        """
        SELECT a.*, p.name AS property_name, p.address AS property_address, u.name AS tenant_name
        FROM agreements a
        JOIN properties p ON p.id = a.property_id
        JOIN users u ON u.id = a.tenant_id
        WHERE a.tenant_id = ?
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT 1
        """,
        (tenant_id,),
        one=True,
    )


def get_latest_document(tenant_id):
    return run_query(
        """
        SELECT d.*, u.name AS tenant_name
        FROM documents d
        JOIN users u ON u.id = d.tenant_id
        WHERE d.tenant_id = ?
        ORDER BY d.created_at DESC, d.id DESC
        LIMIT 1
        """,
        (tenant_id,),
        one=True,
    )


def readiness_score(tenant_id):
    agreement = get_latest_agreement(tenant_id)
    document = get_latest_document(tenant_id)
    accepted = bool(agreement and agreement["status"] == "Accepted")
    uploaded = bool(document)
    approved = bool(document and document["status"] == STATUS_APPROVED)

    score = 0
    if accepted:
        score += 40
    if uploaded:
        score += 30
    if approved:
        score += 30

    if score < 40:
        label = "Not Ready"
    elif score < 70:
        label = "Partially Ready"
    elif score < 100:
        label = "Almost Ready"
    else:
        label = "Rental Ready"

    return {
        "score": score,
        "label": label,
        "agreement_status": agreement["status"] if agreement else "Not Created",
        "document_status": document["status"] if document else "Not Uploaded",
    }


def scoped_counts(user):
    if user["role"] == ROLE_MASTER:
        return {
            "Admins": run_query("SELECT COUNT(*) c FROM users WHERE role = ?", (ROLE_ADMIN,), one=True)["c"],
            "Pending Admins": run_query(
                "SELECT COUNT(*) c FROM users WHERE role = ? AND status = ?",
                (ROLE_ADMIN, STATUS_PENDING),
                one=True,
            )["c"],
            "Tenants": run_query("SELECT COUNT(*) c FROM users WHERE role = ?", (ROLE_TENANT,), one=True)["c"],
            "Properties": run_query("SELECT COUNT(*) c FROM properties", one=True)["c"],
            "Agreements": run_query("SELECT COUNT(*) c FROM agreements", one=True)["c"],
            "Documents": run_query("SELECT COUNT(*) c FROM documents", one=True)["c"],
        }
    tenant_rows = run_query(
        "SELECT id FROM users WHERE role = ? AND admin_id = ?",
        (ROLE_TENANT, user["id"]),
        fetch=True,
    )
    ready_count = sum(1 for tenant in tenant_rows if readiness_score(tenant["id"])["score"] == 100)
    return {
        "My Properties": run_query(
            "SELECT COUNT(*) c FROM properties WHERE admin_id = ?", (user["id"],), one=True
        )["c"],
        "My Tenants": run_query(
            "SELECT COUNT(*) c FROM users WHERE role = ? AND admin_id = ?",
            (ROLE_TENANT, user["id"]),
            one=True,
        )["c"],
        "Agreements Created": run_query(
            "SELECT COUNT(*) c FROM agreements WHERE admin_id = ?", (user["id"],), one=True
        )["c"],
        "Pending Documents": run_query(
            "SELECT COUNT(*) c FROM documents WHERE admin_id = ? AND status = ?",
            (user["id"], STATUS_PENDING),
            one=True,
        )["c"],
        "Rental Ready Tenants": ready_count,
    }


def rent_records_for_admin(admin_id=None):
    where = ""
    params = ()
    if admin_id:
        where = "WHERE rr.admin_id = ?"
        params = (admin_id,)
    return run_query(
        f"""
        SELECT rr.id, owner.name AS admin, tenant.name AS tenant, tenant.email AS tenant_email,
               p.name AS property, rr.rent_month, rr.due_amount, rr.paid_amount,
               (rr.due_amount - rr.paid_amount) AS balance_amount,
               rr.due_date, rr.paid_on, rr.status, rr.notes, rr.created_at
        FROM rent_records rr
        JOIN users owner ON owner.id = rr.admin_id
        JOIN users tenant ON tenant.id = rr.tenant_id
        LEFT JOIN properties p ON p.id = rr.property_id
        {where}
        ORDER BY rr.rent_month DESC, owner.name, tenant.name
        """,
        params,
        fetch=True,
    )


def render_rent_summary(rows):
    df = to_df(rows)
    if df.empty:
        st.info("No rent records yet.")
        return
    total_due = float(df["due_amount"].sum())
    total_paid = float(df["paid_amount"].sum())
    total_balance = float(df["balance_amount"].sum())
    unpaid_count = int((df["status"] != "Paid").sum())
    collection_rate = pct(total_paid, total_due)
    show_metrics(
        {
            "Total Rent Due": money(total_due),
            "Collected": money(total_paid),
            "Pending Balance": money(total_balance),
            "Unpaid / Partial": unpaid_count,
            "Collection Rate": f"{collection_rate}%",
        },
        notes={
            "Collected": "Actual paid amount",
            "Pending Balance": "Due minus paid",
            "Collection Rate": "Paid compared with due",
        },
    )

    status_chart = (
        df["status"]
        .value_counts()
        .rename_axis("status")
        .reset_index(name="records")
    )
    monthly = (
        df.groupby("rent_month", as_index=False)[["due_amount", "paid_amount"]]
        .sum()
        .sort_values("rent_month")
    )
    chart_cols = st.columns(2)
    with chart_cols[0].container(border=True):
        st.markdown("**Rent Status**")
        status_visual = (
            alt.Chart(status_chart)
            .mark_bar(cornerRadiusTopLeft=5, cornerRadiusTopRight=5)
            .encode(
                x=alt.X("status:N", title=None, sort=["Paid", "Pending", "Partial", "Overdue"]),
                y=alt.Y("records:Q", title="Records", axis=alt.Axis(grid=False)),
                color=alt.Color(
                    "status:N",
                    title=None,
                    scale=alt.Scale(
                        domain=["Paid", "Pending", "Partial", "Overdue"],
                        range=["#7E9B87", "#C89B5E", "#B66A4B", "#D15F5F"],
                    ),
                ),
                tooltip=["status", "records"],
            )
            .properties(height=220)
            .configure_view(strokeOpacity=0)
            .configure_axis(labelColor="#FFF8EF", titleColor="#FFF8EF")
            .configure_legend(labelColor="#FFF8EF", titleColor="#FFF8EF")
        )
        st.altair_chart(status_visual, use_container_width=True)

    with chart_cols[1].container(border=True):
        st.markdown("**Monthly Due vs Paid**")
        monthly_long = monthly.melt(
            id_vars=["rent_month"],
            value_vars=["due_amount", "paid_amount"],
            var_name="type",
            value_name="amount",
        )
        monthly_long["type"] = monthly_long["type"].map(
            {"due_amount": "Due", "paid_amount": "Paid"}
        )
        monthly_visual = (
            alt.Chart(monthly_long)
            .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4)
            .encode(
                x=alt.X("rent_month:N", title=None),
                y=alt.Y("amount:Q", title="Amount", axis=alt.Axis(grid=False)),
                xOffset="type:N",
                color=alt.Color(
                    "type:N",
                    title=None,
                    scale=alt.Scale(domain=["Due", "Paid"], range=["#C89B5E", "#7E9B87"]),
                ),
                tooltip=["rent_month", "type", alt.Tooltip("amount:Q", format=",.0f")],
            )
            .properties(height=220)
            .configure_view(strokeOpacity=0)
            .configure_axis(labelColor="#FFF8EF", titleColor="#FFF8EF")
            .configure_legend(labelColor="#FFF8EF", titleColor="#FFF8EF")
        )
        st.altair_chart(monthly_visual, use_container_width=True)


def apply_styles():
    st.markdown(
        """
        <style>
        :root {
            --charcoal: #0B1117;
            --graphite: #121A22;
            --panel: #17212B;
            --ivory: #FFF8EF;
            --stone: #F7F3EC;
            --bronze: #C89B5E;
            --gold: #C89B5E;
            --sage: #7E9B87;
            --terracotta: #B66A4B;
            --forest: #1F3D35;
            --beige: #E8DCC8;
            --sandstone: #D6C4A8;
            --danger: #B94A48;
            --success: #2F7D5C;
            --info: #3F6C8F;
            --ink: #070B10;
            --line: rgba(255, 248, 239, 0.12);
            --muted: rgba(255, 248, 239, 0.68);
            --panel-glass: rgba(18, 26, 34, 0.78);
        }
        html, body, .stApp, [class*="css"] {
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
        }
        .stApp {
            background:
                radial-gradient(circle at 18% 12%, rgba(200, 155, 94, 0.13), transparent 28%),
                radial-gradient(circle at 84% 18%, rgba(31, 61, 53, 0.30), transparent 30%),
                linear-gradient(135deg, #081018 0%, #0B1117 45%, #101820 100%);
            color: var(--ivory);
        }
        .block-container {
            max-width: 1400px;
            padding-top: 24px;
            padding-bottom: 64px;
        }
        section[data-testid="stSidebar"] {
            background: linear-gradient(180deg, #0B1117 0%, #121A22 58%, #1F3D35 100%);
            border-right: 1px solid rgba(200, 155, 94, 0.22);
            box-shadow: 12px 0 35px rgba(0, 0, 0, 0.18);
        }
        section[data-testid="stSidebar"] > div {
            padding-top: 2rem;
        }
        section[data-testid="stSidebar"] h1,
        section[data-testid="stSidebar"] h2,
        section[data-testid="stSidebar"] h3 {
            font-size: 1.35rem;
            margin-top: 10px;
        }
        section[data-testid="stSidebar"] p,
        section[data-testid="stSidebar"] label,
        section[data-testid="stSidebar"] span {
            color: rgba(255, 248, 239, 0.76);
        }
        h1, h2, h3, h4 {
            color: var(--ivory);
            letter-spacing: 0;
            font-weight: 760;
        }
        h1 {
            font-size: 2.8rem;
            line-height: 1.08;
            margin-bottom: 6px;
        }
        h2, h3 {
            margin-top: 28px;
            margin-bottom: 12px;
        }
        p, .stCaptionContainer, div[data-testid="stMarkdownContainer"] {
            color: rgba(255, 248, 239, 0.82);
        }
        div[data-testid="stMetric"] {
            background: linear-gradient(180deg, rgba(23, 33, 43, 0.98), rgba(12, 18, 25, 0.96));
            border: 1px solid rgba(200, 155, 94, 0.28);
            border-radius: 8px;
            padding: 10px 0 6px;
        }
        div[data-testid="stMetricValue"] {
            color: var(--gold);
            font-weight: 780;
            font-size: 1.85rem;
        }
        div[data-testid="stMetricLabel"] {
            color: rgba(255, 248, 239, 0.72);
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 0.78rem;
        }
        div[data-testid="stVerticalBlockBorderWrapper"] {
            background:
                linear-gradient(180deg, rgba(23, 33, 43, 0.92), rgba(10, 16, 22, 0.94));
            border-color: rgba(255, 248, 239, 0.12) !important;
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.20);
            border-radius: 8px;
        }
        .rw-card {
            background: linear-gradient(180deg, rgba(18, 26, 34, 0.96), rgba(13, 20, 27, 0.96));
            border: 1px solid rgba(255, 248, 239, 0.11);
            border-radius: 8px;
            padding: 18px;
            margin: 10px 0 18px;
            box-shadow: 0 16px 34px rgba(0, 0, 0, 0.16);
        }
        .rw-card strong {
            color: var(--gold);
        }
        .rw-pill {
            display: inline-block;
            border-radius: 999px;
            padding: 5px 10px;
            background: rgba(126, 155, 135, 0.18);
            border: 1px solid rgba(126, 155, 135, 0.45);
            color: #D9E6DD;
            font-size: 0.86rem;
        }
        .rw-warn {
            background: rgba(182, 106, 75, 0.16);
            border-color: rgba(182, 106, 75, 0.48);
            color: #F3C5B3;
        }
        .stButton > button, .stDownloadButton > button {
            border-radius: 8px;
            border: 1px solid rgba(200, 155, 94, 0.55);
            background: linear-gradient(135deg, #C89B5E, #B66A4B);
            color: #0B1117;
            font-weight: 700;
            min-height: 38px;
            box-shadow: 0 10px 24px rgba(200, 155, 94, 0.14);
        }
        .stButton > button:hover, .stDownloadButton > button:hover {
            border-color: #FFF8EF;
            color: #0B1117;
            transform: translateY(-1px);
            box-shadow: 0 14px 30px rgba(200, 155, 94, 0.22);
        }
        .stDataFrame, div[data-testid="stDataFrame"] {
            border: 1px solid rgba(255, 248, 239, 0.10);
            border-radius: 8px;
            overflow: hidden;
        }
        div[data-testid="stTabs"] button {
            color: rgba(255, 248, 239, 0.72);
        }
        div[data-testid="stTabs"] button[aria-selected="true"] {
            color: var(--ivory);
            border-bottom-color: var(--gold);
        }
        input, textarea, select {
            border-radius: 8px !important;
        }
        div[data-baseweb="input"], div[data-baseweb="select"], textarea {
            background-color: rgba(23, 33, 43, 0.92) !important;
            border-color: rgba(255, 248, 239, 0.10) !important;
        }
        div[data-testid="stAlert"] {
            border-radius: 8px;
            border: 1px solid rgba(200, 155, 94, 0.16);
        }
        div[data-testid="stForm"] {
            background: linear-gradient(180deg, rgba(18,26,34,.72), rgba(11,17,23,.78));
            border: 1px solid rgba(200,155,94,.18);
            border-radius: 8px;
            padding: 1.1rem;
        }
        div[data-testid="stFileUploader"] {
            background: rgba(23, 33, 43, .74);
            border: 1px dashed rgba(200,155,94,.35);
            border-radius: 8px;
            padding: .75rem;
        }
        div[data-testid="stSidebarNav"] {
            background: transparent;
        }
        [data-testid="stSidebar"] [role="radiogroup"] label {
            background: rgba(255,248,239,.04);
            border: 1px solid rgba(255,248,239,.08);
            border-radius: 8px;
            margin: .22rem 0;
            padding: .18rem .35rem;
        }
        [data-testid="stSidebar"] [role="radiogroup"] label:hover {
            border-color: rgba(200,155,94,.42);
            background: rgba(200,155,94,.10);
        }
        .rentwise-soft-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(200,155,94,.35), transparent);
            margin: 1.2rem 0;
        }
        .rentwise-footer {
            color: rgba(255, 248, 239, 0.58);
            font-size: .78rem;
            margin-top: 2rem;
        }
        .lux-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 18px 22px;
            margin-bottom: 18px;
            border: 1px solid rgba(200, 155, 94, 0.22);
            border-radius: 8px;
            background: rgba(11, 17, 23, 0.72);
            backdrop-filter: blur(14px);
            box-shadow: 0 20px 54px rgba(0, 0, 0, 0.24);
        }
        .lux-brand {
            color: var(--ivory);
            font-weight: 780;
            font-size: 1.05rem;
        }
        .lux-links {
            display: flex;
            gap: 22px;
            align-items: center;
            color: rgba(255, 248, 239, 0.78);
            font-size: 0.78rem;
            letter-spacing: .08em;
            text-transform: uppercase;
        }
        .lux-credit {
            color: rgba(255, 248, 239, 0.54);
            font-size: 0.78rem;
        }
        .lux-hero {
            min-height: 590px;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            border: 1px solid rgba(200, 155, 94, 0.26);
            background:
                linear-gradient(90deg, rgba(6, 10, 14, .92) 0%, rgba(6, 10, 14, .74) 45%, rgba(6, 10, 14, .34) 100%),
                url("https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80");
            background-size: cover;
            background-position: center;
            box-shadow: 0 34px 100px rgba(0, 0, 0, 0.44);
        }
        .lux-hero-inner {
            max-width: 760px;
            padding: 74px 58px;
        }
        .lux-kicker {
            color: var(--bronze);
            text-transform: uppercase;
            letter-spacing: .18em;
            font-size: .78rem;
            font-weight: 760;
            margin-bottom: 18px;
        }
        .lux-hero h1 {
            color: var(--ivory);
            font-size: clamp(3rem, 7vw, 6.5rem);
            line-height: .92;
            margin: 0 0 20px;
            font-weight: 820;
        }
        .lux-hero h2 {
            color: var(--stone);
            font-size: clamp(1.3rem, 2.4vw, 2.2rem);
            line-height: 1.18;
            margin: 0 0 22px;
            font-weight: 650;
        }
        .lux-hero p {
            color: rgba(255, 248, 239, 0.80);
            font-size: 1.05rem;
            line-height: 1.7;
            max-width: 670px;
        }
        .lux-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 28px 0;
        }
        .lux-pill {
            border: 1px solid rgba(200, 155, 94, .36);
            background: rgba(18, 26, 34, .58);
            color: var(--ivory);
            border-radius: 999px;
            padding: 9px 13px;
            font-size: .78rem;
            letter-spacing: .05em;
            text-transform: uppercase;
        }
        .lux-cta-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 30px;
        }
        .lux-cta {
            padding: 13px 20px;
            border-radius: 999px;
            text-transform: uppercase;
            letter-spacing: .08em;
            font-size: .78rem;
            font-weight: 800;
            border: 1px solid rgba(200, 155, 94, .58);
            color: #0B1117;
            background: linear-gradient(135deg, #C89B5E, #B66A4B);
        }
        .lux-cta.secondary {
            color: var(--ivory);
            background: rgba(11,17,23,.52);
        }
        .lux-access-shell {
            margin-top: -96px;
            margin-left: auto;
            margin-right: 42px;
            max-width: 520px;
            position: relative;
            z-index: 5;
        }
        .lux-story {
            margin: 48px 0;
            padding: 34px;
            border: 1px solid rgba(255, 248, 239, 0.12);
            border-radius: 8px;
            background: linear-gradient(135deg, rgba(23, 33, 43, .96), rgba(31, 61, 53, .42));
            box-shadow: 0 24px 66px rgba(0,0,0,.24);
        }
        .lux-story h3 {
            font-size: clamp(1.7rem, 3vw, 3rem);
            margin: 0 0 10px;
        }
        .lux-story p {
            font-size: 1rem;
            line-height: 1.7;
            color: rgba(255,248,239,.74);
        }
        .lux-line-art {
            min-height: 210px;
            border-radius: 8px;
            background:
                linear-gradient(135deg, rgba(200,155,94,.16), rgba(126,155,135,.14)),
                repeating-linear-gradient(90deg, rgba(255,248,239,.045) 0 1px, transparent 1px 34px),
                repeating-linear-gradient(0deg, rgba(255,248,239,.035) 0 1px, transparent 1px 34px);
            border: 1px solid rgba(200,155,94,.18);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,248,239,.78);
            font-size: 4rem;
            font-weight: 200;
        }
        @media (max-width: 900px) {
            .lux-links { display: none; }
            .lux-hero-inner { padding: 46px 26px; }
            .lux-access-shell { margin: 18px 0 0; max-width: none; }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def page_title(title, caption=None):
    render_page_header(title, caption or "", "RentWise Lite")


def render_page_header(title, subtitle, badge=None):
    with st.container(border=True):
        top = st.columns([3, 1])
        with top[0]:
            st.caption("RentWise Lite")
            st.title(title)
            if subtitle:
                st.write(subtitle)
        with top[1]:
            if badge:
                st.caption("Section")
                st.subheader(badge)
        st.caption("Warm Luxury Home Tech | Created and Developed by Tejas R U")


def inject_luxury_css():
    apply_styles()


def render_luxury_nav():
    st.markdown(
        """
        <div class="lux-nav">
            <div class="lux-brand">RentWise Lite</div>
            <div class="lux-links">
                <span>Login</span>
                <span>Create Account</span>
                <span>Help</span>
            </div>
            <div class="lux-credit">Created and Developed by Tejas R U</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_hero_section():
    st.markdown(
        """
        <section class="lux-hero">
            <div class="lux-hero-inner">
                <div class="lux-kicker">Warm Luxury Home Tech</div>
                <h1>RentWise Lite</h1>
                <h2>Smart Rental Records, Agreements & Readiness</h2>
                <p>A premium yet simple rental workspace for owners and tenants to manage properties, agreements, ID verification, and rental readiness.</p>
                <div class="lux-pills">
                    <span class="lux-pill">Owner Control</span>
                    <span class="lux-pill">Tenant Portal</span>
                    <span class="lux-pill">Agreement Acceptance</span>
                    <span class="lux-pill">ID Verification</span>
                    <span class="lux-pill">Readiness Score</span>
                </div>
                <p>Created and Developed by Tejas R U</p>
                <div class="lux-cta-row">
                    <span class="lux-cta">Login</span>
                    <span class="lux-cta secondary">Create Account</span>
                </div>
            </div>
        </section>
        """,
        unsafe_allow_html=True,
    )


def render_login_panel():
    with st.container(border=True):
        st.caption("Secure Access")
        st.subheader("Access your workspace")
        with st.form("login_form"):
            login_role = st.selectbox("Login as", [ROLE_MASTER, ROLE_ADMIN, ROLE_TENANT])
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login")
        st.caption("Use the matching role for your account. Pending users must be approved before login.")
    return submitted, login_role, email, password


def render_story_section(title, description, image_or_icon, reverse=False):
    left, right = st.columns([1.05, 0.95] if not reverse else [0.95, 1.05], gap="large")
    text_col, visual_col = (left, right) if not reverse else (right, left)
    with text_col:
        st.markdown(
            f"""
            <div class="lux-story">
                <div class="lux-kicker">RentWise Platform</div>
                <h3>{safe(title)}</h3>
                <p>{safe(description)}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with visual_col:
        st.markdown(
            f"""
            <div class="lux-line-art">{safe(image_or_icon)}</div>
            """,
            unsafe_allow_html=True,
        )


def render_feature_tiles():
    render_story_section(
        "Owner Control",
        "Owners can create properties, manage tenants, prepare agreements, monitor monthly rent, and verify documents from one private workspace.",
        "⌂",
    )
    render_story_section(
        "Tenant Portal",
        "Tenants can view assigned rental information, accept agreements, upload ID proof, report trouble, and track readiness.",
        "⌁",
        reverse=True,
    )
    render_story_section(
        "Rental Readiness Score",
        "A unique readiness score shows whether a tenant is ready based on agreement acceptance, document upload, and admin verification.",
        "100",
    )
    render_story_section(
        "Secure Document Workflow",
        "Documents move through pending, approved, and rejected states with clear visibility for owners, tenants, and the master admin.",
        "▣",
        reverse=True,
    )


def render_footer():
    st.caption("RentWise Lite | Smart Rental Readiness Platform | Created and Developed by Tejas R U")


def render_page_intro(title, description, icon="Home"):
    with st.container(border=True):
        left, right = st.columns([4, 1])
        with left:
            st.caption("RentWise Lite")
            st.title(title)
            st.write(description)
        with right:
            with st.container(border=True):
                st.caption("Workspace")
                st.subheader(icon)


def render_sidebar_brand(user=None):
    st.sidebar.markdown(
        """
        <div style="border:1px solid rgba(200,155,94,.28); border-radius:8px; padding:16px; background:rgba(23,33,43,.72); box-shadow:0 18px 42px rgba(0,0,0,.22);">
            <div style="color:#C89B5E; letter-spacing:.18em; text-transform:uppercase; font-size:.68rem; font-weight:800;">Home Tech</div>
            <div style="font-size:1.35rem; line-height:1.1; font-weight:820; color:#FFF8EF; margin-top:8px;">RentWise Lite</div>
            <div style="color:rgba(255,248,239,.72); margin-top:8px; font-size:.86rem;">Smart Rental Readiness</div>
            <div style="height:1px; background:linear-gradient(90deg,#C89B5E,transparent); margin:14px 0;"></div>
            <div style="color:rgba(255,248,239,.62); font-size:.82rem; line-height:1.55;">Home-tech rental records, agreements, documents, and readiness tracking.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if user:
        st.sidebar.divider()
        st.sidebar.caption("Current Workspace")
        st.sidebar.write(f"**{user['name']}**")
        st.sidebar.caption(user["role"])
    st.sidebar.divider()


def feature_card(title, body):
    with st.container(border=True):
        st.markdown(f"**{title}**")
        st.caption(body)


def render_feature_card(title, description, icon="Feature"):
    with st.container(border=True):
        st.caption(icon)
        st.markdown(f"**{title}**")
        st.write(description)


def render_metric_card(title, value, subtitle="", icon="Metric"):
    with st.container(border=True):
        st.caption(icon)
        st.metric(title, value)
        if subtitle:
            st.caption(subtitle)


def render_info_panel(title, description):
    with st.container(border=True):
        st.markdown(f"**{title}**")
        st.write(description)


def render_status_badge(status):
    if status in [STATUS_APPROVED, "Paid", "Rental Ready", "Resolved"]:
        st.success(status)
    elif status in [STATUS_PENDING, "Pending", "Partial", "In Review"]:
        st.warning(status)
    elif status in [STATUS_REJECTED, "Rejected", "Overdue", "Not Ready"]:
        st.error(status)
    else:
        st.info(status)


def render_readiness_card(score):
    with st.container(border=True):
        st.subheader("Rental Readiness Score")
        st.metric(score["label"], f"{score['score']} / 100")
        st.progress(score["score"] / 100)
        st.caption(
            "Agreement accepted: 40 points | ID proof uploaded: 30 points | Document approved: 30 points"
        )
        if score["label"] == "Rental Ready":
            st.success("This tenant is fully ready for rental onboarding.")
        elif score["label"] == "Not Ready":
            st.error("This tenant still needs agreement and document steps.")
        else:
            st.warning("This tenant is in progress and needs remaining checklist items.")


def card(title, lines, warn=False):
    with st.container(border=True):
        if warn:
            st.warning(title)
        else:
            st.markdown(f"**{title}**")
        for label, value in lines:
            st.write(f"**{label}:** {value}")


def show_metrics(counts, notes=None):
    notes = notes or {}
    items = list(counts.items())
    for start in range(0, len(items), 4):
        cols = st.columns(min(4, len(items) - start))
        for col, (label, value) in zip(cols, items[start : start + 4]):
            with col:
                render_metric_card(label, value, notes.get(label, ""), "Overview")


def render_admin_breakdown(rows):
    df = to_df(rows)
    if df.empty or "admin" not in df.columns:
        return
    grouped = (
        df.groupby("admin", as_index=False)
        .agg(
            tenants=("tenant", "nunique"),
            due_amount=("due_amount", "sum"),
            paid_amount=("paid_amount", "sum"),
            balance_amount=("balance_amount", "sum"),
            open_records=("status", lambda s: int((s != "Paid").sum())),
        )
        .sort_values("admin")
    )
    cols = st.columns(min(3, max(1, len(grouped))))
    for index, (_, row) in enumerate(grouped.iterrows()):
        with cols[index % len(cols)].container(border=True):
            st.markdown(f"**{row['admin']}**")
            st.caption("Owner portfolio")
            st.metric("Tenants", int(row["tenants"]))
            st.write(f"Collected: **{money(row['paid_amount'])}**")
            st.write(f"Pending: **{money(row['balance_amount'])}**")
            st.write(f"Open rent records: **{int(row['open_records'])}**")


def display_table(rows, empty_message):
    df = to_df(rows)
    if df.empty:
        st.info(empty_message)
    else:
        st.dataframe(df, use_container_width=True, hide_index=True)


def remove_file_safely(file_path):
    try:
        path = Path(file_path)
        if path.exists() and UPLOAD_DIR.resolve() in path.resolve().parents:
            path.unlink()
    except OSError:
        pass


def delete_document(document_id, admin_id=None):
    if admin_id:
        doc = run_query(
            "SELECT file_path FROM documents WHERE id = ? AND admin_id = ?",
            (document_id, admin_id),
            one=True,
        )
    else:
        doc = run_query("SELECT file_path FROM documents WHERE id = ?", (document_id,), one=True)
    if doc:
        remove_file_safely(doc["file_path"])
    if admin_id:
        run_query("DELETE FROM documents WHERE id = ? AND admin_id = ?", (document_id, admin_id))
    else:
        run_query("DELETE FROM documents WHERE id = ?", (document_id,))


def delete_property(property_id, admin_id=None):
    if admin_id:
        run_query("DELETE FROM agreements WHERE property_id = ? AND admin_id = ?", (property_id, admin_id))
        run_query("DELETE FROM properties WHERE id = ? AND admin_id = ?", (property_id, admin_id))
    else:
        run_query("DELETE FROM agreements WHERE property_id = ?", (property_id,))
        run_query("DELETE FROM properties WHERE id = ?", (property_id,))


def delete_agreement(agreement_id, admin_id=None):
    if admin_id:
        run_query("DELETE FROM agreements WHERE id = ? AND admin_id = ?", (agreement_id, admin_id))
    else:
        run_query("DELETE FROM agreements WHERE id = ?", (agreement_id,))


def delete_tenant(tenant_id, admin_id=None):
    if admin_id:
        tenant = run_query(
            "SELECT id FROM users WHERE id = ? AND role = ? AND admin_id = ?",
            (tenant_id, ROLE_TENANT, admin_id),
            one=True,
        )
        if not tenant:
            return
    docs = run_query("SELECT id FROM documents WHERE tenant_id = ?", (tenant_id,), fetch=True)
    for doc in docs:
        delete_document(doc["id"])
    run_query("DELETE FROM rent_records WHERE tenant_id = ?", (tenant_id,))
    run_query("DELETE FROM agreements WHERE tenant_id = ?", (tenant_id,))
    run_query("UPDATE properties SET tenant_id = NULL, status = ? WHERE tenant_id = ?", ("Vacant", tenant_id))
    run_query("DELETE FROM users WHERE id = ? AND role = ?", (tenant_id, ROLE_TENANT))


def delete_admin(admin_id):
    tenants = run_query(
        "SELECT id FROM users WHERE role = ? AND admin_id = ?",
        (ROLE_TENANT, admin_id),
        fetch=True,
    )
    for tenant in tenants:
        delete_tenant(tenant["id"], admin_id)
    docs = run_query("SELECT id FROM documents WHERE admin_id = ?", (admin_id,), fetch=True)
    for doc in docs:
        delete_document(doc["id"])
    run_query("DELETE FROM rent_records WHERE admin_id = ?", (admin_id,))
    run_query("DELETE FROM agreements WHERE admin_id = ?", (admin_id,))
    run_query("DELETE FROM properties WHERE admin_id = ?", (admin_id,))
    run_query("DELETE FROM users WHERE id = ? AND role = ?", (admin_id, ROLE_ADMIN))


def delete_record_selector(title, rows, label_builder, on_delete, key_prefix):
    if not rows:
        return
    with st.expander(title):
        options = {label_builder(row): row["id"] for row in rows}
        selected = st.selectbox("Choose record", list(options.keys()), key=f"{key_prefix}_select")
        confirm = st.checkbox("I understand this delete cannot be undone.", key=f"{key_prefix}_confirm")
        if st.button("Delete Selected", key=f"{key_prefix}_delete", disabled=not confirm):
            on_delete(options[selected])
            st.success("Deleted selected record.")
            st.rerun()


def render_account_approval_rows(rows, key_prefix, allow_delete=False):
    if not rows:
        st.info("No accounts found.")
        return
    for account in rows:
        with st.container(border=True):
            cols = st.columns([3, 2, 2, 3])
            cols[0].write(f"**{account['name']}**")
            cols[0].caption(account["email"])
            if "owner_name" in account.keys() and account["owner_name"]:
                cols[0].caption(f"Owner: {account['owner_name']}")
            cols[1].write(account["role"])
            with cols[2]:
                render_status_badge(account["status"])
            cols[2].caption(account["created_at"])
            with cols[3]:
                a, r, d = st.columns(3)
                if a.button(
                    "Approve",
                    key=f"{key_prefix}_approve_{account['id']}",
                    disabled=account["status"] == STATUS_APPROVED,
                ):
                    run_query(
                        "UPDATE users SET status = ? WHERE id = ?",
                        (STATUS_APPROVED, account["id"]),
                    )
                    st.rerun()
                if r.button(
                    "Reject",
                    key=f"{key_prefix}_reject_{account['id']}",
                    disabled=account["status"] == STATUS_REJECTED,
                ):
                    run_query(
                        "UPDATE users SET status = ? WHERE id = ?",
                        (STATUS_REJECTED, account["id"]),
                    )
                    st.rerun()
                if allow_delete and d.button("Delete", key=f"{key_prefix}_delete_{account['id']}"):
                    if account["role"] == ROLE_ADMIN:
                        delete_admin(account["id"])
                    elif account["role"] == ROLE_TENANT:
                        delete_tenant(account["id"])
                    st.rerun()


def login_page():
    render_luxury_nav()
    render_hero_section()
    st.markdown('<div class="lux-access-shell">', unsafe_allow_html=True)
    submitted, login_role, email, password = render_login_panel()
    st.markdown("</div>", unsafe_allow_html=True)

    if submitted:
        user = get_user_by_email(email.strip())
        if not user or not verify_password(password, user["password_hash"]):
            st.error("Invalid email or password.")
            return
        expected_role = ROLE_ADMIN if login_role == ROLE_ADMIN else login_role
        if user["role"] != expected_role:
            st.error(f"This account is registered as {user['role']}. Choose the matching login role.")
            return
        if user["status"] != STATUS_APPROVED:
            if user["role"] == ROLE_ADMIN:
                st.warning("Your owner account is waiting for Master Admin approval.")
            elif user["role"] == ROLE_TENANT:
                st.warning("Your tenant account is waiting for owner/admin approval.")
            else:
                st.warning(f"Your account is {user['status']}. Please wait for approval.")
            return
        st.session_state.user_id = user["id"]
        st.success("Logged in successfully.")
        st.rerun()

    st.info("New here? Open Create New Account from the sidebar to register as an Admin / Owner or Tenant / User.")
    st.caption("Use Forgot Password or Report Trouble from the sidebar if you cannot access your account.")
    render_feature_tiles()


def signup_page():
    render_page_intro(
        "Create New Account",
        "Register as an owner or tenant. Every new account is manually approved before it can access private rental data.",
        "Access",
    )
    approved_admins = run_query(
        "SELECT id, name, email FROM users WHERE role = ? AND status = ? ORDER BY name",
        (ROLE_ADMIN, STATUS_APPROVED),
        fetch=True,
    )
    left, right = st.columns([0.9, 1.1], gap="large")
    with left:
        feature_card("Manual Approval", "Owner accounts wait for Master Admin approval. Tenant accounts wait for the selected owner.")
        feature_card("Private Workspaces", "Each admin sees only their own tenants, rent records, agreements, and documents.")
        feature_card("Tenant Mapping", "Tenants select their owner during signup so every record is stored under the right admin.")
    with right.container(border=True):
        with st.form("signup_form"):
            account_type = st.selectbox("Create account as", ["Admin / Owner", "Tenant / User"])
            name = st.text_input("Full name")
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            confirm = st.text_input("Confirm password", type="password")
            owner_options = {
                f"{admin['name']} ({admin['email']})": admin["id"]
                for admin in approved_admins
            }
            owner_choice = None
            if account_type == "Tenant / User":
                if owner_options:
                    owner_choice = st.selectbox("Select your owner/admin", list(owner_options.keys()))
                else:
                    st.info("No approved owners are available yet.")
            submitted = st.form_submit_button("Create Account")

    if submitted:
        if not name.strip() or not email.strip() or not password:
            st.error("Name, email, and password are required.")
            return
        if password != confirm:
            st.error("Passwords do not match.")
            return
        if len(password) < 8:
            st.error("Use at least 8 characters for the password.")
            return
        if get_user_by_email(email.strip()):
            st.error("An account with this email already exists.")
            return
        if account_type == "Tenant / User" and not owner_choice:
            st.error("Select an approved owner before creating a tenant account.")
            return
        role = ROLE_ADMIN if account_type == "Admin / Owner" else ROLE_TENANT
        status = STATUS_PENDING
        admin_id = None if role == ROLE_ADMIN else owner_options[owner_choice]
        run_query(
            """
            INSERT INTO users (name, email, password_hash, role, status, admin_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (name.strip(), email.strip(), hash_password(password), role, status, admin_id, now_text()),
        )
        if role == ROLE_ADMIN:
            st.success("Owner account created. Master Admin approval is required before login.")
        else:
            st.success("Tenant account created. Your selected owner/admin must approve it before login.")


def forgot_password_page():
    render_page_intro(
        "Forgot Password",
        "Reset your password using your registered email and account role.",
        "Reset",
    )
    left, right = st.columns([0.9, 1.1], gap="large")
    with left:
        feature_card("Local Recovery", "This project resets passwords locally for simple demo use.")
        feature_card("Role Check", "The selected role must match the registered account.")
    with right.container(border=True):
        st.info("After reset, use the new password to log in.")
        with st.form("forgot_password_form"):
            role = st.selectbox("Account role", [ROLE_MASTER, ROLE_ADMIN, ROLE_TENANT])
            email = st.text_input("Registered email")
            new_password = st.text_input("New password", type="password")
            confirm_password = st.text_input("Confirm new password", type="password")
            submitted = st.form_submit_button("Reset Password")

    if submitted:
        if not email.strip() or not new_password:
            st.error("Email and new password are required.")
            return
        if new_password != confirm_password:
            st.error("Passwords do not match.")
            return
        if len(new_password) < 8:
            st.error("Use at least 8 characters for the new password.")
            return
        user = get_user_by_email(email.strip())
        if not user or user["role"] != role:
            st.error("No account matched that email and role.")
            return
        run_query(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user["id"]),
        )
        st.success("Password reset successfully. You can now log in with the new password.")


def report_trouble_page():
    active_user = current_user()
    render_page_intro(
        "Report Trouble",
        "Send a login, approval, rent, document, agreement, or app issue for review.",
        "Help",
    )

    default_name = active_user["name"] if active_user else ""
    default_email = active_user["email"] if active_user else ""
    default_role = active_user["role"] if active_user else ROLE_TENANT

    left, right = st.columns([0.9, 1.1], gap="large")
    with left:
        feature_card("For Login Problems", "Use this before login if you cannot access your account.")
        feature_card("For Tenant Issues", "Tenant reports are routed to the selected owner workspace when possible.")
        feature_card("For Master Review", "Master Admin can view all reports across the platform.")
    with right.container(border=True):
        with st.form("trouble_report_form"):
            name = st.text_input("Your name", value=default_name)
            email = st.text_input("Your email", value=default_email)
            role = st.selectbox(
                "Account role",
                [ROLE_MASTER, ROLE_ADMIN, ROLE_TENANT],
                index=[ROLE_MASTER, ROLE_ADMIN, ROLE_TENANT].index(default_role)
                if default_role in [ROLE_MASTER, ROLE_ADMIN, ROLE_TENANT]
                else 2,
            )
            category = st.selectbox(
                "Issue category",
                [
                    "Login issue",
                    "Signup approval",
                    "Forgot password",
                    "Rent record issue",
                    "Document upload issue",
                    "Agreement issue",
                    "Other",
                ],
            )
            message = st.text_area("Describe the issue")
            submitted = st.form_submit_button("Submit Report")

    if submitted:
        if not name.strip() or not email.strip() or not message.strip():
            st.error("Name, email, and issue details are required.")
            return
        matched_user = get_user_by_email(email.strip())
        user_id = matched_user["id"] if matched_user else None
        admin_id = None
        if matched_user:
            if matched_user["role"] == ROLE_ADMIN:
                admin_id = matched_user["id"]
            elif matched_user["role"] == ROLE_TENANT:
                admin_id = matched_user["admin_id"]
        run_query(
            """
            INSERT INTO trouble_reports (
                user_id, admin_id, name, email, role, category, message, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                admin_id,
                name.strip(),
                email.strip(),
                role,
                category,
                message.strip(),
                STATUS_PENDING,
                now_text(),
            ),
        )
        st.success("Trouble report submitted.")


def trouble_reports_page():
    user = current_user()
    if user["role"] == ROLE_MASTER:
        page_title("Trouble Reports", "All reported login, approval, rent, document, and agreement issues.")
        rows = run_query(
            """
            SELECT tr.id, tr.name, tr.email, tr.role, owner.name AS owner_admin,
                   tr.category, tr.message, tr.status, tr.created_at
            FROM trouble_reports tr
            LEFT JOIN users owner ON owner.id = tr.admin_id
            ORDER BY tr.created_at DESC
            """,
            fetch=True,
        )
    else:
        page_title("Trouble Reports", "Issues submitted by you or by tenants under your owner account.")
        rows = run_query(
            """
            SELECT tr.id, tr.name, tr.email, tr.role, owner.name AS owner_admin,
                   tr.category, tr.message, tr.status, tr.created_at
            FROM trouble_reports tr
            LEFT JOIN users owner ON owner.id = tr.admin_id
            WHERE tr.admin_id = ? OR tr.user_id = ?
            ORDER BY tr.created_at DESC
            """,
            (user["id"], user["id"]),
            fetch=True,
        )
    display_table(rows, "No trouble reports yet.")

    if rows:
        with st.expander("Update Trouble Report Status"):
            options = {
                f"#{row['id']} - {row['category']} - {row['email']} ({row['status']})": row["id"]
                for row in rows
            }
            selected = st.selectbox("Report", list(options.keys()))
            new_status = st.selectbox("Status", [STATUS_PENDING, "In Review", "Resolved", STATUS_REJECTED])
            if st.button("Update Report Status"):
                report_id = options[selected]
                if user["role"] == ROLE_MASTER:
                    run_query(
                        "UPDATE trouble_reports SET status = ? WHERE id = ?",
                        (new_status, report_id),
                    )
                else:
                    run_query(
                        "UPDATE trouble_reports SET status = ? WHERE id = ? AND (admin_id = ? OR user_id = ?)",
                        (new_status, report_id, user["id"], user["id"]),
                    )
                st.success("Report status updated.")
                st.rerun()


def master_dashboard():
    user = current_user()
    render_page_intro(
        "Master Admin Dashboard",
        "Central command view for monitoring admins, tenants, properties, agreements, uploaded documents, and rent records across the system.",
        "Control",
    )
    show_metrics(scoped_counts(user))

    approved_admin_rows = run_query(
        "SELECT id, name, email, status FROM users WHERE role = ? ORDER BY name",
        (ROLE_ADMIN,),
        fetch=True,
    )
    owner_filter_options = {"All owners": None}
    owner_filter_options.update(
        {
            f"{admin['name']} ({admin['email']})": admin["id"]
            for admin in approved_admin_rows
        }
    )
    owner_filter = st.selectbox(
        "Master Admin owner filter",
        list(owner_filter_options.keys()),
        help="Use this to inspect one admin's tenants, rent records, properties, agreements, and documents.",
    )
    selected_admin_id = owner_filter_options[owner_filter]

    pending_admins = run_query(
        "SELECT * FROM users WHERE role = ? AND status = ? ORDER BY created_at DESC",
        (ROLE_ADMIN, STATUS_PENDING),
        fetch=True,
    )
    if pending_admins:
        st.subheader("Pending Admin Approvals")
        pending_admin_rows = [
            dict(admin) | {"owner_name": None}
            for admin in pending_admins
        ]
        render_account_approval_rows(pending_admin_rows, "dash_pending_admin", allow_delete=False)
        st.divider()

    pending_tenants = run_query(
        """
        SELECT t.id, t.name, t.email, t.role, t.status, t.created_at, a.name AS owner_name
        FROM users t
        LEFT JOIN users a ON a.id = t.admin_id
        WHERE t.role = ? AND t.status = ?
        ORDER BY a.name, t.created_at DESC
        """,
        (ROLE_TENANT, STATUS_PENDING),
        fetch=True,
    )
    if pending_tenants:
        st.subheader("Pending Tenant Approvals")
        render_account_approval_rows(pending_tenants, "dash_pending_tenant", allow_delete=False)
        st.divider()

    st.subheader("Rent Overview")
    all_rent_rows = rent_records_for_admin(selected_admin_id)
    render_rent_summary(all_rent_rows)
    if all_rent_rows and selected_admin_id is None:
        st.subheader("Owner-wise Portfolio")
        render_admin_breakdown(all_rent_rows)

    tabs = st.tabs(["Admins", "Tenants by Admin", "Properties", "Agreements", "Documents", "Rent Records"])
    with tabs[0]:
        rows = run_query(
            "SELECT id, name, email, status, created_at FROM users WHERE role = ? ORDER BY created_at DESC",
            (ROLE_ADMIN,),
            fetch=True,
        )
        display_table(rows, "No owner accounts yet.")
        delete_record_selector(
            "Delete Admin Account",
            rows,
            lambda row: f"{row['name']} - {row['email']} ({row['status']})",
            delete_admin,
            "master_admin",
        )
    with tabs[1]:
        if selected_admin_id:
            rows = run_query(
                """
                SELECT t.id, a.name AS admin_owner, t.name, t.email, t.status, t.created_at
                FROM users t
                LEFT JOIN users a ON a.id = t.admin_id
                WHERE t.role = ? AND t.admin_id = ?
                ORDER BY a.name, t.name
                """,
                (ROLE_TENANT, selected_admin_id),
                fetch=True,
            )
        else:
            rows = run_query(
                """
                SELECT t.id, a.name AS admin_owner, t.name, t.email, t.status, t.created_at
                FROM users t
                LEFT JOIN users a ON a.id = t.admin_id
                WHERE t.role = ?
                ORDER BY a.name, t.name
                """,
                (ROLE_TENANT,),
                fetch=True,
            )
        display_table(rows, "No tenants yet.")
        delete_record_selector(
            "Delete Tenant Account",
            rows,
            lambda row: f"{row['name']} - {row['email']} ({row['admin_owner'] or 'No owner'})",
            lambda tenant_id: delete_tenant(tenant_id),
            "master_tenant",
        )
    with tabs[2]:
        if selected_admin_id:
            rows = run_query(
                """
                SELECT p.id, p.name, p.address, p.room_number, p.status,
                       owner.name AS owner, tenant.name AS tenant, p.created_at
                FROM properties p
                JOIN users owner ON owner.id = p.admin_id
                LEFT JOIN users tenant ON tenant.id = p.tenant_id
                WHERE p.admin_id = ?
                ORDER BY p.created_at DESC
                """,
                (selected_admin_id,),
                fetch=True,
            )
        else:
            rows = run_query(
                """
                SELECT p.id, p.name, p.address, p.room_number, p.status,
                       owner.name AS owner, tenant.name AS tenant, p.created_at
                FROM properties p
                JOIN users owner ON owner.id = p.admin_id
                LEFT JOIN users tenant ON tenant.id = p.tenant_id
                ORDER BY p.created_at DESC
                """,
                fetch=True,
            )
        display_table(rows, "No properties yet.")
        delete_record_selector(
            "Delete Property",
            rows,
            lambda row: f"{row['name']} - {row['address']} ({row['owner']})",
            lambda property_id: delete_property(property_id),
            "master_property",
        )
    with tabs[3]:
        if selected_admin_id:
            rows = run_query(
                """
                SELECT a.id, tenant.name AS tenant, owner.name AS owner, p.name AS property,
                       a.start_date, a.end_date, a.rent_amount_info, a.deposit_amount_info,
                       a.status, a.accepted_at, a.created_at
                FROM agreements a
                JOIN users tenant ON tenant.id = a.tenant_id
                JOIN users owner ON owner.id = a.admin_id
                JOIN properties p ON p.id = a.property_id
                WHERE a.admin_id = ?
                ORDER BY a.created_at DESC
                """,
                (selected_admin_id,),
                fetch=True,
            )
        else:
            rows = run_query(
                """
                SELECT a.id, tenant.name AS tenant, owner.name AS owner, p.name AS property,
                       a.start_date, a.end_date, a.rent_amount_info, a.deposit_amount_info,
                       a.status, a.accepted_at, a.created_at
                FROM agreements a
                JOIN users tenant ON tenant.id = a.tenant_id
                JOIN users owner ON owner.id = a.admin_id
                JOIN properties p ON p.id = a.property_id
                ORDER BY a.created_at DESC
                """,
                fetch=True,
            )
        display_table(rows, "No agreements yet.")
        delete_record_selector(
            "Delete Agreement",
            rows,
            lambda row: f"{row['tenant']} - {row['property']} ({row['status']})",
            lambda agreement_id: delete_agreement(agreement_id),
            "master_agreement",
        )
    with tabs[4]:
        if selected_admin_id:
            rows = run_query(
                """
                SELECT d.id, tenant.name AS tenant, owner.name AS owner, d.file_name,
                       d.file_type, d.status, d.rejection_reason, d.created_at
                FROM documents d
                JOIN users tenant ON tenant.id = d.tenant_id
                JOIN users owner ON owner.id = d.admin_id
                WHERE d.admin_id = ?
                ORDER BY d.created_at DESC
                """,
                (selected_admin_id,),
                fetch=True,
            )
        else:
            rows = run_query(
                """
                SELECT d.id, tenant.name AS tenant, owner.name AS owner, d.file_name,
                       d.file_type, d.status, d.rejection_reason, d.created_at
                FROM documents d
                JOIN users tenant ON tenant.id = d.tenant_id
                JOIN users owner ON owner.id = d.admin_id
                ORDER BY d.created_at DESC
                """,
                fetch=True,
            )
        display_table(rows, "No uploaded documents yet.")
        delete_record_selector(
            "Delete Document",
            rows,
            lambda row: f"{row['tenant']} - {row['file_name']} ({row['status']})",
            lambda document_id: delete_document(document_id),
            "master_document",
        )
    with tabs[5]:
        display_table(all_rent_rows, "No rent records yet.")
        delete_record_selector(
            "Delete Rent Record",
            all_rent_rows,
            lambda row: f"{row['admin']} / {row['tenant']} / {row['rent_month']} ({row['status']})",
            lambda rent_id: run_query("DELETE FROM rent_records WHERE id = ?", (rent_id,)),
            "master_rent",
        )


def account_approval_page():
    page_title("Account Approvals", "Master Admin can approve or reject owner and tenant accounts.")
    admin_rows = run_query(
        """
        SELECT id, name, email, role, status, created_at, NULL AS owner_name
        FROM users
        WHERE role = ?
        ORDER BY status = ? DESC, created_at DESC
        """,
        (ROLE_ADMIN, STATUS_PENDING),
        fetch=True,
    )
    tenant_rows = run_query(
        """
        SELECT t.id, t.name, t.email, t.role, t.status, t.created_at, a.name AS owner_name
        FROM users t
        LEFT JOIN users a ON a.id = t.admin_id
        WHERE t.role = ?
        ORDER BY t.status = ? DESC, a.name, t.created_at DESC
        """,
        (ROLE_TENANT, STATUS_PENDING),
        fetch=True,
    )
    tabs = st.tabs(["Admin / Owner Accounts", "Tenant Accounts"])
    with tabs[0]:
        render_account_approval_rows(admin_rows, "master_admin_account", allow_delete=True)
    with tabs[1]:
        render_account_approval_rows(tenant_rows, "master_tenant_account", allow_delete=True)


def tenant_approval_page():
    user = current_user()
    page_title("Tenant Approvals", "Approve or reject tenant signups linked to your owner account.")
    tenant_rows = run_query(
        """
        SELECT id, name, email, role, status, created_at, NULL AS owner_name
        FROM users
        WHERE role = ? AND admin_id = ?
        ORDER BY status = ? DESC, created_at DESC
        """,
        (ROLE_TENANT, user["id"], STATUS_PENDING),
        fetch=True,
    )
    render_account_approval_rows(tenant_rows, f"admin_{user['id']}_tenant_account", allow_delete=True)


def admin_dashboard():
    user = current_user()
    render_page_intro(
        "Admin Dashboard",
        "Manage your rental records, tenant assignments, agreements, rent monitoring, and document verification from one clean workspace.",
        "Owner",
    )
    show_metrics(scoped_counts(user))
    pending_tenants = run_query(
        """
        SELECT id, name, email, role, status, created_at, NULL AS owner_name
        FROM users
        WHERE role = ? AND admin_id = ? AND status = ?
        ORDER BY created_at DESC
        """,
        (ROLE_TENANT, user["id"], STATUS_PENDING),
        fetch=True,
    )
    if pending_tenants:
        st.subheader("Pending Tenant Signups")
        render_account_approval_rows(pending_tenants, f"dashboard_admin_{user['id']}_tenant", allow_delete=False)
    st.subheader("Your Rent Collection Summary")
    render_rent_summary(rent_records_for_admin(user["id"]))

    rows = run_query(
        """
        SELECT t.id, t.name, t.email,
               p.name AS property,
               COALESCE(a.status, 'Not Created') AS agreement_status,
               COALESCE(d.status, 'Not Uploaded') AS document_status
        FROM users t
        LEFT JOIN properties p ON p.tenant_id = t.id
        LEFT JOIN agreements a ON a.id = (
            SELECT id FROM agreements
            WHERE tenant_id = t.id
            ORDER BY created_at DESC, id DESC LIMIT 1
        )
        LEFT JOIN documents d ON d.id = (
            SELECT id FROM documents
            WHERE tenant_id = t.id
            ORDER BY created_at DESC, id DESC LIMIT 1
        )
        WHERE t.role = ? AND t.admin_id = ?
        ORDER BY t.created_at DESC
        """,
        (ROLE_TENANT, user["id"]),
        fetch=True,
    )
    data = []
    for row in rows:
        score = readiness_score(row["id"])
        data.append(
            {
                "tenant": row["name"],
                "email": row["email"],
                "property": row["property"] or "Unassigned",
                "agreement_status": row["agreement_status"],
                "document_status": row["document_status"],
                "readiness_score": score["score"],
                "readiness_status": score["label"],
            }
        )
    if data:
        st.subheader("Tenant Readiness")
        st.dataframe(pd.DataFrame(data), use_container_width=True, hide_index=True)
        delete_record_selector(
            "Delete Tenant Account",
            rows,
            lambda row: f"{row['name']} - {row['email']}",
            lambda tenant_id: delete_tenant(tenant_id, user["id"]),
            "admin_dash_tenant",
        )
    else:
        st.info("Add tenants to start tracking readiness.")


def add_property_page():
    user = current_user()
    page_title("Add Property", "Create a property and assign it when ready.")
    with st.form("property_form"):
        name = st.text_input("Property name")
        address = st.text_area("Property address")
        room_number = st.text_input("Room number")
        submitted = st.form_submit_button("Add Property")
    if submitted:
        if not name.strip() or not address.strip():
            st.error("Property name and address are required.")
            return
        run_query(
            """
            INSERT INTO properties (admin_id, tenant_id, name, address, room_number, status, created_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?)
            """,
            (user["id"], name.strip(), address.strip(), room_number.strip(), "Vacant", now_text()),
        )
        st.success("Property added.")

    st.subheader("Assign Tenant to Property")
    tenants = run_query(
        "SELECT id, name, email FROM users WHERE role = ? AND admin_id = ? AND status = ? ORDER BY name",
        (ROLE_TENANT, user["id"], STATUS_APPROVED),
        fetch=True,
    )
    properties = run_query(
        "SELECT id, name, address, room_number, tenant_id FROM properties WHERE admin_id = ? ORDER BY created_at DESC",
        (user["id"],),
        fetch=True,
    )
    if not tenants or not properties:
        st.info("Add at least one tenant and one property to assign.")
    else:
        tenant_options = {f"{t['name']} ({t['email']})": t["id"] for t in tenants}
        property_options = {
            f"{p['name']} - {p['room_number'] or 'No room'}": p["id"] for p in properties
        }
        with st.form("assign_property_form"):
            property_choice = st.selectbox("Property", list(property_options.keys()))
            tenant_choice = st.selectbox("Tenant", list(tenant_options.keys()))
            assign = st.form_submit_button("Assign Tenant")
        if assign:
            tenant_id = tenant_options[tenant_choice]
            run_query(
                "UPDATE properties SET tenant_id = NULL, status = ? WHERE admin_id = ? AND tenant_id = ?",
                ("Vacant", user["id"], tenant_id),
            )
            run_query(
                "UPDATE properties SET tenant_id = ?, status = ? WHERE id = ? AND admin_id = ?",
                (tenant_id, "Occupied", property_options[property_choice], user["id"]),
            )
            st.success("Tenant assigned to property.")

    rows = run_query(
        """
        SELECT p.id, p.name, p.address, p.room_number, p.status, t.name AS tenant, p.created_at
        FROM properties p
        LEFT JOIN users t ON t.id = p.tenant_id
        WHERE p.admin_id = ?
        ORDER BY p.created_at DESC
        """,
        (user["id"],),
        fetch=True,
    )
    display_table(rows, "No properties yet.")
    delete_record_selector(
        "Delete Property",
        rows,
        lambda row: f"{row['name']} - {row['address']}",
        lambda property_id: delete_property(property_id, user["id"]),
        "admin_property",
    )


def add_tenant_page():
    user = current_user()
    page_title("Add Tenant", "Create a tenant login for your rental workflow.")
    with st.form("tenant_form"):
        name = st.text_input("Tenant name")
        email = st.text_input("Tenant email")
        password = st.text_input("Initial password", type="password")
        submitted = st.form_submit_button("Add Tenant")
    if submitted:
        if not name.strip() or not email.strip() or not password:
            st.error("Tenant name, email, and initial password are required.")
            return
        if len(password) < 8:
            st.error("Use at least 8 characters for the initial password.")
            return
        if get_user_by_email(email.strip()):
            st.error("An account with this email already exists.")
            return
        run_query(
            """
            INSERT INTO users (name, email, password_hash, role, status, admin_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name.strip(),
                email.strip(),
                hash_password(password),
                ROLE_TENANT,
                STATUS_APPROVED,
                user["id"],
                now_text(),
            ),
        )
        st.success("Tenant added. Share the email and initial password with the tenant.")

    rows = run_query(
        """
        SELECT id, name, email, status, created_at
        FROM users
        WHERE role = ? AND admin_id = ?
        ORDER BY created_at DESC
        """,
        (ROLE_TENANT, user["id"]),
        fetch=True,
    )
    display_table(rows, "No tenants yet.")
    delete_record_selector(
        "Delete Tenant Account",
        rows,
        lambda row: f"{row['name']} - {row['email']}",
        lambda tenant_id: delete_tenant(tenant_id, user["id"]),
        "admin_tenant",
    )


def create_agreement_page():
    user = current_user()
    page_title("Create Agreement", "Send a simple rule-based rental agreement.")
    rows = run_query(
        """
        SELECT t.id AS tenant_id, t.name AS tenant_name, t.email,
               p.id AS property_id, p.name AS property_name, p.address
        FROM users t
        JOIN properties p ON p.tenant_id = t.id
        WHERE t.role = ? AND t.admin_id = ? AND p.admin_id = ? AND t.status = ?
        ORDER BY t.name
        """,
        (ROLE_TENANT, user["id"], user["id"], STATUS_APPROVED),
        fetch=True,
    )
    if not rows:
        st.info("Assign a tenant to a property before creating an agreement.")
        return

    options = {
        f"{r['tenant_name']} - {r['property_name']}": dict(r)
        for r in rows
    }
    with st.form("agreement_form"):
        selected = st.selectbox("Tenant and property", list(options.keys()))
        start_date = st.date_input("Start date")
        end_date = st.date_input("End date")
        rent_amount = st.number_input("Rent amount as information only", min_value=0.0, step=500.0)
        deposit_amount = st.number_input("Deposit amount as information only", min_value=0.0, step=500.0)
        notice_period = st.text_input("Notice period", value="30 days")
        house_rules = st.text_area("House rules", value="Keep the property clean and avoid disturbance after 10 PM.")
        submitted = st.form_submit_button("Create Agreement")

    if submitted:
        if end_date <= start_date:
            st.error("End date must be after start date.")
            return
        selected_row = options[selected]
        run_query(
            """
            INSERT INTO agreements (
                admin_id, tenant_id, property_id, start_date, end_date,
                rent_amount_info, deposit_amount_info, house_rules,
                notice_period, status, accepted_at, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
            """,
            (
                user["id"],
                selected_row["tenant_id"],
                selected_row["property_id"],
                start_date.isoformat(),
                end_date.isoformat(),
                rent_amount,
                deposit_amount,
                house_rules.strip(),
                notice_period.strip(),
                "Sent",
                now_text(),
            ),
        )
        st.success("Agreement created and sent to tenant.")

    agreements = run_query(
        """
        SELECT a.id, tenant.name AS tenant, p.name AS property, a.start_date, a.end_date,
               a.rent_amount_info, a.deposit_amount_info, a.notice_period, a.status, a.created_at
        FROM agreements a
        JOIN users tenant ON tenant.id = a.tenant_id
        JOIN properties p ON p.id = a.property_id
        WHERE a.admin_id = ?
        ORDER BY a.created_at DESC
        """,
        (user["id"],),
        fetch=True,
    )
    display_table(agreements, "No agreements created yet.")
    delete_record_selector(
        "Delete Agreement",
        agreements,
        lambda row: f"{row['tenant']} - {row['property']} ({row['status']})",
        lambda agreement_id: delete_agreement(agreement_id, user["id"]),
        "admin_agreement",
    )


def rent_monitoring_page():
    user = current_user()
    page_title("Rent Monitoring", "Track monthly rent status for your own tenants only.")
    rows = rent_records_for_admin(user["id"])
    render_rent_summary(rows)

    tenants = run_query(
        """
        SELECT t.id, t.name, t.email, p.id AS property_id, p.name AS property_name
        FROM users t
        LEFT JOIN properties p ON p.tenant_id = t.id AND p.admin_id = ?
        WHERE t.role = ? AND t.admin_id = ? AND t.status = ?
        ORDER BY t.name
        """,
        (user["id"], ROLE_TENANT, user["id"], STATUS_APPROVED),
        fetch=True,
    )
    if tenants:
        st.subheader("Add Monthly Rent Record")
        tenant_options = {
            f"{t['name']} ({t['email']}) - {t['property_name'] or 'No property'}": dict(t)
            for t in tenants
        }
        with st.form("rent_record_form"):
            selected = st.selectbox("Tenant", list(tenant_options.keys()))
            rent_month = st.text_input("Rent month", value=datetime.now().strftime("%Y-%m"))
            due_amount = st.number_input("Due amount", min_value=0.0, step=500.0, value=25000.0)
            paid_amount = st.number_input("Paid amount", min_value=0.0, step=500.0, value=0.0)
            due_date = st.date_input("Due date")
            paid_on = st.date_input("Paid on")
            status = st.selectbox("Status", ["Pending", "Paid", "Partial", "Overdue"])
            notes = st.text_area("Notes")
            submitted = st.form_submit_button("Save Rent Record")
        if submitted:
            chosen = tenant_options[selected]
            paid_on_value = paid_on.isoformat() if status in ["Paid", "Partial"] and paid_amount > 0 else None
            run_query(
                """
                INSERT INTO rent_records (
                    admin_id, tenant_id, property_id, rent_month, due_amount,
                    paid_amount, due_date, paid_on, status, notes, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user["id"],
                    chosen["id"],
                    chosen["property_id"],
                    rent_month.strip(),
                    due_amount,
                    paid_amount,
                    due_date.isoformat(),
                    paid_on_value,
                    status,
                    notes.strip(),
                    now_text(),
                ),
            )
            st.success("Rent record saved.")
            st.rerun()
    else:
        st.info("Add tenants before creating rent records.")

    st.subheader("Detailed Rent Records")
    display_table(rows, "No rent records yet.")
    if rows:
        update_options = {
            f"{r['tenant']} / {r['rent_month']} / {r['status']} / balance {r['balance_amount']:.0f}": dict(r)
            for r in rows
        }
        with st.expander("Update Rent Status"):
            selected = st.selectbox("Rent record", list(update_options.keys()), key="update_rent_select")
            record = update_options[selected]
            with st.form("update_rent_form"):
                paid_amount = st.number_input(
                    "Paid amount",
                    min_value=0.0,
                    step=500.0,
                    value=float(record["paid_amount"]),
                )
                status = st.selectbox(
                    "Status",
                    ["Pending", "Paid", "Partial", "Overdue"],
                    index=["Pending", "Paid", "Partial", "Overdue"].index(record["status"]),
                )
                notes = st.text_area("Notes", value=record["notes"] or "")
                saved = st.form_submit_button("Update Record")
            if saved:
                paid_on = now_text() if status in ["Paid", "Partial"] and paid_amount > 0 else None
                run_query(
                    """
                    UPDATE rent_records
                    SET paid_amount = ?, status = ?, paid_on = ?, notes = ?
                    WHERE id = ? AND admin_id = ?
                    """,
                    (paid_amount, status, paid_on, notes.strip(), record["id"], user["id"]),
                )
                st.success("Rent record updated.")
                st.rerun()
        delete_record_selector(
            "Delete Rent Record",
            rows,
            lambda row: f"{row['tenant']} / {row['rent_month']} ({row['status']})",
            lambda rent_id: run_query("DELETE FROM rent_records WHERE id = ? AND admin_id = ?", (rent_id, user["id"])),
            "admin_rent",
        )


def document_verification_page():
    user = current_user()
    page_title("Document Verification", "Review tenant ID proof uploads.")
    docs = run_query(
        """
        SELECT d.*, t.name AS tenant_name, t.email AS tenant_email
        FROM documents d
        JOIN users t ON t.id = d.tenant_id
        WHERE d.admin_id = ?
        ORDER BY d.created_at DESC
        """,
        (user["id"],),
        fetch=True,
    )
    if not docs:
        st.info("No tenant documents uploaded yet.")
        return

    for doc in docs:
        status = doc["status"]
        score = readiness_score(doc["tenant_id"])
        card(
            f"{doc['tenant_name']} - {status}",
            [
                ("Email", doc["tenant_email"]),
                ("File", doc["file_name"]),
                ("Uploaded", doc["created_at"]),
                ("Readiness", f"{score['score']} / 100 ({score['label']})"),
                ("Rejection reason", doc["rejection_reason"] or "None"),
            ],
            warn=status == STATUS_REJECTED,
        )

        if Path(doc["file_path"]).exists():
            with open(doc["file_path"], "rb") as file:
                st.download_button(
                    "Download Document",
                    data=file.read(),
                    file_name=doc["file_name"],
                    mime="application/octet-stream",
                    key=f"download_doc_{doc['id']}",
                )
        else:
            st.warning("The uploaded file is missing from local storage.")

        with st.form(f"verify_doc_{doc['id']}"):
            reason = st.text_input("Rejection reason", key=f"reason_{doc['id']}")
            col1, col2 = st.columns(2)
            approve = col1.form_submit_button("Approve")
            reject = col2.form_submit_button("Reject")
        if approve:
            run_query(
                "UPDATE documents SET status = ?, rejection_reason = NULL WHERE id = ? AND admin_id = ?",
                (STATUS_APPROVED, doc["id"], user["id"]),
            )
            st.rerun()
        if reject:
            run_query(
                "UPDATE documents SET status = ?, rejection_reason = ? WHERE id = ? AND admin_id = ?",
                (STATUS_REJECTED, reason.strip() or "Document was rejected by owner.", doc["id"], user["id"]),
            )
            st.rerun()
        confirm_delete = st.checkbox(
            "Confirm document delete",
            key=f"confirm_delete_doc_{doc['id']}",
        )
        if st.button(
            "Delete Document",
            key=f"delete_doc_{doc['id']}",
            disabled=not confirm_delete,
        ):
            delete_document(doc["id"], user["id"])
            st.rerun()
        st.divider()


def tenant_dashboard():
    user = current_user()
    render_page_intro(
        "Tenant Dashboard",
        "View your rental information, accept your agreement, upload ID proof, and track your readiness status.",
        "Portal",
    )
    score = readiness_score(user["id"])
    property_row = run_query(
        """
        SELECT p.name, p.address, p.room_number, owner.name AS owner_name
        FROM properties p
        JOIN users owner ON owner.id = p.admin_id
        WHERE p.tenant_id = ?
        ORDER BY p.created_at DESC
        LIMIT 1
        """,
        (user["id"],),
        one=True,
    )
    render_readiness_card(score)
    cols = st.columns(2)
    cols[0].metric("Agreement", score["agreement_status"])
    cols[1].metric("Document", score["document_status"])

    if property_row:
        card(
            "Assigned Property",
            [
                ("Property", property_row["name"]),
                ("Address", property_row["address"]),
                ("Room", property_row["room_number"] or "Not specified"),
                ("Owner", property_row["owner_name"]),
            ],
        )
    else:
        st.info("No property assigned yet.")

    summary = smart_summary(user["id"])
    if summary:
        st.subheader("Smart Agreement Summary")
        card("Summary", summary)

    rent_rows = run_query(
        """
        SELECT rent_month, due_amount, paid_amount,
               (due_amount - paid_amount) AS balance_amount,
               due_date, paid_on, status, notes
        FROM rent_records
        WHERE tenant_id = ?
        ORDER BY rent_month DESC
        """,
        (user["id"],),
        fetch=True,
    )
    st.subheader("My Rent Records")
    display_table(rent_rows, "No rent records yet.")


def smart_summary(tenant_id):
    agreement = get_latest_agreement(tenant_id)
    if not agreement:
        return None
    score = readiness_score(tenant_id)
    start = datetime.fromisoformat(agreement["start_date"]).date()
    end = datetime.fromisoformat(agreement["end_date"]).date()
    stay_duration = f"{(end - start).days} days"
    return [
        ("Tenant name", agreement["tenant_name"]),
        ("Property address", agreement["property_address"]),
        ("Stay duration", stay_duration),
        ("Notice period", agreement["notice_period"] or "Not specified"),
        ("Agreement status", score["agreement_status"]),
        ("Document status", score["document_status"]),
        ("Rental readiness score", f"{score['score']} / 100 ({score['label']})"),
    ]


def my_agreement_page():
    user = current_user()
    page_title("My Agreement", "Review and accept your rental agreement.")
    agreement = get_latest_agreement(user["id"])
    if not agreement:
        st.info("No agreement has been sent yet.")
        return

    card(
        "Rental Agreement",
        [
            ("Tenant", agreement["tenant_name"]),
            ("Property", agreement["property_name"]),
            ("Address", agreement["property_address"]),
            ("Start date", agreement["start_date"]),
            ("End date", agreement["end_date"]),
            ("Rent amount", f"{agreement['rent_amount_info']:.2f}"),
            ("Deposit amount", f"{agreement['deposit_amount_info']:.2f}"),
            ("Notice period", agreement["notice_period"] or "Not specified"),
            ("Status", agreement["status"]),
        ],
    )
    st.subheader("House Rules")
    st.write(agreement["house_rules"] or "No house rules added.")

    if agreement["status"] != "Accepted":
        if st.button("Accept Agreement"):
            run_query(
                "UPDATE agreements SET status = ?, accepted_at = ? WHERE id = ? AND tenant_id = ?",
                ("Accepted", now_text(), agreement["id"], user["id"]),
            )
            st.success("Agreement accepted.")
            st.rerun()
    else:
        st.success(f"Accepted on {agreement['accepted_at']}.")

    summary = smart_summary(user["id"])
    if summary:
        st.subheader("Smart Agreement Summary")
        card("Summary", summary)


def upload_document_page():
    user = current_user()
    page_title("Upload Document", "Upload one ID proof file for verification.")
    latest = get_latest_document(user["id"])
    if latest:
        card(
            "Current ID Proof",
            [
                ("File", latest["file_name"]),
                ("Status", latest["status"]),
                ("Uploaded", latest["created_at"]),
                ("Rejection reason", latest["rejection_reason"] or "None"),
            ],
            warn=latest["status"] == STATUS_REJECTED,
        )

    admin_id = user["admin_id"]
    if not admin_id:
        st.error("Your tenant account is not connected to an owner.")
        return

    with st.form("document_upload_form"):
        uploaded = st.file_uploader("ID proof", type=["pdf", "jpg", "jpeg", "png"])
        submitted = st.form_submit_button("Upload ID Proof")

    if submitted:
        if uploaded is None:
            st.error("Choose a PDF, JPG, JPEG, or PNG file first.")
            return
        size_mb = uploaded.size / (1024 * 1024)
        if size_mb > 10:
            st.error("File size must be 10 MB or less.")
            return
        file_type = uploaded.name.split(".")[-1].lower()
        clean_original = Path(uploaded.name).name.replace("/", "_").replace("\\", "_")
        safe_name = f"tenant_{user['id']}_{int(datetime.now().timestamp())}_{clean_original}"
        file_path = UPLOAD_DIR / safe_name
        with open(file_path, "wb") as out:
            out.write(uploaded.getbuffer())
        run_query(
            """
            INSERT INTO documents (
                admin_id, tenant_id, file_name, file_path, file_type,
                status, rejection_reason, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
            """,
            (
                admin_id,
                user["id"],
                uploaded.name,
                str(file_path),
                file_type,
                STATUS_PENDING,
                now_text(),
            ),
        )
        st.success("Document uploaded. Verification is now pending.")
        st.rerun()


def my_rent_page():
    user = current_user()
    page_title("My Rent", "Your monthly rent records and payment status.")
    rows = run_query(
        """
        SELECT rr.rent_month, p.name AS property, rr.due_amount, rr.paid_amount,
               (rr.due_amount - rr.paid_amount) AS balance_amount,
               rr.due_date, rr.paid_on, rr.status, rr.notes
        FROM rent_records rr
        LEFT JOIN properties p ON p.id = rr.property_id
        WHERE rr.tenant_id = ?
        ORDER BY rr.rent_month DESC
        """,
        (user["id"],),
        fetch=True,
    )
    df = to_df(rows)
    if df.empty:
        st.info("No rent records yet.")
        return
    cols = st.columns(3)
    cols[0].metric("Total Due", f"{df['due_amount'].sum():,.0f}")
    cols[1].metric("Paid", f"{df['paid_amount'].sum():,.0f}")
    cols[2].metric("Balance", f"{df['balance_amount'].sum():,.0f}")
    st.dataframe(df, use_container_width=True, hide_index=True)


def logout_button():
    user = current_user()
    if not user:
        return
    st.sidebar.write(f"Signed in as **{user['name']}**")
    st.sidebar.caption(user["role"])
    if st.sidebar.button("Logout"):
        st.session_state.clear()
        st.rerun()


def navigation_for(user):
    if not user:
        return ["Login", "Create New Account", "Forgot Password", "Report Trouble"]
    if user["role"] == ROLE_MASTER:
        return ["Master Dashboard", "Account Approvals", "Trouble Reports", "Report Trouble"]
    if user["role"] == ROLE_ADMIN:
        return [
            "Admin Dashboard",
            "Tenant Approvals",
            "Add Property",
            "Add Tenant",
            "Create Agreement",
            "Rent Monitoring",
            "Document Verification",
            "Trouble Reports",
            "Report Trouble",
        ]
    return ["Tenant Dashboard", "My Agreement", "My Rent", "Upload Document", "Report Trouble"]


def main():
    init_db()
    inject_luxury_css()

    user = current_user()
    render_sidebar_brand(user)
    logout_button()
    pages = navigation_for(user)
    default_index = 0
    page = st.sidebar.radio("Navigation", pages, index=default_index)
    st.sidebar.divider()
    st.sidebar.caption("Created and Developed by Tejas R U")

    if page == "Login":
        login_page()
    elif page in ["Signup", "Create New Account"]:
        signup_page()
    elif page == "Forgot Password":
        forgot_password_page()
    elif page == "Report Trouble":
        report_trouble_page()
    elif page == "Master Dashboard":
        master_dashboard()
    elif page in ["Admin Approval", "Approve Admins", "Account Approvals"]:
        account_approval_page()
    elif page == "Trouble Reports":
        trouble_reports_page()
    elif page == "Admin Dashboard":
        admin_dashboard()
    elif page == "Tenant Approvals":
        tenant_approval_page()
    elif page == "Add Property":
        add_property_page()
    elif page == "Add Tenant":
        add_tenant_page()
    elif page == "Create Agreement":
        create_agreement_page()
    elif page == "Rent Monitoring":
        rent_monitoring_page()
    elif page == "Document Verification":
        document_verification_page()
    elif page == "Tenant Dashboard":
        tenant_dashboard()
    elif page == "My Agreement":
        my_agreement_page()
    elif page == "My Rent":
        my_rent_page()
    elif page == "Upload Document":
        upload_document_page()

    render_footer()


if __name__ == "__main__":
    main()
