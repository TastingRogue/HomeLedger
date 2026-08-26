"""Sensor platform for Smart Finance."""

from __future__ import annotations

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, MANUFACTURER
from .coordinator import SmartFinanceCoordinator

SENSOR_DESCRIPTIONS = [
    {
        "key": "monthly_expenses",
        "name": "Gastos del Mes",
        "icon": "mdi:cash-minus",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "unit": "MXN",
    },
    {
        "key": "monthly_income",
        "name": "Ingresos del Mes",
        "icon": "mdi:cash-plus",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "unit": "MXN",
    },
    {
        "key": "monthly_savings",
        "name": "Ahorro del Mes",
        "icon": "mdi:piggy-bank",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "unit": "MXN",
    },
    {
        "key": "remaining_budget",
        "name": "Presupuesto Restante",
        "icon": "mdi:chart-pie",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "unit": "MXN",
    },
    {
        "key": "net_worth",
        "name": "Patrimonio Neto",
        "icon": "mdi:bank",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "unit": "MXN",
    },
    {
        "key": "total_balance",
        "name": "Balance Consolidado",
        "icon": "mdi:wallet",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "unit": "MXN",
    },
    {
        "key": "credit_card_utilization",
        "name": "Utilización Tarjetas de Crédito",
        "icon": "mdi:credit-card-clock",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "unit": "%",
    },
]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Smart Finance sensors from a config entry."""
    coordinator: SmartFinanceCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities: list[SmartFinanceSensor] = []

    # Add static sensors
    for description in SENSOR_DESCRIPTIONS:
        entities.append(SmartFinanceSensor(coordinator, entry, description))

    # Add dynamic account balance sensors
    if coordinator.data and "accounts" in coordinator.data:
        for account in coordinator.data["accounts"]:
            entities.append(
                SmartFinanceAccountSensor(coordinator, entry, account)
            )

    # Add dynamic category expense sensors
    if coordinator.data and "top_categories" in coordinator.data:
        for category in coordinator.data["top_categories"]:
            entities.append(
                SmartFinanceCategorySensor(coordinator, entry, category)
            )

    async_add_entities(entities)


class SmartFinanceSensor(CoordinatorEntity[SmartFinanceCoordinator], SensorEntity):
    """Representation of a Smart Finance sensor."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: SmartFinanceCoordinator,
        entry: ConfigEntry,
        description: dict,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._key = description["key"]
        self._attr_name = description["name"]
        self._attr_unique_id = f"{entry.entry_id}_{self._key}"
        self._attr_icon = description["icon"]
        self._attr_device_class = description["device_class"]
        self._attr_state_class = description["state_class"]
        self._attr_native_unit_of_measurement = description["unit"]
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "Smart Finance",
            "manufacturer": MANUFACTURER,
            "model": "Personal Finance Manager",
            "sw_version": "1.0.0",
        }

    @property
    def native_value(self) -> float | None:
        """Return the state of the sensor."""
        if self.coordinator.data is None:
            return None
        return self.coordinator.data.get(self._key)


class SmartFinanceAccountSensor(CoordinatorEntity[SmartFinanceCoordinator], SensorEntity):
    """Sensor for individual account balances."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.TOTAL
    _attr_native_unit_of_measurement = "MXN"

    def __init__(
        self,
        coordinator: SmartFinanceCoordinator,
        entry: ConfigEntry,
        account: dict,
    ) -> None:
        """Initialize the account sensor."""
        super().__init__(coordinator)
        self._account_id = account["id"]
        self._attr_name = f"Cuenta {account['name']}"
        self._attr_unique_id = f"{entry.entry_id}_account_{account['id']}"
        self._attr_icon = "mdi:bank"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "Smart Finance",
            "manufacturer": MANUFACTURER,
            "model": "Personal Finance Manager",
            "sw_version": "1.0.0",
        }

    @property
    def native_value(self) -> float | None:
        """Return the account balance."""
        if self.coordinator.data is None or "accounts" not in self.coordinator.data:
            return None
        for account in self.coordinator.data["accounts"]:
            if account["id"] == self._account_id:
                return account.get("balance")
        return None


class SmartFinanceCategorySensor(CoordinatorEntity[SmartFinanceCoordinator], SensorEntity):
    """Sensor for category expenses."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.TOTAL
    _attr_native_unit_of_measurement = "MXN"

    def __init__(
        self,
        coordinator: SmartFinanceCoordinator,
        entry: ConfigEntry,
        category: dict,
    ) -> None:
        """Initialize the category sensor."""
        super().__init__(coordinator)
        self._category_id = category["id"]
        self._attr_name = f"Gastos {category['name']}"
        self._attr_unique_id = f"{entry.entry_id}_category_{category['id']}"
        self._attr_icon = "mdi:tag"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "Smart Finance",
            "manufacturer": MANUFACTURER,
            "model": "Personal Finance Manager",
            "sw_version": "1.0.0",
        }

    @property
    def native_value(self) -> float | None:
        """Return the category expenses total."""
        if self.coordinator.data is None or "top_categories" not in self.coordinator.data:
            return None
        for category in self.coordinator.data["top_categories"]:
            if category["id"] == self._category_id:
                return category.get("total")
        return None
