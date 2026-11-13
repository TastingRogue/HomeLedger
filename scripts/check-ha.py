"""Check HA configuration and actual sensor property code without a HA install.

Requires jq, as does the add-on. These checks do not replace Supervisor tests.
"""
import ast
import json
import re
import subprocess
from pathlib import Path
from types import SimpleNamespace

root = Path(__file__).resolve().parent.parent
script = (root / "ha-addon/run.sh").read_text(encoding="utf-8")
expression = re.search(r"export BACKUP_ENABLED=\$\(jq -r '([^']+)'", script).group(1)
for options, expected in [({}, "true"), ({"BACKUP_ENABLED": None}, "true"),
                          ({"BACKUP_ENABLED": True}, "true"), ({"BACKUP_ENABLED": False}, "false")]:
    actual = subprocess.check_output(["jq", "-r", expression], input=json.dumps(options), text=True).strip()
    assert actual == expected, (options, actual)

source = ast.parse((root / "ha-integration/custom_components/homeledger/sensor.py").read_text(encoding="utf-8"))
for class_name, expected in [("HomeLedgerAccountSensor", "USD"), ("HomeLedgerCategorySensor", "MXN")]:
    cls = next(n for n in source.body if isinstance(n, ast.ClassDef) and n.name == class_name)
    method = next(n for n in cls.body if isinstance(n, ast.FunctionDef) and n.name == "native_unit_of_measurement")
    namespace = {}
    exec(compile(ast.Module(body=[method], type_ignores=[]), "sensor.py", "exec"), namespace)
    sensor = SimpleNamespace(_account_id=1, coordinator=SimpleNamespace(data={
        "currency": "MXN", "accounts": [{"id": 1, "currency": "USD"}]
    }))
    prop = namespace["native_unit_of_measurement"]
    assert prop.fget(sensor) == expected
    sensor.coordinator.data = {}
    assert prop.fget(sensor) == "MXN"
print("HA backup options and native/base sensor currencies passed.")
