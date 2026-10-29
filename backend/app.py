from __future__ import annotations

import math
import os
import secrets
import sqlite3
import uuid
from datetime import date, datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from typing import Any, Callable

from dotenv import load_dotenv
from flask import Flask, abort, g, jsonify, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BACKEND_DIR / "instance"
DIST_DIR = ROOT / "dist"

load_dotenv(ROOT / ".env")


def session_secret() -> str:
    configured_secret = os.getenv("FLASK_SECRET_KEY")
    if configured_secret:
        return configured_secret
    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
    secret_file = INSTANCE_DIR / ".session_secret"
    try:
        return secret_file.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        value = secrets.token_urlsafe(48)
        try:
            with secret_file.open("x", encoding="utf-8") as file:
                file.write(value)
        except FileExistsError:
            return secret_file.read_text(encoding="utf-8").strip()
        return value


app = Flask(__name__, static_folder=None)
app.config.update(
    DATABASE=os.getenv("ZUBA_DATABASE_PATH", str(INSTANCE_DIR / "zuba.db")),
    SECRET_KEY=session_secret(),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("FLASK_COOKIE_SECURE", "").lower() == "true",
    PERMANENT_SESSION_LIFETIME=timedelta(days=14),
)

DEFAULT_SETTINGS = {
    "theme": "system",
    "tariffZmw": 2.5,
    "openWeatherApiKey": "",
    "hasDismissedWelcomeGuide": True,
}


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        connection = sqlite3.connect(app.config["DATABASE"], timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        g.db = connection
    return g.db


@app.teardown_appcontext
def close_db(_error: BaseException | None = None) -> None:
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def init_db() -> None:
    database_path = Path(app.config["DATABASE"])
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript((BACKEND_DIR / "schema.sql").read_text(encoding="utf-8"))
        configured_email = os.getenv("ZUBA_ADMIN_EMAIL", "").strip().lower()
        configured_password = os.getenv("ZUBA_ADMIN_PASSWORD", "")
        if configured_email and configured_password:
            row = connection.execute(
                "SELECT id, role FROM users WHERE email = ? COLLATE NOCASE",
                (configured_email,),
            ).fetchone()
            if row is None:
                admin_id = f"usr_{uuid.uuid4().hex}"
                connection.execute(
                    """INSERT INTO users (id, name, email, password_hash, role, created_at)
                       VALUES (?, ?, ?, ?, 'admin', ?)""",
                    (
                        admin_id,
                        os.getenv("ZUBA_ADMIN_NAME", "Zuba Administrator").strip() or "Zuba Administrator",
                        configured_email,
                        generate_password_hash(configured_password),
                        utc_now(),
                    ),
                )
                connection.execute(
                    "INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)",
                    (admin_id,),
                )
        connection.commit()
    finally:
        connection.close()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def json_body() -> dict[str, Any]:
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        abort(400, description="A JSON object is required.")
    return body


def required_text(value: Any, label: str, max_length: int = 200) -> str:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > max_length:
        abort(400, description=f"{label} is required and must be at most {max_length} characters.")
    return value.strip()


def bounded_number(value: Any, label: str, minimum: float, maximum: float) -> float:
    if isinstance(value, bool):
        abort(400, description=f"{label} must be a number.")
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        abort(400, description=f"{label} must be a number.")
    if not math.isfinite(parsed) or not minimum <= parsed <= maximum:
        abort(400, description=f"{label} must be between {minimum:g} and {maximum:g}.")
    return parsed


def bounded_integer(value: Any, label: str, minimum: int, maximum: int) -> int:
    parsed = bounded_number(value, label, minimum, maximum)
    if not parsed.is_integer():
        abort(400, description=f"{label} must be a whole number.")
    return int(parsed)


def serialize_user(user: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "isActive": bool(user["is_active"]),
        "createdAt": user["created_at"],
    }


def serialize_system(system: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": system["id"],
        "userId": system["user_id"],
        "name": system["name"],
        "systemClass": system["system_class"],
        "panelCount": system["panel_count"],
        "panelWattage": system["panel_wattage"],
        "capacityKwp": system["capacity_kwp"],
        "batteryCapacityKwh": system["battery_capacity_kwh"],
        "city": system["city"],
        "latitude": system["latitude"],
        "longitude": system["longitude"],
        "tilt": system["tilt"],
        "azimuth": system["azimuth"],
        "correctionFactor": system["correction_factor"],
        "isSimulated": bool(system["is_simulated"]),
        "apiKey": system["api_key"],
        "createdAt": system["created_at"],
    }


def serialize_log(log: sqlite3.Row) -> dict[str, Any]:
    total = log["total_day_generation_kwh"]
    evening = log["evening_remaining_kwh"]
    return {
        "id": log["id"],
        "systemId": log["system_id"],
        "date": log["date"],
        "totalDayGenerationKwh": total,
        "energyConsumedKwh": log["energy_consumed_kwh"],
        "eveningRemainingKwh": evening,
        "netKwh": log["net_kwh"],
        "predictedKwh": log["predicted_kwh"],
        "deltaKwh": log["delta_kwh"],
        "auditStatus": log["audit_status"],
        "note": log["note"],
        "morningReadingKwh": 0,
        "daytimeReadingKwh": total,
        "eveningReadingKwh": evening,
    }


def serialize_task(task: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": task["id"],
        "userId": task["user_id"],
        "systemId": task["system_id"] or "",
        "title": task["title"],
        "cycleDays": task["cycle_days"],
        "dueDate": task["due_date"],
        "isDone": bool(task["is_done"]),
        "lastCompletedAt": task["last_completed_at"],
    }


def get_current_user() -> sqlite3.Row | None:
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None or not user["is_active"]:
        session.clear()
        return None
    return user


def login_required(view: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(view)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        user = get_current_user()
        if user is None:
            return jsonify(error="Please sign in to continue."), 401
        g.user = user
        return view(*args, **kwargs)

    return wrapped


def admin_required(view: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(view)
    @login_required
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        if g.user["role"] != "admin":
            return jsonify(error="Administrator access is required."), 403
        return view(*args, **kwargs)

    return wrapped


def system_for_user(system_id: str, user: sqlite3.Row) -> sqlite3.Row | None:
    query = "SELECT * FROM systems WHERE id = ?"
    parameters: tuple[Any, ...] = (system_id,)
    if user["role"] != "admin":
        query += " AND user_id = ?"
        parameters = (system_id, user["id"])
    return get_db().execute(query, parameters).fetchone()


def settings_for_user(user_id: str) -> sqlite3.Row:
    database = get_db()
    database.execute("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)", (user_id,))
    return database.execute("SELECT * FROM user_settings WHERE user_id = ?", (user_id,)).fetchone()


def create_default_tasks(user_id: str) -> None:
    database = get_db()
    existing = database.execute(
        "SELECT 1 FROM maintenance_tasks WHERE user_id = ? LIMIT 1", (user_id,)
    ).fetchone()
    if existing:
        return
    today = date.today()
    tasks = [
        ("task_clean_panels", "Clean solar panels surface & remove dust", 30, 12),
        ("task_battery_terminals", "Inspect battery terminals & storage health", 60, 35),
        ("task_inverter_wiring", "Check inverter wiring & circuit breakers", 90, 72),
    ]
    for task_id, title, cycle_days, due_in_days in tasks:
        database.execute(
            """INSERT INTO maintenance_tasks
               (id, user_id, title, cycle_days, due_date, is_done)
               VALUES (?, ?, ?, ?, ?, 0)""",
            (
                f"{task_id}_{user_id}",
                user_id,
                title,
                cycle_days,
                (today + timedelta(days=due_in_days)).isoformat(),
            ),
        )


@app.before_request
def enforce_csrf_for_api_writes() -> tuple[Any, int] | None:
    if request.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        expected = session.get("csrf_token")
        submitted = request.headers.get("X-CSRF-Token")
        if not expected or not submitted or not secrets.compare_digest(expected, submitted):
            return jsonify(error="Your session expired. Refresh the page and try again."), 400
    return None


@app.after_request
def disable_api_caching(response: Any) -> Any:
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(413)
def handle_http_error(error: Any) -> Any:
    if request.path.startswith("/api/"):
        return jsonify(error=error.description), error.code
    return error


@app.errorhandler(sqlite3.Error)
def handle_database_error(error: sqlite3.Error) -> Any:
    app.logger.exception("SQLite request failed", exc_info=error)
    if request.path.startswith("/api/"):
        return jsonify(error="The database request failed. Please try again."), 500
    return "Database request failed.", 500


@app.get("/api/health")
def health() -> Any:
    get_db().execute("SELECT 1")
    return jsonify(status="ok", service="Zuba Solar API", database="SQLite")


@app.get("/api/session")
def current_session() -> Any:
    csrf_token = session.get("csrf_token")
    if not csrf_token:
        csrf_token = secrets.token_urlsafe(32)
        session["csrf_token"] = csrf_token
    user = get_current_user()
    return jsonify(user=serialize_user(user) if user else None, csrfToken=csrf_token)


@app.post("/api/auth/login")
def login() -> Any:
    body = json_body()
    email = required_text(body.get("email"), "Email", 254).lower()
    password = body.get("password")
    if not isinstance(password, str):
        abort(400, description="Password is required.")
    user = get_db().execute(
        "SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,)
    ).fetchone()
    if user is None or not user["is_active"] or not check_password_hash(user["password_hash"], password):
        return jsonify(error="Invalid email or password, or this account is inactive."), 401

    session.clear()
    session.permanent = True
    session["user_id"] = user["id"]
    session["csrf_token"] = secrets.token_urlsafe(32)
    return jsonify(user=serialize_user(user), csrfToken=session["csrf_token"])


@app.post("/api/auth/register")
def register() -> Any:
    body = json_body()
    name = required_text(body.get("name"), "Name", 120)
    email = required_text(body.get("email"), "Email", 254).lower()
    password = body.get("password")
    if "@" not in email:
        abort(400, description="Enter a valid email address.")
    if not isinstance(password, str) or len(password) < 8:
        abort(400, description="Choose a password with at least 8 characters.")

    user_id = new_id("usr")
    database = get_db()
    try:
        database.execute(
            """INSERT INTO users (id, name, email, password_hash, role, created_at)
               VALUES (?, ?, ?, ?, 'user', ?)""",
            (user_id, name, email, generate_password_hash(password), utc_now()),
        )
        database.execute("INSERT INTO user_settings (user_id) VALUES (?)", (user_id,))
        create_default_tasks(user_id)
        database.commit()
    except sqlite3.IntegrityError:
        database.rollback()
        return jsonify(error="An account with this email address already exists."), 409

    user = database.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    session.clear()
    session.permanent = True
    session["user_id"] = user_id
    session["csrf_token"] = secrets.token_urlsafe(32)
    return jsonify(user=serialize_user(user), csrfToken=session["csrf_token"]), 201


@app.post("/api/auth/logout")
def logout() -> Any:
    session.clear()
    return jsonify(ok=True)


@app.get("/api/bootstrap")
@login_required
def bootstrap() -> Any:
    database = get_db()
    user = g.user
    create_default_tasks(user["id"])
    database.commit()
    settings = settings_for_user(user["id"])

    if user["role"] == "admin":
        system_rows = database.execute("SELECT * FROM systems ORDER BY created_at DESC").fetchall()
        log_rows = database.execute(
            """SELECT meter_logs.* FROM meter_logs
               JOIN systems ON systems.id = meter_logs.system_id
               ORDER BY meter_logs.date DESC, meter_logs.created_at DESC"""
        ).fetchall()
        task_rows = database.execute(
            "SELECT * FROM maintenance_tasks ORDER BY due_date ASC"
        ).fetchall()
        user_rows = database.execute(
            "SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC"
        ).fetchall()
    else:
        system_rows = database.execute(
            "SELECT * FROM systems WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        ).fetchall()
        log_rows = database.execute(
            """SELECT meter_logs.* FROM meter_logs
               JOIN systems ON systems.id = meter_logs.system_id
               WHERE systems.user_id = ?
               ORDER BY meter_logs.date DESC, meter_logs.created_at DESC""",
            (user["id"],),
        ).fetchall()
        task_rows = database.execute(
            "SELECT * FROM maintenance_tasks WHERE user_id = ? ORDER BY due_date ASC",
            (user["id"],),
        ).fetchall()
        user_rows = []

    for task in task_rows:
        if task["is_done"] and task["last_completed_at"]:
            completed = datetime.fromisoformat(task["last_completed_at"])
            if datetime.now(timezone.utc) - completed.astimezone(timezone.utc) >= timedelta(days=task["cycle_days"]):
                due_date = (date.today() + timedelta(days=task["cycle_days"])).isoformat()
                database.execute(
                    """UPDATE maintenance_tasks
                       SET is_done = 0, due_date = ?, last_completed_at = NULL
                       WHERE id = ?""",
                    (due_date, task["id"]),
                )
    database.commit()
    if task_rows:
        if user["role"] == "admin":
            task_rows = database.execute(
                "SELECT * FROM maintenance_tasks ORDER BY due_date ASC"
            ).fetchall()
        else:
            task_rows = database.execute(
                "SELECT * FROM maintenance_tasks WHERE user_id = ? ORDER BY due_date ASC",
                (user["id"],),
            ).fetchall()

    tariff_row = database.execute(
        "SELECT setting_value FROM platform_settings WHERE setting_key = 'tariff_zmw'"
    ).fetchone()
    user_settings = {
        "theme": settings["theme"],
        "tariffZmw": float(tariff_row["setting_value"]) if tariff_row else DEFAULT_SETTINGS["tariffZmw"],
        "openWeatherApiKey": settings["open_weather_api_key"],
        "hasDismissedWelcomeGuide": bool(settings["has_dismissed_welcome_guide"]),
    }
    return jsonify(
        user=serialize_user(user),
        allUsers=[serialize_user(row) for row in user_rows],
        systems=[serialize_system(row) for row in system_rows],
        selectedSystemId=settings["selected_system_id"] or "",
        settings=user_settings,
        meterLogs=[serialize_log(row) for row in log_rows],
        maintenanceTasks=[serialize_task(row) for row in task_rows],
    )


@app.post("/api/systems")
@login_required
def add_system() -> Any:
    body = json_body()
    name = required_text(body.get("name"), "System name", 120)
    panel_count = bounded_integer(body.get("panelCount"), "Panel count", 1, 10000)
    panel_wattage = bounded_number(body.get("panelWattage", 450), "Panel wattage", 1, 5000)
    battery_capacity = bounded_number(body.get("batteryCapacityKwh"), "Battery capacity", 0.1, 50000)
    latitude = bounded_number(body.get("latitude"), "Latitude", -90, 90)
    longitude = bounded_number(body.get("longitude"), "Longitude", -180, 180)
    city = required_text(body.get("city"), "Location", 120)
    system_class = "Residential" if panel_count <= 8 else "Commercial" if panel_count <= 24 else "Industrial"
    system_id = new_id("sys")
    api_key = f"zb_key_{secrets.token_urlsafe(9)}"
    database = get_db()
    database.execute(
        """INSERT INTO systems
           (id, user_id, name, system_class, panel_count, panel_wattage, capacity_kwp,
            battery_capacity_kwh, city, latitude, longitude, tilt, azimuth,
            correction_factor, is_simulated, api_key, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)""",
        (
            system_id,
            g.user["id"],
            name,
            system_class,
            panel_count,
            panel_wattage,
            round(panel_count * panel_wattage / 1000, 2),
            battery_capacity,
            city,
            latitude,
            longitude,
            bounded_number(body.get("tilt", 15), "Tilt", 0, 90),
            bounded_number(body.get("azimuth", 0), "Azimuth", -180, 360),
            api_key,
            utc_now(),
        ),
    )
    settings_for_user(g.user["id"])
    database.execute(
        "UPDATE user_settings SET selected_system_id = ? WHERE user_id = ?",
        (system_id, g.user["id"]),
    )
    database.commit()
    system = database.execute("SELECT * FROM systems WHERE id = ?", (system_id,)).fetchone()
    return jsonify(system=serialize_system(system)), 201


@app.patch("/api/systems/<system_id>")
@login_required
def update_system(system_id: str) -> Any:
    system = system_for_user(system_id, g.user)
    if system is None:
        return jsonify(error="Solar system was not found."), 404
    body = json_body()
    allowed_fields: dict[str, tuple[str, Callable[[Any], Any]]] = {
        "name": ("name", lambda value: required_text(value, "System name", 120)),
        "city": ("city", lambda value: required_text(value, "Location", 120)),
        "latitude": ("latitude", lambda value: bounded_number(value, "Latitude", -90, 90)),
        "longitude": ("longitude", lambda value: bounded_number(value, "Longitude", -180, 180)),
        "batteryCapacityKwh": (
            "battery_capacity_kwh",
            lambda value: bounded_number(value, "Battery capacity", 0.1, 50000),
        ),
        "correctionFactor": (
            "correction_factor",
            lambda value: bounded_number(value, "Correction factor", 0.45, 1.65),
        ),
    }
    updates = [
        (column, validator(body[key]))
        for key, (column, validator) in allowed_fields.items()
        if key in body
    ]
    if not updates:
        abort(400, description="No supported system fields were provided.")
    assignments = ", ".join(f"{column} = ?" for column, _ in updates)
    values = [value for _, value in updates]
    values.append(system_id)
    get_db().execute(f"UPDATE systems SET {assignments} WHERE id = ?", values)
    get_db().commit()
    updated = get_db().execute("SELECT * FROM systems WHERE id = ?", (system_id,)).fetchone()
    return jsonify(system=serialize_system(updated))


@app.delete("/api/systems/<system_id>")
@login_required
def delete_system(system_id: str) -> Any:
    system = system_for_user(system_id, g.user)
    if system is None:
        return jsonify(error="Solar system was not found."), 404
    database = get_db()
    database.execute("DELETE FROM systems WHERE id = ?", (system_id,))
    database.execute(
        "UPDATE user_settings SET selected_system_id = NULL WHERE selected_system_id = ?",
        (system_id,),
    )
    database.commit()
    return jsonify(ok=True)


@app.post("/api/systems/select")
@login_required
def select_system() -> Any:
    body = json_body()
    system_id = body.get("systemId")
    if system_id:
        if not isinstance(system_id, str) or system_for_user(system_id, g.user) is None:
            return jsonify(error="Solar system was not found."), 404
    settings_for_user(g.user["id"])
    get_db().execute(
        "UPDATE user_settings SET selected_system_id = ? WHERE user_id = ?",
        (system_id or None, g.user["id"]),
    )
    get_db().commit()
    return jsonify(ok=True)


def expected_daily_kwh(
    panel_count: int,
    panel_wattage: float,
    cloud_cover: float,
    temperature: float,
    correction_factor: float,
) -> float:
    rated_kwp = panel_count * panel_wattage / 1000
    cloud_factor = max(0.22, 1 - cloud_cover / 100 * 0.78)
    temperature_derate = max(0.6, 1 - (temperature - 25) * 0.004) if temperature > 25 else 1
    return round(rated_kwp * 5.8 * cloud_factor * temperature_derate * correction_factor, 2)


@app.post("/api/meter-logs")
@login_required
def record_meter_log() -> Any:
    body = json_body()
    system_id = body.get("systemId")
    system = system_for_user(system_id, g.user) if isinstance(system_id, str) else None
    if system is None:
        return jsonify(error="Select a solar system before recording a meter reading."), 400
    date_value = body.get("date")
    try:
        log_date = date.fromisoformat(date_value)
    except (TypeError, ValueError):
        abort(400, description="Enter a valid meter reading date.")
    total_generation = bounded_number(
        body.get("totalGenerationKwh"), "Total generation", 0.01, 10000000
    )
    consumed = bounded_number(body.get("consumedKwh", 0), "Energy consumed", 0, 10000000)
    evening = bounded_number(
        body.get("eveningRemainingKwh", 0), "Remaining battery energy", 0, 10000000
    )
    cloud_cover = bounded_number(body.get("cloudCover", 20), "Cloud cover", 0, 100)
    temperature = bounded_number(body.get("temperatureC", 26), "Temperature", -80, 80)
    predicted = expected_daily_kwh(
        system["panel_count"],
        system["panel_wattage"],
        cloud_cover,
        temperature,
        system["correction_factor"],
    )
    delta = round(total_generation - predicted, 2)
    factor = system["correction_factor"]
    if predicted > 0 and total_generation > 0:
        baseline = predicted / factor if factor > 0 else predicted
        factor = round(max(0.45, min(1.65, factor + 0.15 * (total_generation / baseline - factor))), 4)

    log_id = new_id("log")
    database = get_db()
    database.execute(
        """INSERT INTO meter_logs
           (id, system_id, date, total_day_generation_kwh, energy_consumed_kwh,
            evening_remaining_kwh, net_kwh, predicted_kwh, delta_kwh, audit_status, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Calibrated', ?, ?)""",
        (
            log_id,
            system_id,
            log_date.isoformat(),
            total_generation,
            consumed,
            evening,
            round(total_generation - consumed, 2),
            predicted,
            delta,
            required_text(body.get("note", f"Sunset log · Tuned γ to {factor:.4f}"), "Note", 500),
            utc_now(),
        ),
    )
    database.execute(
        "UPDATE systems SET correction_factor = ? WHERE id = ?",
        (factor, system_id),
    )
    database.commit()
    log = database.execute("SELECT * FROM meter_logs WHERE id = ?", (log_id,)).fetchone()
    return jsonify(
        result={
            "delta": delta,
            "newFactor": factor,
            "totalDayKwh": total_generation,
            "netKwh": round(total_generation - consumed, 2),
        },
        log=serialize_log(log),
    ), 201


@app.post("/api/maintenance")
@login_required
def add_maintenance_task() -> Any:
    body = json_body()
    title = required_text(body.get("title"), "Task title", 200)
    cycle_days = bounded_integer(body.get("cycleDays"), "Cycle days", 1, 3650)
    due_date = body.get("dueDate")
    try:
        due_date = date.fromisoformat(due_date).isoformat()
    except (TypeError, ValueError):
        abort(400, description="Enter a valid due date.")
    system_id = body.get("systemId") or None
    if system_id and (
        not isinstance(system_id, str) or system_for_user(system_id, g.user) is None
    ):
        return jsonify(error="Solar system was not found."), 404
    task_id = new_id("task")
    database = get_db()
    database.execute(
        """INSERT INTO maintenance_tasks
           (id, user_id, system_id, title, cycle_days, due_date, is_done)
           VALUES (?, ?, ?, ?, ?, ?, 0)""",
        (task_id, g.user["id"], system_id, title, cycle_days, due_date),
    )
    database.commit()
    task = database.execute("SELECT * FROM maintenance_tasks WHERE id = ?", (task_id,)).fetchone()
    return jsonify(task=serialize_task(task)), 201


@app.patch("/api/maintenance/<task_id>")
@login_required
def update_maintenance_task(task_id: str) -> Any:
    body = json_body()
    query = "SELECT * FROM maintenance_tasks WHERE id = ?"
    parameters: tuple[Any, ...] = (task_id,)
    if g.user["role"] != "admin":
        query += " AND user_id = ?"
        parameters = (task_id, g.user["id"])
    task = get_db().execute(query, parameters).fetchone()
    if task is None:
        return jsonify(error="Maintenance task was not found."), 404

    action = body.get("action")
    if action == "toggle":
        is_done = body.get("isDone")
        if not isinstance(is_done, bool):
            abort(400, description="Task completion state is required.")
        completed_at = utc_now() if is_done else None
        get_db().execute(
            "UPDATE maintenance_tasks SET is_done = ?, last_completed_at = ? WHERE id = ?",
            (int(is_done), completed_at, task_id),
        )
    elif action == "reset":
        new_due_date = (date.today() + timedelta(days=task["cycle_days"] or 30)).isoformat()
        get_db().execute(
            """UPDATE maintenance_tasks SET is_done = 0, due_date = ?,
               last_completed_at = NULL WHERE id = ?""",
            (new_due_date, task_id),
        )
    else:
        abort(400, description="Choose a supported task action.")
    get_db().commit()
    updated = get_db().execute("SELECT * FROM maintenance_tasks WHERE id = ?", (task_id,)).fetchone()
    return jsonify(task=serialize_task(updated))


@app.patch("/api/settings")
@login_required
def update_settings() -> Any:
    body = json_body()
    user = g.user
    allowed = {"theme", "openWeatherApiKey", "hasDismissedWelcomeGuide"}
    unknown = set(body) - allowed - {"tariffZmw"}
    if unknown:
        abort(400, description="One or more settings are not supported.")
    database = get_db()
    settings_for_user(user["id"])
    if "theme" in body:
        theme = body["theme"]
        if theme not in {"system", "light", "dark"}:
            abort(400, description="Choose a valid theme.")
        database.execute("UPDATE user_settings SET theme = ? WHERE user_id = ?", (theme, user["id"]))
    if "openWeatherApiKey" in body:
        api_key = body["openWeatherApiKey"]
        if not isinstance(api_key, str) or len(api_key) > 500:
            abort(400, description="Weather API key must be at most 500 characters.")
        database.execute(
            "UPDATE user_settings SET open_weather_api_key = ? WHERE user_id = ?",
            (api_key.strip(), user["id"]),
        )
    if "hasDismissedWelcomeGuide" in body:
        dismissed = body["hasDismissedWelcomeGuide"]
        if not isinstance(dismissed, bool):
            abort(400, description="Welcome guide setting must be true or false.")
        database.execute(
            "UPDATE user_settings SET has_dismissed_welcome_guide = ? WHERE user_id = ?",
            (int(dismissed), user["id"]),
        )
    if "tariffZmw" in body:
        if user["role"] != "admin":
            return jsonify(error="Administrator access is required to change the tariff."), 403
        tariff = bounded_number(body["tariffZmw"], "Tariff", 0, 1000)
        database.execute(
            """INSERT INTO platform_settings (setting_key, setting_value) VALUES ('tariff_zmw', ?)
               ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value""",
            (str(tariff),),
        )
    database.commit()
    return jsonify(ok=True)


@app.patch("/api/admin/users/<user_id>")
@admin_required
def update_user_status(user_id: str) -> Any:
    body = json_body()
    target = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if target is None or target["role"] == "admin":
        return jsonify(error="This operator cannot be changed."), 404
    is_active = body.get("isActive")
    if not isinstance(is_active, bool):
        abort(400, description="Account status must be true or false.")
    get_db().execute("UPDATE users SET is_active = ? WHERE id = ?", (int(is_active), user_id))
    get_db().commit()
    if not is_active and session.get("user_id") == user_id:
        session.clear()
    updated = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return jsonify(user=serialize_user(updated))


@app.delete("/api/admin/users/<user_id>")
@admin_required
def delete_user(user_id: str) -> Any:
    target = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if target is None or target["role"] == "admin":
        return jsonify(error="This operator cannot be deleted."), 404
    get_db().execute("DELETE FROM users WHERE id = ?", (user_id,))
    get_db().commit()
    return jsonify(ok=True)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_client(path: str) -> Any:
    if path.startswith("api/"):
        abort(404)
    if not DIST_DIR.is_dir():
        return (
            "The React app has not been built yet. Run `npm.cmd run build` from the project root.",
            503,
        )
    requested_file = DIST_DIR / path
    if path and requested_file.is_file():
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    init_db()
    port = int(os.getenv("ZUBA_API_PORT", "5001"))
    app.run(host="127.0.0.1", port=port, debug=False)
