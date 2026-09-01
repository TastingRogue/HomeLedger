"""Binary sensor platform for HomeLedger."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, MANUFACTURER
from .coordinator import HomeLedgerCoordinator

BINARY_SENSOR_DESCRIPTIONS = [
    {
        "key": "over_budget",
        "name": "Presupuesto Excedido",
        "icon_on": "mdi:alert-circle",
        "icon_off": "mdi:check-circle",
        "device_class": BinarySensorDeviceClass.PROBLEM,
    },
    {
        "key": "high_credit_utilization",
        "name": "Utilización Alta de Crédito",
        "icon_on": "mdi:credit-card-alert",
        "icon_off": "mdi:credit-card-check",
        "device_class": BinarySensorDeviceClass.PROBLEM,
    },
    {
        "key": "payment_due_soon",
        "name": "Pago Próximo a Vencer",
        "icon_on": "mdi:calendar-alert",
        "icon_off": "mdi:calendar-check",
        "device_class": BinarySensorDeviceClass.PROBLEM,
    },
    {
        "key": "low_balance",
        "name": "Balance Bajo",
        "icon_on": "mdi:wallet-alert",
        "icon_off": "mdi:wallet",
        "device_class": BinarySensorDeviceClass.PROBLEM,
    },
]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up HomeLedger binary sensors from a config entry."""
    coordinator: HomeLedgerCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = [
        HomeLedgerBinarySensor(coordinator, entry, description)
        for description in BINARY_SENSOR_DESCRIPTIONS
    ]

    async_add_entities(entities)


class HomeLedgerBinarySensor(
    CoordinatorEntity[HomeLedgerCoordinator], BinarySensorEntity
):
    """Representation of a HomeLedger binary sensor."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: HomeLedgerCoordinator,
        entry: ConfigEntry,
        description: dict,
    ) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._key = description["key"]
        self._attr_name = description["name"]
        self._attr_unique_id = f"{entry.entry_id}_{self._key}"
        self._icon_on = description["icon_on"]
        self._icon_off = description["icon_off"]
        self._attr_device_class = description["device_class"]
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "HomeLedger",
            "manufacturer": MANUFACTURER,
            "model": "Personal Finance Manager",
            "sw_version": "0.1.0",
        }

    @property
    def is_on(self) -> bool | None:
        """Return the state of the binary sensor."""
        if self.coordinator.data is None:
            return None
        alerts = self.coordinator.data.get("alerts", {})
        return alerts.get(self._key, False)

    @property
    def icon(self) -> str:
        """Return the icon based on state."""
        if self.is_on:
            return self._icon_on
        return self._icon_off
