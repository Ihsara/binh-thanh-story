/**
 * road-beneath-overlay.js — Task 3
 * Initialises the "maps through time" Leaflet map:
 *   - OSM base tile layer (with required OpenStreetMap attribution)
 *   - 1748 Thiên Lý route polyline on a high-z pane (stays on top of overlays)
 *   - Registry of L.imageOverlay instances (one per manifest layer) — NONE added
 *     to the map on page-load (lazy: Task 4 adds them on first toggle)
 *
 * Exports (window.ovlMap.*) consumed by Task 4:
 *   window.ovlMap.map          — the Leaflet map instance
 *   window.ovlMap.overlayRegistry — Map<id, L.ImageOverlay> (not yet on map)
 *   window.ovlMap.routeLayer   — L.Polyline (already on map)
 */

(function () {
  "use strict";

  /* District bbox: W=106.684 S=10.785 E=106.751 N=10.839 */
  var DISTRICT_BOUNDS = [[10.785, 106.684], [10.839, 106.751]];

  /* OSM tile attribution — REQUIRED by the tile provider */
  var OSM_ATTRIBUTION =
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  /* Route accent colour — warm brown matching the poster palette */
  var ROUTE_COLOR = "#a0522d";

  function init() {
    /* ── 1. Create the Leaflet map ── */
    var map = L.map("ovl-map", {
      attributionControl: true,
    }).fitBounds(DISTRICT_BOUNDS);

    /* ── 2. OSM base tile layer ── */
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    /* ── 3. Custom pane for the route (z-index above overlay images) ── */
    map.createPane("routePane");
    map.getPane("routePane").style.zIndex = 650;

    /* ── 4. Load both JSON files, then draw route + build overlay registry ── */
    Promise.all([
      fetch("overlay-maps.json").then(function (r) { return r.json(); }),
      fetch("road-beneath-route.json").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      var manifest = results[0];  /* overlay-maps.json */
      var routeData = results[1]; /* road-beneath-route.json */

      /* 4a. Draw the 1748 route polyline.
       * road-beneath-route.json stores coords as [lon, lat].
       * Leaflet needs [lat, lng] — swap each pair.
       */
      var rawCoords = routeData.route_1748.coords; /* [[lon, lat], …] */
      var latLngs = rawCoords.map(function (c) {
        return [c[1], c[0]]; /* swap: [lat, lng] */
      });

      var routeLayer = L.polyline(latLngs, {
        color: ROUTE_COLOR,
        weight: 3,
        opacity: 0.9,
        pane: "routePane",
      }).addTo(map);

      /* 4b. Build the overlay registry (lazy — NOT added to map yet).
       * Each manifest layer has: id, img, bbox:[w,s,e,n]
       * L.imageOverlay bounds: [[latSW, lngSW], [latNE, lngNE]]
       */
      var overlayRegistry = new Map();
      manifest.layers.forEach(function (layer) {
        var w = layer.bbox[0], s = layer.bbox[1],
            e = layer.bbox[2], n = layer.bbox[3];
        var bounds = [[s, w], [n, e]];
        /* Create the overlay instance but DO NOT .addTo(map) */
        var overlay = L.imageOverlay("overlays/" + layer.img.replace(/^overlays\//, ""), bounds, {
          opacity: 0.7,
        });
        /* Store the full layer metadata alongside the Leaflet object */
        overlayRegistry.set(layer.id, {
          overlay: overlay,
          meta: layer,
          added: false, /* Task 4 sets this true on first toggle */
        });
      });

      /* ── 5. Expose API + build filter panel ── */
      window.ovlMap = {
        map: map,
        overlayRegistry: overlayRegistry,
        routeLayer: routeLayer,
      };

      /* ── 6. Build the filter panel in #ovl-filter ── */
      buildFilterPanel(manifest.layers, overlayRegistry, map);
    }).catch(function (err) {
      console.error("[road-beneath-overlay] Failed to load map data:", err);
    });
  }

  /**
   * buildFilterPanel — renders one toggle + optional opacity slider per layer.
   * @param {Array}  layers          manifest.layers (newest→oldest order preserved)
   * @param {Map}    overlayRegistry  Map<id, {overlay, meta, added}>
   * @param {Object} map             Leaflet map instance
   */
  function buildFilterPanel(layers, overlayRegistry, map) {
    var container = document.getElementById("ovl-filter");
    if (!container) return;

    /* ── header row ── */
    var header = document.createElement("div");
    header.className = "ovl-filter-header";
    header.innerHTML =
      '<span class="ovl-filter-title">Historical map overlays</span>';

    /* "Today only / reset" button */
    var resetBtn = document.createElement("button");
    resetBtn.className = "ovl-reset";
    resetBtn.textContent = "Reset — today only";
    resetBtn.setAttribute("type", "button");
    resetBtn.addEventListener("click", function () {
      overlayRegistry.forEach(function (entry) {
        if (entry.added) {
          map.removeLayer(entry.overlay);
          entry.added = false;
        }
      });
      /* reflect in UI */
      container.querySelectorAll(".ovl-toggle").forEach(function (btn) {
        btn.setAttribute("aria-pressed", "false");
        btn.classList.remove("on");
        var sliderRow = btn.parentElement &&
          btn.parentElement.querySelector(".ovl-slider-row");
        if (sliderRow) sliderRow.style.display = "none";
      });
    });
    header.appendChild(resetBtn);
    container.appendChild(header);

    /* ── one card per layer ── */
    layers.forEach(function (layer) {
      var entry = overlayRegistry.get(layer.id);
      if (!entry) return;

      var isIllustrative = !!layer.illustrative;

      /* Apply 1815 ghost treatment: sepia blend + lower max opacity */
      if (isIllustrative) {
        /* className on imageOverlay applies to the <img> element Leaflet creates */
        entry.overlay.options.className =
          (entry.overlay.options.className || "") + " ovl-illustrative";
        /* Cap opacity at 0.5 for the illustrative layer */
        entry.overlay.options.opacity = 0.45;
        entry.overlay.setOpacity(0.45);
      }

      var card = document.createElement("div");
      card.className = "ovl-card" + (isIllustrative ? " ovl-card--illustrative" : "");

      /* Toggle button */
      var toggleBtn = document.createElement("button");
      toggleBtn.className = "ovl-toggle" +
        (isIllustrative ? " ovl-toggle--illustrative" : "");
      toggleBtn.setAttribute("type", "button");
      toggleBtn.setAttribute("aria-pressed", "false");
      toggleBtn.textContent = layer.label;

      /* Opacity slider row (hidden until toggle is on) */
      var sliderRow = document.createElement("div");
      sliderRow.className = "ovl-slider-row";
      sliderRow.style.display = "none";

      var sliderLabel = document.createElement("label");
      sliderLabel.className = "ovl-slider-label";
      sliderLabel.textContent = "Opacity";

      var slider = document.createElement("input");
      slider.type = "range";
      slider.className = "ovl-opacity-slider";
      slider.min = "0.15";
      slider.max = isIllustrative ? "0.5" : "1";
      slider.step = "0.05";
      slider.value = isIllustrative ? "0.45" : "0.7";
      slider.setAttribute("aria-label", "Opacity for " + layer.label);

      slider.addEventListener("input", function () {
        entry.overlay.setOpacity(parseFloat(slider.value));
      });

      sliderLabel.appendChild(slider);
      sliderRow.appendChild(sliderLabel);

      /* Toggle click handler */
      toggleBtn.addEventListener("click", function () {
        var isOn = toggleBtn.getAttribute("aria-pressed") === "true";
        if (isOn) {
          /* Turn OFF */
          map.removeLayer(entry.overlay);
          entry.added = false;
          toggleBtn.setAttribute("aria-pressed", "false");
          toggleBtn.classList.remove("on");
          sliderRow.style.display = "none";
        } else {
          /* Turn ON — lazy add on first click */
          entry.overlay.addTo(map);
          entry.added = true;
          /* Apply illustrative class after the element exists in the DOM */
          if (isIllustrative) {
            var el = entry.overlay.getElement && entry.overlay.getElement();
            if (el) el.classList.add("ovl-illustrative");
          }
          /* Route pane (z-index 650) always stays above imageOverlay pane (400) */
          toggleBtn.setAttribute("aria-pressed", "true");
          toggleBtn.classList.add("on");
          sliderRow.style.display = "flex";
          /* Sync slider value → overlay opacity */
          entry.overlay.setOpacity(parseFloat(slider.value));
        }
      });

      card.appendChild(toggleBtn);
      card.appendChild(sliderRow);
      container.appendChild(card);
    });
  }

  /**
   * wireInvalidateSize — attach a ResizeObserver + IntersectionObserver to
   * #ovl-map so that window.ovlMap.map.invalidateSize() is called whenever
   * the container is resized or scrolled into view (handles the common case
   * where the map was initialised while the section was hidden / zero-height).
   */
  function wireInvalidateSize() {
    var mapEl = document.getElementById("ovl-map");
    if (!mapEl) return;

    function doInvalidate() {
      if (window.ovlMap && window.ovlMap.map) {
        window.ovlMap.map.invalidateSize();
      }
    }

    /* ResizeObserver: fires whenever the map container changes size */
    if (typeof ResizeObserver !== "undefined") {
      var ro = new ResizeObserver(doInvalidate);
      ro.observe(mapEl);
    }

    /* IntersectionObserver: fires when the section scrolls into the viewport */
    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) doInvalidate();
        });
      }, { threshold: 0.05 });
      io.observe(mapEl);
    }
  }

  /* Wait for DOM ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
      wireInvalidateSize();
    });
  } else {
    init();
    wireInvalidateSize();
  }
})();
