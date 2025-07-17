/*
 * Data Visualization - Framework
 * Copyright (C) University of Passau
 *   Faculty of Computer Science and Mathematics
 *   Chair of Cognitive sensor systems
 * Maintenance:
 *   2025, Alexander Gall <alexander.gall@uni-passau.de>
 *
 * All rights reserved.
 */

// scatterplot axes
let xAxis, yAxis, xAxisLabel, yAxisLabel;
// radar chart axes
let radarAxes, radarAxesAngle;

let dimensions = [
  "dimension 1",
  "dimension 2",
  "dimension 3",
  "dimension 4",
  "dimension 5",
  "dimension 6",
];
//*HINT: the first dimension is often a label; you can simply remove the first dimension with
// dimensions.splice(0, 1);

// the visual channels we can use for the scatterplot
let channels = ["scatterX", "scatterY", "size"];

// size of the plots
let margin, width, height, radius;
// svg containers
let scatter, radar, dataTable;

// Add additional variables
let globalData = null;
let selectedPoints = []; // Array to store selected points
let selectedPointIds = new Set(); // Set to track selected point IDs
let firstColumnName = null; // Store the original first column name

// Track current selections for scatterX, scatterY, and size
let currentSelections = {
  scatterX: null,
  scatterY: null,
  size: null,
};

function init() {
  // Tooltip for scatterplot (create once, after body is loaded)
  let scatterTooltip = document.getElementById("scatterTooltip");
  if (!scatterTooltip) {
    scatterTooltip = document.createElement("div");
    scatterTooltip.id = "scatterTooltip";
    scatterTooltip.style.position = "fixed";
    scatterTooltip.style.background = "rgba(255,255,255,0.97)";
    scatterTooltip.style.border = "1px solid #333";
    scatterTooltip.style.padding = "8px";
    scatterTooltip.style.borderRadius = "4px";
    scatterTooltip.style.pointerEvents = "none";
    scatterTooltip.style.font = "13px sans-serif";
    scatterTooltip.style.zIndex = 10000;
    scatterTooltip.style.display = "none";
    document.body.appendChild(scatterTooltip);
  }
  window.scatterTooltip = scatterTooltip;

  // define size of plots
  margin = { top: 20, right: 20, bottom: 20, left: 50 };
  width = 600;
  height = 500;
  radius = width / 2;

  // Start at default tab
  document.getElementById("defaultOpen").click();

  // data table
  dataTable = d3.select("#dataTable");

  // scatterplot SVG container and axes
  scatter = d3
    .select("#sp")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("responsive-svg", true)
    .append("g");

  // radar chart SVG container and axes
  radar = d3
    .select("#radar")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("responsive-svg", true)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  // read and parse input file
  let fileInput = document.getElementById("upload"),
    readFile = function () {
      // clear existing visualizations
      clear();

      let reader = new FileReader();
      reader.onloadend = function () {
        // Parse the CSV data
        globalData = d3.csvParse(reader.result);

        console.log(globalData);

        // Call init functions with the parsed data
        initVis(globalData);
        CreateDataTable(globalData);
        // TODO: possible place to call the dashboard file for Part 2
        initDashboard(globalData);
      };
      reader.readAsBinaryString(fileInput.files[0]);
    };
  fileInput.addEventListener("change", readFile);

  // Add event listener for Reset button
  const resetButton = document.getElementById("resetButton");
  if (resetButton) {
    resetButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      // Clear file input
      fileInput.value = "";
      // Clear all visualizations and data
      clear();
    });
  }
}

function initVis(_data) {
  if (!_data || !_data.length) return;

  // Parse dimensions (attributes) from input file
  const allColumns = _data.columns;
  firstColumnName = allColumns[0];
  dimensions = allColumns.slice(1); // for charts only

  // Set up scales for scatterplot
  let y = d3
    .scaleLinear()
    .range([height - margin.bottom - margin.top, margin.top]);

  let x = d3
    .scaleLinear()
    .range([margin.left, width - margin.left - margin.right]);

  // Set up scale for radar chart
  let r = d3.scaleLinear().range([0, radius]);

  // scatterplot axes
  yAxis = scatter
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + margin.left + ")")
    .call(d3.axisLeft(y));

  yAxisLabel = yAxis
    .append("text")
    .style("text-anchor", "middle")
    .attr("y", margin.top / 2)
    .text("y-axis");

  xAxis = scatter
    .append("g")
    .attr("class", "axis")
    .attr(
      "transform",
      "translate(0, " + (height - margin.bottom - margin.top) + ")"
    )
    .call(d3.axisBottom(x));

  xAxisLabel = xAxis
    .append("text")
    .style("text-anchor", "middle")
    .attr("x", width - margin.right)
    .text("x-axis");

  // radar chart axes
  radarAxesAngle = (Math.PI * 2) / dimensions.length;
  let axisRadius = d3.scaleLinear().range([0, radius]);
  let maxAxisRadius = 0.75,
    textRadius = 0.8;
  gridRadius = 0.1;

  // radar axes
  radarAxes = radar
    .selectAll(".axis")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("class", "axis");

  radarAxes
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", function (d, i) {
      return radarX(axisRadius(maxAxisRadius), i);
    })
    .attr("y2", function (d, i) {
      return radarY(axisRadius(maxAxisRadius), i);
    })
    .attr("class", "line")
    .style("stroke", "black");

  // Add grid lines
  for (let i = 0.2; i <= 0.8; i += 0.2) {
    radar
      .append("path")
      .datum(dimensions)
      .attr("class", "grid")
      .attr(
        "d",
        d3
          .line()
          .x((d, j) => radarX(axisRadius(i), j))
          .y((d, j) => radarY(axisRadius(i), j))
          .curve(d3.curveLinearClosed)
      )
      .style("fill", "none")
      .style("stroke", "gray")
      .style("stroke-width", "0.5");
  }

  // Add axis labels
  radar
    .selectAll(".axisLabel")
    .data(dimensions)
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", function (d, i) {
      return radarX(axisRadius(textRadius), i);
    })
    .attr("y", function (d, i) {
      return radarY(axisRadius(textRadius), i);
    })
    .text((d) => d);

  // Initialize menus for visual channels
  channels.forEach(function (c) {
    initMenu(c, dimensions);
  });

  // Set sensible defaults for selections
  if (dimensions.length > 0) {
    currentSelections.scatterX = dimensions[0];
    currentSelections.scatterY =
      dimensions.length > 1 ? dimensions[1] : dimensions[0];
    currentSelections.size =
      dimensions.length > 2
        ? dimensions[2]
        : dimensions.length > 1
        ? dimensions[1]
        : dimensions[0];
  }
  // Update button text for each menu
  updateMenuButtonText("scatterX");
  updateMenuButtonText("scatterY");
  updateMenuButtonText("size");

  renderScatterplot();
  // Don't render radar chart initially - it should be empty
  // renderRadarChart();
}

// clear visualizations before loading a new file
function clear() {
  scatter.selectAll("*").remove();
  radar.selectAll("*").remove();
  dataTable.selectAll("*").remove();
  selectedPoints = []; // Clear selected points
  selectedPointIds.clear(); // Clear selected point IDs
  firstColumnName = null; // Reset first column name
}

//Create Table
function CreateDataTable(_data) {
  console.log("Parsed columns:", _data.columns);

  if (!_data || !_data.length) return;

  // Remove any existing table wrapper
  dataTable.selectAll(".uk-overflow-auto").remove();

  // Create a responsive wrapper div for the table
  const wrapper = dataTable.append("div").attr("class", "uk-overflow-auto");

  // Create table element with UIkit classes
  const table = wrapper
    .append("table")
    .attr("class", "uk-table uk-table-striped uk-table-hover uk-table-small");

  // Add table header
  const thead = table.append("thead");
  const headerRow = thead.append("tr");

  // Add header cells
  headerRow
    .selectAll("th")
    .data(_data.columns)
    .enter()
    .append("th")
    .text((d) => d);

  // Add table body
  const tbody = table.append("tbody");

  // Add data rows
  const rows = tbody.selectAll("tr").data(_data).enter().append("tr");

  // Add cells for each row
  rows
    .selectAll("td")
    .data((d) => _data.columns.map((key) => d[key]))
    .enter()
    .append("td")
    .text((d) => d);
}

function renderScatterplot() {
  if (!globalData || !globalData.length) return;

  // Get selected dimensions from menus
  const xDim = readMenu("scatterX");
  const yDim = readMenu("scatterY");
  const sizeDim = readMenu("size");

  // Update axis labels
  xAxisLabel.text(xDim);
  yAxisLabel.text(yDim);

  // Create scales
  const x = d3
    .scaleLinear()
    .domain(d3.extent(globalData, (d) => +d[xDim]))
    .range([margin.left, width - margin.left - margin.right]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(globalData, (d) => +d[yDim]))
    .range([height - margin.bottom - margin.top, margin.top]);

  const size = d3
    .scaleLinear()
    .domain(d3.extent(globalData, (d) => +d[sizeDim]))
    .range([3, 10]);

  // Update axes
  xAxis.transition().duration(500).call(d3.axisBottom(x));
  yAxis.transition().duration(500).call(d3.axisLeft(y));

  // Remove existing dots
  scatter.selectAll("circle").remove();

  // Add new dots
  scatter
    .selectAll("circle")
    .data(globalData)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(+d[xDim]))
    .attr("cy", (d) => y(+d[yDim]))
    .attr("r", (d) => size(+d[sizeDim]))
    .style("fill", (d, i) => {
      // Check if this point is selected and use appropriate color
      if (selectedPointIds.has(i)) {
        const color = d3
          .scaleOrdinal()
          .domain(selectedPoints.map((d, i) => i))
          .range(d3.schemeCategory10);
        const selectedIndex = selectedPoints.findIndex((item) => item === d);
        return color(selectedIndex);
      }
      return "steelblue";
    })
    .style("opacity", (d, i) => (selectedPointIds.has(i) ? 1 : 0.7))
    .attr("data-index", (d, i) => i) // Add index for identification
    .on("mouseover", function (event, d) {
      d3.select(this).style("fill", "orange").style("opacity", 1);
      // Show tooltip with all details
      let html = "<b>Details:</b><br>";
      Object.entries(d).forEach(([key, value]) => {
        html += `<b>${key}:</b> ${value}<br>`;
      });
      scatterTooltip.innerHTML = html;
      scatterTooltip.style.display = "block";
    })
    .on("mousemove", function (event) {
      // Use event.clientX/Y for fixed positioning
      scatterTooltip.style.left = event.clientX + 20 + "px";
      scatterTooltip.style.top = event.clientY + 10 + "px";
    })
    .on("mouseout", function (event, d) {
      // Only reset color if not selected
      const index = d3.select(this).attr("data-index");
      if (!selectedPointIds.has(parseInt(index))) {
        d3.select(this).style("fill", "steelblue").style("opacity", 0.7);
      } else {
        // Reset to selected color
        const color = d3
          .scaleOrdinal()
          .domain(selectedPoints.map((d, i) => i))
          .range(d3.schemeCategory10);
        const selectedIndex = selectedPoints.findIndex((item) => item === d);
        d3.select(this).style("fill", color(selectedIndex)).style("opacity", 1);
      }
      scatterTooltip.style.display = "none";
    })
    .on("click", function (event, d) {
      const index = parseInt(d3.select(this).attr("data-index"));
      togglePointSelection(index, d, this);
    });
}

function renderRadarChart() {
  if (!globalData || !globalData.length) return;

  // Only show selected points
  const dataToShow = selectedPoints;

  // If no points are selected, clear the radar chart
  if (dataToShow.length === 0) {
    radar.selectAll(".polyline").remove();
    radar.selectAll(".radar-dots").remove();
    // Clear only legend items, preserve the title
    const legend = d3.select("#legend");
    legend.selectAll(".legend-item").remove();
    return;
  }

  // Compute min/max for each dimension for normalization
  const axisScales = {};
  dimensions.forEach((dim) => {
    axisScales[dim] = d3
      .scaleLinear()
      .domain(d3.extent(globalData, (d) => +d[dim]))
      .range([0, 1]);
  });

  // Create color scale for selected points
  const color = d3
    .scaleOrdinal()
    .domain(dataToShow.map((d, i) => i))
    .range(d3.schemeCategory10);

  // Create radius scale - use a smaller radius to keep lines in bounds
  const maxRadius = radius * 0.7; // Use 70% of the full radius to ensure bounds
  const r = d3.scaleLinear().domain([0, 1]).range([0, maxRadius]);

  // Remove existing polylines
  radar.selectAll(".polyline").remove();
  radar.selectAll(".radar-dots").remove();

  // Clear legend items - do this before creating new ones
  const legend = d3.select("#legend");
  legend.selectAll(".legend-item").remove(); // Remove only legend items, preserve title

  // Add polylines for each selected data point (normalized)
  radar
    .selectAll(".polyline")
    .data(dataToShow)
    .enter()
    .append("path")
    .attr("class", "polyline")
    .attr("d", (d) => {
      const points = dimensions.map((dim, i) => {
        // Ensure the value is properly normalized and clamped
        let value = +d[dim];
        if (isNaN(value)) value = 0; // Handle non-numeric values

        const normalizedValue = axisScales[dim](value);
        // Clamp the value between 0 and 1 to ensure it stays in bounds
        const clampedValue = Math.max(0, Math.min(1, normalizedValue));

        return [radarX(r(clampedValue), i), radarY(r(clampedValue), i)];
      });
      return d3
        .line()
        .x((d) => d[0])
        .y((d) => d[1])
        .curve(d3.curveLinearClosed)(points);
    })
    .style("fill", "none") // Remove fill
    .style("stroke", (d, i) => color(i))
    .style("stroke-width", 4); // Make lines bolder

  // Add dots on each axis for each data point
  radar
    .selectAll(".radar-dots")
    .data(dataToShow)
    .enter()
    .append("g")
    .attr("class", "radar-dots")
    .selectAll("circle")
    .data((d) =>
      dimensions.map((dim, i) => ({ dim, value: +d[dim], index: i }))
    )
    .enter()
    .append("circle")
    .attr("cx", (d) => {
      // Ensure the value is properly normalized and clamped
      let value = d.value;
      if (isNaN(value)) value = 0; // Handle non-numeric values

      const normalizedValue = axisScales[d.dim](value);
      // Clamp the value between 0 and 1 to ensure it stays in bounds
      const clampedValue = Math.max(0, Math.min(1, normalizedValue));

      return radarX(r(clampedValue), d.index);
    })
    .attr("cy", (d) => {
      // Ensure the value is properly normalized and clamped
      let value = d.value;
      if (isNaN(value)) value = 0; // Handle non-numeric values

      const normalizedValue = axisScales[d.dim](value);
      // Clamp the value between 0 and 1 to ensure it stays in bounds
      const clampedValue = Math.max(0, Math.min(1, normalizedValue));

      return radarY(r(clampedValue), d.index);
    })
    .attr("r", 3)
    .style("fill", (d, i, nodes) => {
      // Get the color for this data point
      const dataIndex = d3.select(nodes[i].parentNode).datum();
      const colorIndex = dataToShow.indexOf(dataIndex);
      return color(colorIndex);
    })
    .style("stroke", "white")
    .style("stroke-width", 1);

  // Update legend (use first column as label if available)
  const labelKey = firstColumnName;

  legend
    .selectAll(".legend-item")
    .data(dataToShow)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .style("margin", "5px")
    .style("display", "flex")
    .style("align-items", "center")
    .style("cursor", "pointer")
    .html((d, i) => {
      const label = d[labelKey] || `Item ${i + 1}`;

      return `<span style=\"color:${color(i)}; margin-right: 5px;\">■</span> 
              <span style=\"flex-grow: 1;\">${label}</span>
              <span class=\"remove-point\" style=\"color: red; font-weight: bold; font-size: 16px; margin-left: 5px; cursor: pointer; text-shadow: 1px 1px 1px white, -1px -1px 1px white, 1px -1px 1px white, -1px 1px 1px white;\">✕</span>`;
    })
    .on("click", function (event, d) {
      // Only trigger if clicking on the cross icon
      if (event.target.classList.contains("remove-point")) {
        // Find the index of this data point in the original data
        const originalIndex = globalData.findIndex((item) => item === d);
        if (originalIndex !== -1) {
          // Remove from selection
          selectedPointIds.delete(originalIndex);
          selectedPoints = selectedPoints.filter((item) => item !== d);

          // Update scatterplot point color back to default
          const scatterPoint = scatter
            .selectAll("circle")
            .filter((item, index) => index === originalIndex);
          scatterPoint.style("fill", "steelblue").style("opacity", 0.7);

          // Re-render radar chart
          renderRadarChart();
        }
      }
    });
}

function radarX(radius, index) {
  return radius * Math.cos(radarAngle(index));
}

function radarY(radius, index) {
  return radius * Math.sin(radarAngle(index));
}

function radarAngle(index) {
  return radarAxesAngle * index - Math.PI / 2;
}

// Function to toggle point selection
function togglePointSelection(index, data, element) {
  if (selectedPointIds.has(index)) {
    // Deselect the point
    selectedPointIds.delete(index);
    selectedPoints = selectedPoints.filter((d, i) => {
      // Find the index of this data point in the original data
      const originalIndex = globalData.findIndex((item) => item === d);
      return originalIndex !== index;
    });
    d3.select(element).style("fill", "steelblue").style("opacity", 0.7);
  } else {
    // Select the point
    selectedPointIds.add(index);
    selectedPoints.push(data);

    // Use the same color as the radar chart
    const color = d3
      .scaleOrdinal()
      .domain(selectedPoints.map((d, i) => i))
      .range(d3.schemeCategory10);
    const colorIndex = selectedPoints.length - 1; // Index of the newly added point
    d3.select(element).style("fill", color(colorIndex)).style("opacity", 1);
  }

  // Update radar chart with selected points
  renderRadarChart();
}

// init scatterplot select menu for custom HTML structure
function initMenu(id, entries) {
  // Find the menu UL and button
  const menuId = id + "Menu";
  const buttonId = id + "Button";
  const menu = document.getElementById(menuId);
  const button = document.getElementById(buttonId);
  if (!menu || !button) return;

  // Clear previous menu items
  menu.innerHTML = "";

  // Add menu items
  entries.forEach((d) => {
    const li = document.createElement("li");
    li.className = "uk-nav-item";
    li.textContent = d;
    li.style.cursor = "pointer";
    li.onclick = function () {
      currentSelections[id] = d;
      updateMenuButtonText(id);
      renderScatterplot();
    };
    menu.appendChild(li);
  });
}

// Update the button text to reflect the current selection
function updateMenuButtonText(id) {
  const button = document.getElementById(id + "Button");
  if (button) {
    button.textContent = currentSelections[id]
      ? currentSelections[id]
      : "Select " + id.charAt(0).toUpperCase() + id.slice(1);
  }
}

// read current scatterplot parameters
function readMenu(id) {
  return currentSelections[id];
}

// switches and displays the tabs
function openPage(pageName, elm) {
  // Show the selected page (you already have this part likely)
  const tabPages = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabPages.length; i++) {
    tabPages[i].style.display = "none";
  }
  document.getElementById(pageName).style.display = "block";

  // Remove 'uk-active' from all tabs
  const allTabs = document.querySelectorAll(".uk-tab li");
  allTabs.forEach((tab) => tab.classList.remove("uk-active"));

  // Add 'uk-active' to the clicked tab
  elm.parentElement.classList.add("uk-active");
}

// Optional: open default tab on load
window.onload = function () {
  document.querySelector(".uk-tab li a").click();
};
