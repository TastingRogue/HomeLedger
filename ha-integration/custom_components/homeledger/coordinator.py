"""DataUpdateCoordinator for HomeLedger."""

from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any

import aiohttp

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import CONF_API_KEY, CONF_API_URL, DEFAULT_SCAN_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)


class HomeLedgerCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator to fetch data from HomeLedger API."""

    config_entry: ConfigEntry

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize the coordinator."""
        self.api_url: str = entry.data[CONF_API_URL]
        self.api_key: str = entry.data[CONF_API_KEY]

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=DEFAULT_SCAN_INTERVAL),
        )

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch data from HomeLedger API."""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with session.get(
                    f"{self.api_url}/api/v1/ha/status",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status == 401:
                        raise UpdateFailed("Authentication failed - check API key")
                    if response.status != 200:
                        raise UpdateFailed(
                            f"Error communicating with API: HTTP {response.status}"
                        )
                    data = await response.json()
                    return data
        except aiohttp.ClientError as err:
            raise UpdateFailed(f"Error communicating with API: {err}") from err
        except TimeoutError as err:
            raise UpdateFailed("Timeout communicating with API") from err

    async def async_create_transaction(
        self,
        name: str,
        amount: float,
        transaction_type: str,
        account_id: int,
        category_id: int,
    ) -> dict[str, Any]:
        """Create a transaction via the HomeLedger API."""
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "name": name,
                "amount": amount,
                "type": transaction_type,
                "accountId": account_id,
                "categoryId": category_id,
                "date": None,  # API will use current date
            }
            async with session.post(
                f"{self.api_url}/api/v1/transactions",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status not in (200, 201):
                    raise UpdateFailed(
                        f"Failed to create transaction: HTTP {response.status}"
                    )
                return await response.json()

    async def async_create_quick_expense(
        self,
        amount: float,
        account_id: int,
        category_id: int,
    ) -> dict[str, Any]:
        """Create a quick expense via the HomeLedger API."""
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "amount": amount,
                "accountId": account_id,
                "categoryId": category_id,
            }
            async with session.post(
                f"{self.api_url}/api/v1/transactions/quick",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status not in (200, 201):
                    raise UpdateFailed(
                        f"Failed to create quick expense: HTTP {response.status}"
                    )
                return await response.json()
