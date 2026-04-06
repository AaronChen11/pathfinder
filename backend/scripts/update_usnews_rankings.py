#!/usr/bin/env python3

import csv
import json
import re
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket


CSV_PATH = Path("/Users/aaronchen/Desktop/pathfinder/Schools.csv")
CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RANKINGS_URL = "https://www.usnews.com/best-colleges/rankings/national-universities?myCollege=national-universities&_sort=myCollege&_sortDirection=asc"
API_PATH = "/best-colleges/api/search?format=json&schoolType=national-universities&myCollege=national-universities&_sort=myCollege&_sortDirection=asc&"
PORT = 9224


ALIASES = {
    "College of William & Mary": ["William & Mary"],
    "University of California--Berkeley": ["University of California, Berkeley"],
    "University of California--Los Angeles": ["University of California, Los Angeles"],
    "University of California--Santa Barbara": ["University of California, Santa Barbara"],
    "University of California--Irvine": ["University of California, Irvine"],
    "University of California--Davis": ["University of California, Davis"],
    "University of California--San Diego": ["University of California, San Diego"],
    "University of California--Riverside": ["University of California, Riverside"],
    "University of California--Santa Cruz": ["University of California, Santa Cruz"],
    "University of California--Merced": ["University of California, Merced"],
    "University of Illinois--Urbana-Champaign": ["University of Illinois Urbana-Champaign"],
    "Binghamton University--SUNY": ["Binghamton University"],
    "Ohio State University--Columbus": ["The Ohio State University"],
    "Pennsylvania State University--University Park": ["The Pennsylvania State University--University Park"],
    "University of Texas--Austin": ["The University of Texas--Austin"],
    "University of Texas--Dallas": ["The University of Texas--Dallas"],
    "Purdue University--West Lafayette": ["Purdue University--Main Campus"],
    "Brigham Young University--Provo": ["Brigham Young University"],
    "Texas A&M University--College Station": ["Texas A&M University"],
    "North Carolina State University--Raleigh": ["North Carolina State University"],
    "University of Alabama": ["The University of Alabama"],
    "University of Tennessee": ["University of Tennessee--Knoxville"],
    "Iowa State University": ["Iowa State University of Science and Technology"],
    "University of Oklahoma": ["The University of Oklahoma"],
    "University of St. Thomas": ["University of St. Thomas (MN)"],
    "Arizona State University--Tempe": ["Arizona State University"],
    "New School": ["The New School"],
    "St. John Fisher College": ["St. John Fisher University"],
    "University of Alabama--Birmingham": ["University of Alabama at Birmingham"],
    "St. John's University": ["St. John's University (NY)"],
    "University of Hawaii--Manoa": ["University of Hawaii at Manoa"],
    "Edgewood College": ["Edgewood University"],
    "Indiana University-Purdue University--Indianapolis": ["Indiana University Indianapolis"],
    "University of Alabama--Huntsville": ["University of Alabama at Huntsville"],
    "University of North Carolina--Charlotte": ["University of North Carolina at Charlotte"],
    "Tennessee Technological University": ["Tennessee Tech University"],
    "Maryville University of St. Louis": ["Maryville University of Saint Louis"],
    "Tulane University": ["Tulane University of Louisiana"],
}


def normalize_name(name: str) -> str:
    cleaned = name.lower()
    replacements = {
        "--": " ",
        ",": " ",
        ".": " ",
        "&": " and ",
        "'": "",
        "saint": "st",
        "the ohio state university": "ohio state university",
        "penn state": "pennsylvania state university university park",
    }
    for old, new in replacements.items():
        cleaned = cleaned.replace(old, new)
    return " ".join(cleaned.split())


def wait_for_port(host: str, port: int, timeout: float = 20.0):
    start = time.time()
    while time.time() - start < timeout:
        sock = socket.socket()
        try:
            sock.settimeout(1.0)
            sock.connect((host, port))
            return
        except OSError:
            time.sleep(0.25)
        finally:
            sock.close()
    raise TimeoutError(f"Timed out waiting for {host}:{port}")


def open_ws():
    pages = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list"))
    page = next(
        p
        for p in pages
        if p.get("type") == "page"
        and "usnews.com/best-colleges/rankings/national-universities" in p.get("url", "")
    )
    return websocket.create_connection(page["webSocketDebuggerUrl"], origin=f"http://127.0.0.1:{PORT}")


def evaluate(ws, expression: str, await_promise: bool = False):
    ws.send(
        json.dumps(
            {
                "id": 1,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": expression,
                    "returnByValue": True,
                    "awaitPromise": await_promise,
                },
            }
        )
    )
    response = json.loads(ws.recv())
    return response["result"]["result"].get("value")


def fetch_rankings(ws):
    expression = f"""
    (async () => {{
      const base = "{API_PATH}";
      let page = 1;
      const out = [];
      while (true) {{
        const data = await fetch(`${{base}}_page=${{page}}`, {{credentials: "include"}}).then(r => r.json());
        for (const item of data.data.items) {{
          out.push({{
            name: item.institution.displayName,
            rank: item.ranking.sortRank,
            tuition: item.searchData.tuition,
            enrollment: item.searchData.enrollment,
            sat: item.searchData.satAvg,
            acceptance: item.searchData.acceptanceRate,
          }});
        }}
        if (!data.data.next_link) break;
        page += 1;
      }}
      return JSON.stringify(out);
    }})()
    """
    return json.loads(evaluate(ws, expression, await_promise=True))


def normalize_currency(value):
    if not value:
        return ""
    match = re.search(r"\$[\d,]+", str(value))
    if not match:
        return ""
    digits = re.sub(r"[^\d]", "", match.group(0))
    return f"${int(digits):,}" if digits else ""


def extract_in_state(sub_text):
    if not sub_text:
        return ""
    if isinstance(sub_text, list):
        text = " ".join(str(item) for item in sub_text)
    else:
        text = str(sub_text)
    match = re.search(r"\$[\d,]+", text)
    return normalize_currency(match.group(0)) if match else ""


def format_enrollment(enrollment):
    if not enrollment:
        return ""
    display = enrollment.get("displayValue")
    if isinstance(display, list) and display:
        value = display[0].get("value")
        return value or ""
    if isinstance(display, str):
        return display
    raw = enrollment.get("rawValue")
    return f"{int(raw):,}" if raw not in (None, "") else ""


def format_sat(sat):
    if not sat:
        return ""
    return sat.get("displayValue") or ""


def format_acceptance(acceptance):
    if not acceptance:
        return ""
    display = acceptance.get("displayValue")
    if display:
        return display.rstrip("%")
    raw = acceptance.get("rawValue")
    return str(raw) if raw not in (None, "") else ""


def main():
    with CSV_PATH.open(newline="", encoding="utf-8") as infile:
        rows = list(csv.DictReader(infile))
        fieldnames = rows[0].keys()

    profile_dir = tempfile.mkdtemp(prefix="usnews-rankings-")
    chrome = subprocess.Popen(
        [
            CHROME_PATH,
            f"--remote-debugging-port={PORT}",
            "--remote-allow-origins=*",
            f"--user-data-dir={profile_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            RANKINGS_URL,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        wait_for_port("127.0.0.1", PORT)
        time.sleep(5)
        ws = open_ws()
        try:
            rankings = fetch_rankings(ws)
        finally:
            ws.close()
    finally:
        chrome.terminate()
        try:
            chrome.wait(timeout=5)
        except subprocess.TimeoutExpired:
            chrome.kill()
        shutil.rmtree(profile_dir, ignore_errors=True)

    rank_map = {normalize_name(item["name"]): item for item in rankings}
    unmatched = []
    for row in rows:
        candidates = [row["Name"], *ALIASES.get(row["Name"], [])]
        matched_item = None
        for candidate in candidates:
            matched_item = rank_map.get(normalize_name(candidate))
            if matched_item is not None:
                break
        if matched_item is None:
            row["Rank"] = ""
            unmatched.append(row["Name"])
            continue

        tuition = matched_item.get("tuition") or {}
        row["Rank"] = str(matched_item["rank"])
        row["Tuition and fees"] = normalize_currency(tuition.get("displayValue"))
        in_state = extract_in_state(tuition.get("subText"))
        if in_state:
            row["In-state"] = in_state
        row["Undergrad Enrollment"] = format_enrollment(matched_item.get("enrollment"))
        row["SAT Range"] = format_sat(matched_item.get("sat"))
        row["Acceptance Rate"] = format_acceptance(matched_item.get("acceptance"))

    with CSV_PATH.open("w", newline="", encoding="utf-8") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Fetched rankings: {len(rankings)}")
    print(f"Matched: {len(rows) - len(unmatched)} / {len(rows)}")
    if unmatched:
        print("Unmatched:")
        for name in unmatched:
            print(name)


if __name__ == "__main__":
    main()
