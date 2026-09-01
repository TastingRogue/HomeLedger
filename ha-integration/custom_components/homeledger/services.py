"""Services for the HomeLedger integration."""

from __future__ import annotations

import logging

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall

from .const import (
    DOMAIN,
    SERVICE_CREATE_QUICK_EXPENSE,
    SERVICE_CREATE_TRANSACTION,
    SERVICE_REFRESH_DATA,
)
from .coordinator import HomeLedgerCoordinator

_LOGGER = logging.getLogger(__name__)

SERVICE_CREATE_TRANSACTION_SCHEMA = vol.Schema(
    {
        vol.Required("name"): str,
        vol.Required("amount"): vol.Coerce(float),
        vol.Required("type"): vol.In(["Ingreso", "Gasto"]),
        vol.Required("account_id"): vol.Coerce(int),
        vol.Required("category_id"): vol.Coerce(int),
    }
)

SERVICE_CREATE_QUICK_EXPENSE_SCHEMA = vol.Schema(
    {
        vol.Required("amount"): vol.Coerce(float),
        vol.Required("account_id"): vol.Coerce(int),
        vol.Required("category_id"): vol.Coerce(int),
    }
)


async def async_register_services(
    hass: HomeAssistant, coordinator: HomeLedgerCoordinator
) -> None:
    """Register HomeLedger services."""

    async def handle_create_transaction(call: ServiceCall) -> None:
        """Handle the create_transaction service call."""
        name = call.data["name"]
        amount = call.data["amount"]
        transaction_type = call.data["type"]
        account_id = call.data["account_id"]
        category_id = call.data["category_id"]

        _LOGGER.debug(
            "Creating transaction: %s, amount: %s, type: %s",
            name,
            amount,
            transaction_type,
        )

        await coordinator.async_create_transaction(
            name=name,
            amount=amount,
            transaction_type=transaction_type,
            account_id=account_id,
            category_id=category_id,
        )

        # Refresh data after creating transaction
        await coordinator.async_request_refresh()

    async def handle_create_quick_expense(call: ServiceCall) -> None:
        """Handle the create_quick_expense service call."""
        amount = call.data["amount"]
        account_id = call.data["account_id"]
        category_id = call.data["category_id"]

        _LOGGER.debug(
            "Creating quick expense: amount=%s, account=%s, category=%s",
            amount,
            account_id,
            category_id,
        )

        await coordinator.async_create_quick_expense(
            amount=amount,
            account_id=account_id,
            category_id=category_id,
        )

        # Refresh data after creating expense
        await coordinator.async_request_refresh()

    async def handle_refresh_data(call: ServiceCall) -> None:
        """Handle the refresh_data service call."""
        _LOGGER.debug("Refreshing HomeLedger data")
        await coordinator.async_request_refresh()

    # Register services
    hass.services.async_register(
        DOMAIN,
        SERVICE_CREATE_TRANSACTION,
        handle_create_transaction,
        schema=SERVICE_CREATE_TRANSACTION_SCHEMA,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_CREATE_QUICK_EXPENSE,
        handle_create_quick_expense,
        schema=SERVICE_CREATE_QUICK_EXPENSE_SCHEMA,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REFRESH_DATA,
        handle_refresh_data,
    )
