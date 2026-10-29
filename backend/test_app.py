import sqlite3
import tempfile
import unittest
from pathlib import Path

from backend.app import app, init_db


class DatabaseApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        app.config.update(
            DATABASE=str(Path(self.temporary_directory.name) / "test.db"),
            TESTING=True,
        )
        init_db()
        self.client = app.test_client()

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def csrf_headers(self) -> dict[str, str]:
        token = self.client.get("/api/session").get_json()["csrfToken"]
        return {"X-CSRF-Token": token}

    def register(self, client, name: str, email: str) -> None:
        token = client.get("/api/session").get_json()["csrfToken"]
        response = client.post(
            "/api/auth/register",
            json={"name": name, "email": email, "password": "solar-pass-123"},
            headers={"X-CSRF-Token": token},
        )
        self.assertEqual(response.status_code, 201, response.get_json())

    def test_user_data_persists_in_sqlite_and_is_private(self) -> None:
        self.register(self.client, "Solar Operator", "operator@example.com")
        headers = self.csrf_headers()
        system_response = self.client.post(
            "/api/systems",
            json={
                "name": "Home Array",
                "panelCount": 8,
                "panelWattage": 450,
                "batteryCapacityKwh": 10,
                "city": "Lusaka Province",
                "latitude": -15.4167,
                "longitude": 28.2833,
                "tilt": 15,
                "azimuth": 0,
            },
            headers=headers,
        )
        self.assertEqual(system_response.status_code, 201, system_response.get_json())
        system_id = system_response.get_json()["system"]["id"]

        log_response = self.client.post(
            "/api/meter-logs",
            json={
                "systemId": system_id,
                "date": "2026-10-29",
                "totalGenerationKwh": 24.5,
                "consumedKwh": 0,
                "eveningRemainingKwh": 0,
                "cloudCover": 30,
                "temperatureC": 27,
            },
            headers=headers,
        )
        self.assertEqual(log_response.status_code, 201, log_response.get_json())

        bootstrap_before_restart = self.client.get("/api/bootstrap").get_json()
        task_id = bootstrap_before_restart["maintenanceTasks"][0]["id"]
        task_response = self.client.patch(
            f"/api/maintenance/{task_id}",
            json={"action": "toggle", "isDone": True},
            headers=headers,
        )
        self.assertEqual(task_response.status_code, 200, task_response.get_json())
        settings_response = self.client.patch(
            "/api/settings",
            json={"theme": "dark"},
            headers=headers,
        )
        self.assertEqual(settings_response.status_code, 200, settings_response.get_json())

        other_client = app.test_client()
        self.register(other_client, "Other Operator", "other@example.com")
        self.assertEqual(other_client.get("/api/bootstrap").get_json()["systems"], [])

        returning_client = app.test_client()
        token = returning_client.get("/api/session").get_json()["csrfToken"]
        login_response = returning_client.post(
            "/api/auth/login",
            json={"email": "operator@example.com", "password": "solar-pass-123"},
            headers={"X-CSRF-Token": token},
        )
        self.assertEqual(login_response.status_code, 200, login_response.get_json())
        bootstrap = returning_client.get("/api/bootstrap").get_json()
        self.assertEqual([system["id"] for system in bootstrap["systems"]], [system_id])
        self.assertEqual(len(bootstrap["meterLogs"]), 1)
        self.assertEqual(bootstrap["selectedSystemId"], system_id)
        self.assertEqual(bootstrap["settings"]["theme"], "dark")
        restored_task = next(task for task in bootstrap["maintenanceTasks"] if task["id"] == task_id)
        self.assertTrue(restored_task["isDone"])

        database = sqlite3.connect(app.config["DATABASE"])
        count = database.execute("SELECT COUNT(*) FROM meter_logs").fetchone()[0]
        database.close()
        self.assertEqual(count, 1)

    def test_write_requests_require_csrf_token(self) -> None:
        self.register(self.client, "Solar Operator", "operator@example.com")
        response = self.client.post("/api/systems", json={})
        self.assertEqual(response.status_code, 400)
        self.assertIn("session expired", response.get_json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
