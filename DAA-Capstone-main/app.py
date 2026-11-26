"""Flask web application for the Mini-Courier Planner."""
from __future__ import annotations

from pathlib import Path
import time

from flask import Flask, jsonify, render_template, request

from src.algorithms import dijkstra, knapsack, merge_sort_parcels, nearest_neighbor_route
from src.io_utils import load_graph, load_parcels


BASE_DIR = Path(__file__).resolve().parent
PARCELS_PATH = BASE_DIR / "datasets" / "parcels.csv"
GRAPH_PATH = BASE_DIR / "datasets" / "routes.json"

app = Flask(__name__)


def build_plan(capacity: int) -> dict:
    if capacity < 1:
        raise ValueError("Capacity must be at least 1 kg.")

    parcels = load_parcels(PARCELS_PATH)
    graph = load_graph(GRAPH_PATH)

    timings = {}
    start = time.perf_counter()
    prioritized = merge_sort_parcels(parcels)
    timings["Merge sort"] = time.perf_counter() - start

    start = time.perf_counter()
    selected, value, table = knapsack(prioritized, capacity)
    timings["Knapsack DP"] = time.perf_counter() - start

    start = time.perf_counter()
    distances, _ = dijkstra(graph, "Depot")
    timings["Dijkstra"] = time.perf_counter() - start

    stops = list(dict.fromkeys(parcel.destination for parcel in selected))
    start = time.perf_counter()
    route = nearest_neighbor_route(graph, "Depot", stops)
    timings["Nearest-neighbor route"] = time.perf_counter() - start

    selected_ids = {parcel.parcel_id for parcel in selected}
    return {
        "capacity": capacity,
        "selected_weight": sum(parcel.weight for parcel in selected),
        "value": value,
        "prioritized": [
            {
                "parcel_id": parcel.parcel_id,
                "destination": parcel.destination,
                "weight": parcel.weight,
                "value": parcel.value,
                "priority": parcel.priority,
                "deadline": parcel.deadline,
            }
            for parcel in prioritized
        ],
        "selected": [
            {
                "parcel_id": parcel.parcel_id,
                "destination": parcel.destination,
                "weight": parcel.weight,
                "value": parcel.value,
                "priority": parcel.priority,
                "deadline": parcel.deadline,
            }
            for parcel in selected
        ],
        "not_selected": [
            {
                "parcel_id": parcel.parcel_id,
                "destination": parcel.destination,
                "weight": parcel.weight,
                "value": parcel.value,
                "priority": parcel.priority,
                "deadline": parcel.deadline,
            }
            for parcel in prioritized
            if parcel.parcel_id not in selected_ids
        ],
        "route": route.path,
        "route_distance": route.distance,
        "shortest_distances": distances,
        "timings": [
            {"component": name, "seconds": seconds}
            for name, seconds in timings.items()
        ],
        "nodes": list(graph.keys()),
    }


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/plan")
def api_plan():
    payload = request.get_json(silent=True) or {}
    try:
        capacity = int(payload.get("capacity", 15))
        return jsonify(build_plan(capacity))
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/api/dataset")
def api_dataset():
    parcels = load_parcels(PARCELS_PATH)
    graph = load_graph(GRAPH_PATH)
    return jsonify({
        "parcels": [
            {
                "parcel_id": parcel.parcel_id,
                "destination": parcel.destination,
                "weight": parcel.weight,
                "value": parcel.value,
                "priority": parcel.priority,
                "deadline": parcel.deadline,
            }
            for parcel in parcels
        ],
        "nodes": list(graph.keys()),
        "edges": graph,
    })


if __name__ == "__main__":
    app.run(debug=True)
