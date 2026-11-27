import csv
import io
from datetime import date, datetime

from app.repositories.dashboard_repository import DashboardRepository
from app.services.exceptions import ValidationError
from app.utils.dates import month_bounds, month_name_es

ESTADOS_VALIDOS = {"pending", "confirmed", "cancelled"}


class DashboardService:
    def __init__(self, db):
        self.db = db
        self.dashboard = DashboardRepository(db)

    def stats(self):
        today = date.today()
        start_of_today = datetime.combine(today, datetime.min.time())
        end_of_today = datetime.combine(today, datetime.max.time())
        start_of_month = datetime(today.year, today.month, 1)

        total_hoy = self.dashboard.count_reservations(start_of_today, end_of_today)
        ingresos_dia = self.dashboard.sum_income(start_of_today, end_of_today)
        ingresos_mes = self.dashboard.sum_income(start_of_month)
        pendientes = self.dashboard.count_pending()
        clientes = self.dashboard.count_clients()
        eventos = self.dashboard.count_upcoming_events(datetime.now())
        horas_ocupadas = self.dashboard.booked_hours(start_of_today, end_of_today)

        horas_disponibles = 0
        for field in self.dashboard.active_fields():
            try:
                h_start = int(field.available_hour_start.split(":")[0])
                h_end = int(field.available_hour_end.split(":")[0])
                horas_disponibles += max(h_end - h_start, 0)
            except (ValueError, AttributeError):
                horas_disponibles += 24

        ocupacion = 0.0
        if horas_disponibles and horas_ocupadas:
            ocupacion = round(min(float(horas_ocupadas) / horas_disponibles * 100, 100), 1)

        return {
            "totalReservasHoy": total_hoy,
            "ingresosDia": round(float(ingresos_dia or 0), 2),
            "ingresosMes": round(float(ingresos_mes or 0), 2),
            "reservasPendientes": pendientes,
            "ocupacionPromedio": ocupacion,
            "clientesRegistrados": clientes,
            "proximosEventos": eventos,
        }

    def _filters(self, year: int, month: int, field_id=None, estado=None):
        if estado and estado not in ESTADOS_VALIDOS:
            raise ValidationError(f"Estado inválido: {estado}")
        try:
            desde, hasta = month_bounds(year, month)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        return desde, hasta

    def reporte(self, year: int, month: int, field_id=None, estado=None):
        desde, hasta = self._filters(year, month, field_id, estado)
        reservas = self.dashboard.report_reservations(desde, hasta, field_id, estado)
        total_ingresos = sum(reserva.total_price for reserva in reservas if reserva.status == "confirmed")
        return {
            "periodo": {
                "year": year,
                "month": month,
                "mes": month_name_es(month),
                "desde": desde.strftime("%Y-%m-%d"),
            },
            "filtros": {"field_id": field_id, "estado": estado},
            "resumen": {
                "total_reservas": len(reservas),
                "confirmadas": sum(1 for r in reservas if r.status == "confirmed"),
                "pendientes": sum(1 for r in reservas if r.status == "pending"),
                "canceladas": sum(1 for r in reservas if r.status == "cancelled"),
                "ingresos_confirmados": round(total_ingresos, 2),
            },
            "reservas": [
                {
                    "id": r.id,
                    "cancha": r.field_id,
                    "cliente": r.client_name,
                    "email": r.client_email,
                    "telefono": r.client_phone,
                    "inicio": r.start_time.isoformat(),
                    "fin": r.end_time.isoformat(),
                    "precio": r.total_price,
                    "estado": r.status,
                    "pago": r.payment_status,
                }
                for r in reservas
            ],
        }

    def export_csv(self, year: int, month: int, field_id=None, estado=None):
        desde, hasta = self._filters(year, month, field_id, estado)
        reservas = self.dashboard.report_reservations(desde, hasta, field_id, estado)
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["ID", "Cancha", "Cliente", "Email", "Teléfono", "Inicio", "Fin", "Precio", "Estado", "Pago"])
        for r in reservas:
            writer.writerow([
                r.id, r.field_id, r.client_name, r.client_email, r.client_phone,
                r.start_time.strftime("%Y-%m-%d %H:%M"), r.end_time.strftime("%Y-%m-%d %H:%M"),
                r.total_price, r.status, r.payment_status,
            ])
        buffer.seek(0)
        return buffer.getvalue(), f"reporte-{year}-{month:02d}.csv"
