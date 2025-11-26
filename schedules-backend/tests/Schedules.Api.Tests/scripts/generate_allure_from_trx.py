import argparse
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {"trx": "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"}


def iso_to_epoch_ms(value: str) -> int:
    dt = datetime.fromisoformat(value)
    return int(dt.timestamp() * 1000)


def parse_duration_ms(duration: str) -> int:
    hours, minutes, seconds = duration.split(":")
    td = timedelta(
        hours=int(hours),
        minutes=int(minutes),
        seconds=float(seconds),
    )
    return int(td.total_seconds() * 1000)


def load_test_definitions(root: ET.Element) -> dict[str, tuple[str, str]]:
    mapping: dict[str, tuple[str, str]] = {}
    for unit in root.findall(".//trx:TestDefinitions/trx:UnitTest", NS):
        execution = unit.find("trx:Execution", NS)
        test_method = unit.find("trx:TestMethod", NS)
        if execution is None or test_method is None:
            continue
        exec_id = execution.attrib.get("id")
        class_name = test_method.attrib.get("className", "")
        name = test_method.attrib.get("name", "")
        if exec_id:
            mapping[exec_id] = (class_name, name)
    return mapping


def create_allure_entry(
    execution_id: str,
    class_name: str,
    method_name: str,
    result_element: ET.Element,
) -> dict:
    outcome = result_element.attrib.get("outcome", "").lower()
    if outcome == "passed":
        status = "passed"
    elif outcome in {"failed", "error"}:
        status = "failed"
    else:
        status = "skipped"

    start_time = result_element.attrib.get("startTime")
    end_time = result_element.attrib.get("endTime")
    duration = result_element.attrib.get("duration", "0:00:00.0000000")
    start = iso_to_epoch_ms(start_time) if start_time else 0
    stop = iso_to_epoch_ms(end_time) if end_time else start + parse_duration_ms(duration)

    status_details: dict = {}
    error_info = result_element.find("trx:Output/trx:ErrorInfo", NS)
    if error_info is not None:
        message_el = error_info.find("trx:Message", NS)
        stack_el = error_info.find("trx:StackTrace", NS)
        if message_el is not None and message_el.text:
            status_details["message"] = message_el.text
        if stack_el is not None and stack_el.text:
            status_details["trace"] = stack_el.text

    package = class_name.rsplit(".", 1)[0] if "." in class_name else class_name
    history_id = f"{class_name}.{method_name}"

    return {
        "uuid": str(uuid.uuid4()),
        "historyId": history_id,
        "fullName": history_id,
        "name": method_name,
        "status": status,
        "stage": "finished",
        "labels": [
            {"name": "package", "value": package},
            {"name": "testClass", "value": class_name},
            {"name": "language", "value": "csharp"},
            {"name": "framework", "value": "xunit"},
        ],
        "parameters": [],
        "steps": [],
        "links": [],
        "attachments": [],
        "start": start,
        "stop": stop,
        "statusDetails": status_details,
    }


def main():
    parser = argparse.ArgumentParser(description="Convert a TRX file into Allure results.")
    parser.add_argument("--trx-file", required=True, type=Path, help="Path to the TRX file.")
    parser.add_argument("--output-dir", required=True, type=Path, help="Directory to write Allure JSON results.")
    args = parser.parse_args()

    if not args.trx_file.exists():
        raise SystemExit(f"TRX file not found: {args.trx_file}")

    tree = ET.parse(args.trx_file)
    root = tree.getroot()
    test_map = load_test_definitions(root)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    # Clean existing JSON files
    for existing in args.output_dir.glob("*-result.json"):
        existing.unlink()

    for result in root.findall(".//trx:Results/trx:UnitTestResult", NS):
        exec_id = result.attrib.get("executionId") or result.attrib.get("testId")
        class_name, method_name = test_map.get(exec_id, ("", result.attrib.get("testName", "")))
        entry = create_allure_entry(exec_id or str(uuid.uuid4()), class_name, method_name, result)
        out_file = args.output_dir / f"{entry['uuid']}-result.json"
        out_file.write_text(json.dumps(entry, indent=2))

    print(f"Converted TRX -> Allure results ({args.output_dir})")


if __name__ == "__main__":
    main()

