from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field
import csv
import json
import os
from pathlib import Path

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    from openpyxl import load_workbook
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False


@dataclass
class DDTVariable:
    name: str
    value: Any
    description: Optional[str] = None
    is_template: bool = False


@dataclass
class DDTRow:
    row_number: int
    variables: Dict[str, Any]
    is_active: bool = True
    description: Optional[str] = None


@dataclass
class DDTDataSet:
    name: str
    description: Optional[str] = None
    rows: List[DDTRow] = field(default_factory=list)
    headers: List[str] = field(default_factory=list)


class DataDrivenEngine:
    def __init__(self):
        self.data_sets: Dict[str, DDTDataSet] = {}
        self.variable_templates: Dict[str, str] = {}

    def load_from_csv(
        self,
        file_path: str,
        name: Optional[str] = None,
        has_header: bool = True,
        delimiter: str = ",",
        encoding: str = "utf-8"
    ) -> DDTDataSet:
        dataset_name = name or os.path.basename(file_path).replace(".csv", "")

        with open(file_path, "r", encoding=encoding) as f:
            reader = csv.reader(f, delimiter=delimiter)
            rows = list(reader)

        if not rows:
            return DDTDataSet(name=dataset_name)

        headers = []
        start_row = 0

        if has_header:
            headers = rows[0]
            start_row = 1

        ddt_rows = []
        for row_idx, row_data in enumerate(rows[start_row:]):
            variables = {}

            if headers:
                for col_idx, header in enumerate(headers):
                    if col_idx < len(row_data):
                        value = self._parse_value(row_data[col_idx])
                        variables[header] = value
            else:
                for col_idx, value in enumerate(row_data):
                    variables[f"col_{col_idx}"] = self._parse_value(value)

            is_active = True
            if "is_active" in variables:
                is_active = str(variables["is_active"]).lower() in ["true", "1", "yes", "active"]
                del variables["is_active"]

            ddt_rows.append(DDTRow(
                row_number=row_idx + 1,
                variables=variables,
                is_active=is_active
            ))

        data_set = DDTDataSet(
            name=dataset_name,
            description=f"Loaded from {file_path}",
            rows=ddt_rows,
            headers=headers
        )

        self.data_sets[dataset_name] = data_set
        return data_set

    def load_from_excel(
        self,
        file_path: str,
        name: Optional[str] = None,
        sheet_name: Optional[str] = None,
        has_header: bool = True
    ) -> DDTDataSet:
        if not HAS_OPENPYXL and not HAS_PANDAS:
            raise ImportError("需要安装 openpyxl 或 pandas 来读取 Excel 文件")

        dataset_name = name or os.path.basename(file_path)

        if HAS_PANDAS:
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=0 if has_header else None)
            headers = list(df.columns) if has_header else [f"col_{i}" for i in range(len(df.columns))]

            ddt_rows = []
            for idx, row in df.iterrows():
                variables = {}
                for col_idx, col_name in enumerate(df.columns if has_header else range(len(df.columns))):
                    value = row.iloc[col_idx]
                    value = self._parse_value(str(value) if not pd.isna(value) else "")
                    if has_header:
                        variables[col_name] = value
                    else:
                        variables[f"col_{col_idx}"] = value

                is_active = True
                if "is_active" in variables:
                    is_active = str(variables["is_active"]).lower() in ["true", "1", "yes", "active"]
                    del variables["is_active"]

                ddt_rows.append(DDTRow(
                    row_number=idx + 1,
                    variables=variables,
                    is_active=is_active
                ))
        else:
            wb = load_workbook(file_path, data_only=True)
            ws = wb[sheet_name] if sheet_name else wb.active

            rows = list(ws.values)
            headers = []
            start_row = 0

            if has_header and rows:
                headers = list(rows[0])
                start_row = 1

            ddt_rows = []
            for row_idx in range(start_row, len(rows)):
                row_data = rows[row_idx]
                variables = {}

                for col_idx, value in enumerate(row_data):
                    if headers and col_idx < len(headers):
                        col_name = headers[col_idx]
                    else:
                        col_name = f"col_{col_idx}"
                    variables[col_name] = self._parse_value(str(value) if value is not None else "")

                is_active = True
                if "is_active" in variables:
                    is_active = str(variables["is_active"]).lower() in ["true", "1", "yes", "active"]
                    del variables["is_active"]

                ddt_rows.append(DDTRow(
                    row_number=row_idx - start_row + 1,
                    variables=variables,
                    is_active=is_active
                ))

            if has_header:
                headers = [str(h) for h in headers]

        data_set = DDTDataSet(
            name=dataset_name,
            description=f"Loaded from Excel: {file_path}",
            rows=ddt_rows,
            headers=headers
        )

        self.data_sets[dataset_name] = data_set
        return data_set

    def load_from_json(
        self,
        file_path: str,
        name: Optional[str] = None
    ) -> DDTDataSet:
        dataset_name = name or os.path.basename(file_path).replace(".json", "")

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return self.parse_json_data(data, dataset_name)

    def parse_json_data(
        self,
        data: Union[List[Dict], Dict],
        name: str
    ) -> DDTDataSet:
        if isinstance(data, dict):
            if "rows" in data and isinstance(data["rows"], list):
                rows_data = data["rows"]
            elif "data" in data and isinstance(data["data"], list):
                rows_data = data["data"]
            else:
                rows_data = [data]
        else:
            rows_data = data

        ddt_rows = []
        headers = []

        for row_idx, row_data in enumerate(rows_data):
            if not isinstance(row_data, dict):
                continue

            variables = {}
            for key, value in row_data.items():
                if key == "is_active":
                    continue
                variables[key] = self._parse_value(value)

                if key not in headers:
                    headers.append(key)

            is_active = row_data.get("is_active", True)
            if isinstance(is_active, str):
                is_active = is_active.lower() in ["true", "1", "yes", "active"]

            ddt_rows.append(DDTRow(
                row_number=row_idx + 1,
                variables=variables,
                is_active=is_active
            ))

        data_set = DDTDataSet(
            name=name,
            description="Loaded from JSON data",
            rows=ddt_rows,
            headers=headers
        )

        self.data_sets[name] = data_set
        return data_set

    def _parse_value(self, value: Any) -> Any:
        if not isinstance(value, str):
            return value

        value = value.strip()

        if value.lower() == "null" or value == "":
            return None
        elif value.lower() == "true":
            return True
        elif value.lower() == "false":
            return False

        if value.startswith("{") or value.startswith("["):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass

        if "." in value:
            try:
                return float(value)
            except ValueError:
                pass

        try:
            return int(value)
        except ValueError:
            pass

        return value

    def apply_template(
        self,
        template_string: str,
        variables: Dict[str, Any]
    ) -> str:
        result = template_string

        import re
        pattern = r'\{\{(\w+(?:\.\w+)*)\}\}'

        def replace_match(match):
            var_path = match.group(1)
            value = self._get_nested_variable(variables, var_path)
            if value is None:
                return match.group(0)
            return str(value)

        result = re.sub(pattern, replace_match, result)
        return result

    def _get_nested_variable(self, variables: Dict, path: str) -> Any:
        keys = path.split(".")
        value = variables

        for key in keys:
            if isinstance(value, dict):
                if key in value:
                    value = value[key]
                else:
                    return None
            elif isinstance(value, list) and key.isdigit():
                index = int(key)
                if 0 <= index < len(value):
                    value = value[index]
                else:
                    return None
            else:
                return None

        return value

    def get_data_set(self, name: str) -> Optional[DDTDataSet]:
        return self.data_sets.get(name)

    def get_active_rows(self, data_set_name: str) -> List[DDTRow]:
        data_set = self.get_data_set(data_set_name)
        if not data_set:
            return []
        return [row for row in data_set.rows if row.is_active]

    def export_to_csv(
        self,
        data_set_name: str,
        file_path: str,
        include_inactive: bool = False
    ) -> bool:
        data_set = self.get_data_set(data_set_name)
        if not data_set:
            return False

        rows = data_set.rows if include_inactive else self.get_active_rows(data_set_name)

        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)

            if data_set.headers:
                writer.writerow(data_set.headers + ["is_active"])
            else:
                if rows:
                    headers = list(rows[0].variables.keys())
                    writer.writerow(headers + ["is_active"])

            for row in rows:
                values = list(row.variables.values())
                values.append(row.is_active)
                writer.writerow(values)

        return True

    def export_to_json(
        self,
        data_set_name: str,
        file_path: str,
        include_inactive: bool = False
    ) -> bool:
        data_set = self.get_data_set(data_set_name)
        if not data_set:
            return False

        rows = data_set.rows if include_inactive else self.get_active_rows(data_set_name)

        export_data = {
            "name": data_set.name,
            "description": data_set.description,
            "headers": data_set.headers,
            "rows": [
                {
                    "row_number": row.row_number,
                    "variables": row.variables,
                    "is_active": row.is_active,
                    "description": row.description
                }
                for row in rows
            ]
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        return True

    def list_data_sets(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": ds.name,
                "description": ds.description,
                "total_rows": len(ds.rows),
                "active_rows": sum(1 for r in ds.rows if r.is_active),
                "headers": ds.headers
            }
            for ds in self.data_sets.values()
        ]

    def clear_all(self):
        self.data_sets.clear()
        self.variable_templates.clear()
