#!/usr/bin/env python3

import csv
import json
import time
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path


CSV_PATH = Path("/Users/aaronchen/Desktop/pathfinder/Schools.csv")
API_KEY = "B2QoBnDDsR5fJfwPeaZuie95ecS3APrL707HNRvr"
API_URL = "https://api.data.gov/ed/collegescorecard/v1/schools"
FIELDS = [
    "id",
    "school.name",
    "school.city",
    "school.state",
    "school.degrees_awarded.predominant",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
    "latest.admissions.sat_scores.25th_percentile.critical_reading",
    "latest.admissions.sat_scores.75th_percentile.critical_reading",
    "latest.admissions.sat_scores.25th_percentile.math",
    "latest.admissions.sat_scores.75th_percentile.math",
]
HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://collegescorecard.ed.gov/",
    "Origin": "https://collegescorecard.ed.gov",
}
NAME_OVERRIDES = {
    "Binghamton University--SUNY": {"school.name": "Binghamton University"},
    "Maryville University of St. Louis": {"school.name": "Maryville University"},
    "Nova Southeastern University": {"school.name": "Nova Southeastern University"},
}


def normalize_name(name: str) -> str:
    lowered = name.lower()
    for token in ["--", "-", ",", ".", "&", "'", "(", ")", "/"]:
        lowered = lowered.replace(token, " ")
    return " ".join(lowered.split())


def format_currency(value):
    if value in (None, ""):
        return ""
    return f"${int(value):,}"


def format_sat_range(result):
    read_25 = result.get("latest.admissions.sat_scores.25th_percentile.critical_reading")
    read_75 = result.get("latest.admissions.sat_scores.75th_percentile.critical_reading")
    math_25 = result.get("latest.admissions.sat_scores.25th_percentile.math")
    math_75 = result.get("latest.admissions.sat_scores.75th_percentile.math")
    if None in (read_25, read_75, math_25, math_75):
        return ""
    return f"{int(read_25) + int(math_25)}–{int(read_75) + int(math_75)}"


def fetch_results(params):
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(f"{API_URL}?{query}", headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)["results"]


def choose_best_result(results, school_name, city, state):
    target = normalize_name(school_name)
    best = None
    best_score = -1.0
    for result in results:
        result_name = result.get("school.name", "")
        score = SequenceMatcher(None, target, normalize_name(result_name)).ratio()
        if result.get("school.city", "").lower() == city.lower():
            score += 0.2
        if result.get("school.state", "").upper() == state.upper():
            score += 0.1
        if result.get("school.degrees_awarded.predominant") == 3:
            score += 0.1
        if best is None or score > best_score:
            best = result
            best_score = score
    return best, best_score


def build_name_variants(name: str):
    variants = [name]
    if "--" in name:
        variants.append(name.replace("--", " "))
        variants.append(name.replace("--", "-"))
    compact = name.replace("&", "and")
    if compact not in variants:
        variants.append(compact)
    deduped = []
    for variant in variants:
        if variant not in deduped:
            deduped.append(variant)
    return deduped


def lookup_school(row):
    city, state = [part.strip() for part in row["Location"].split(",")]
    base_params = {
        "api_key": API_KEY,
        "school.city": city,
        "school.state": state,
        "fields": ",".join(FIELDS),
        "per_page": 20,
    }

    best = None
    best_score = -1.0
    if row["Name"] in NAME_OVERRIDES:
        params = dict(base_params)
        params.update(NAME_OVERRIDES[row["Name"]])
        if "school.city" not in NAME_OVERRIDES[row["Name"]]:
            params.pop("school.city", None)
        if "school.state" not in NAME_OVERRIDES[row["Name"]]:
            params["school.state"] = state
        results = fetch_results(params)
        if results:
            best, best_score = choose_best_result(results, row["Name"], city, state)
            if best and best_score >= 0.7:
                return best, best_score

    for variant in build_name_variants(row["Name"]):
        params = dict(base_params)
        params["school.name"] = variant
        results = fetch_results(params)
        if not results:
            continue
        candidate, score = choose_best_result(results, row["Name"], city, state)
        if candidate and score > best_score:
            best = candidate
            best_score = score
        if score >= 1.05:
            break

    if best is None:
        results = fetch_results(base_params)
        if results:
            best, best_score = choose_best_result(results, row["Name"], city, state)

    return best, best_score


def main():
    with CSV_PATH.open(newline="", encoding="utf-8") as infile:
        rows = list(csv.DictReader(infile))
        fieldnames = rows[0].keys()

    unmatched = []
    for index, row in enumerate(rows, start=1):
        result = None
        score = 0.0
        for attempt in range(3):
            try:
                result, score = lookup_school(row)
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(1.0)

        if result is None or score < 0.7:
            unmatched.append(f'{row["Name"]} ({row["Location"]}) score={score:.2f}')
            continue

        in_state = result.get("latest.cost.tuition.in_state")
        out_of_state = result.get("latest.cost.tuition.out_of_state")
        if out_of_state is None and in_state is not None:
            out_of_state = in_state

        row["Tuition and fees"] = format_currency(out_of_state)
        row["In-state"] = (
            format_currency(in_state)
            if in_state not in (None, "") and out_of_state not in (None, "") and int(in_state) != int(out_of_state)
            else ""
        )
        row["SAT Range"] = format_sat_range(result)

        if index % 25 == 0:
            print(f"Updated {index}/{len(rows)}")

    with CSV_PATH.open("w", newline="", encoding="utf-8") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Unmatched: {len(unmatched)}")
    for item in unmatched:
        print(item)


if __name__ == "__main__":
    main()
