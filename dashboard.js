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

// Global variables for dashboard
let lifeSatisfactionData, incomeData, geoData;
let combinedData = [];
let selectedCountries = new Set();
let selectedYear = 2023;
let colorScale, sizeScale;

// Chart containers
let scatterplotChart, radarChart, mapChart, lineChart;

// Dashboard dimensions
const dashboardMargin = { top: 20, right: 30, bottom: 40, left: 50 };
const chartWidth = 800;
const chartHeight = 600;

// Color scheme for countries
const countryColors = d3.scaleOrdinal(d3.schemeCategory10);

/**
 * Initialize the dashboard with cleaned data
 */
function initDashboard(_data) {
  // Load all three datasets
  Promise.all([
    d3.csv("Datasets - Task 2/cleaned/eurostat_life_satisfaction.csv"),
    d3.csv("Datasets - Task 2/cleaned/eurostat_income.csv"),
    d3.json("Datasets - Task 2/cleaned/european_countries.json"),
  ])
    .then(function ([lifeSatData, incData, mapData]) {
      // Store global references
      lifeSatisfactionData = lifeSatData;
      incomeData = incData;
      geoData = mapData;

      // Clean and prepare data
      prepareData();

      // Initialize chart containers
      initializeCharts();

      // Create interactive controls
      createControls();

      // Create all visualizations
      createAllCharts();
    })
    .catch(function (error) {
      console.error("❌ Error loading data:", error);
      showErrorMessage(
        "Failed to load dashboard data. Please check the console for details."
      );
    });
}

/**
 * Comprehensive country code mapping for proper data integration
 */
const countryCodeMapping = {
  // Map FROM geographic data codes (2-letter) TO possible CSV data formats

  // Standard EU countries - ISO 2-letter to various formats
  AT: ["AT", "AUT", "Austria"],
  BE: ["BE", "BEL", "Belgium"],
  BG: ["BG", "BGR", "Bulgaria"],
  HR: ["HR", "HRV", "Croatia"],
  CY: ["CY", "CYP", "Cyprus"],
  CZ: ["CZ", "CZE", "Czech Republic", "Czechia"],
  DK: ["DK", "DNK", "Denmark"],
  EE: ["EE", "EST", "Estonia"],
  FI: ["FI", "FIN", "Finland"],
  FR: ["FR", "FRA", "France"],
  DE: ["DE", "DEU", "Germany"],
  GR: ["GR", "GRC", "Greece", "EL"], // Greece uses EL in some Eurostat data
  HU: ["HU", "HUN", "Hungary"],
  IE: ["IE", "IRL", "Ireland"],
  IT: ["IT", "ITA", "Italy"],
  LV: ["LV", "LVA", "Latvia"],
  LT: ["LT", "LTU", "Lithuania"],
  LU: ["LU", "LUX", "Luxembourg"],
  MT: ["MT", "MLT", "Malta"],
  NL: ["NL", "NLD", "Netherlands"],
  PL: ["PL", "POL", "Poland"],
  PT: ["PT", "PRT", "Portugal"],
  RO: ["RO", "ROU", "Romania"],
  SK: ["SK", "SVK", "Slovakia"],
  SI: ["SI", "SVN", "Slovenia"],
  ES: ["ES", "ESP", "Spain"],
  SE: ["SE", "SWE", "Sweden"],

  // Non-EU European countries
  NO: ["NO", "NOR", "Norway"],
  CH: ["CH", "CHE", "Switzerland"],
  IS: ["IS", "ISL", "Iceland"],
  LI: ["LI", "LIE", "Liechtenstein"],
  GB: ["GB", "GBR", "United Kingdom", "UK"],
  RS: ["RS", "SRB", "Serbia"],
  ME: ["ME", "MNE", "Montenegro"],
  MK: ["MK", "MKD", "North Macedonia"],
  AL: ["AL", "ALB", "Albania"],
  BA: ["BA", "BIH", "Bosnia and Herzegovina"],
  XK: ["XK", "XKX", "Kosovo"],
  MD: ["MD", "MDA", "Moldova"],
  UA: ["UA", "UKR", "Ukraine"],
  BY: ["BY", "BLR", "Belarus"],
  TR: ["TR", "TUR", "Turkey"],
};

/**
 * Helper function to find matching country data using comprehensive mapping
 */
function findCountryMatch(geoCountryCode, dataCountries) {
  // Direct match first
  if (dataCountries.includes(geoCountryCode)) {
    return geoCountryCode;
  }

  // Check mapping variants
  if (countryCodeMapping[geoCountryCode]) {
    for (const variant of countryCodeMapping[geoCountryCode]) {
      if (dataCountries.includes(variant)) {
        return variant;
      }
    }
  }

  return null;
}

/**
 * Clean and prepare data for visualization
 */
function prepareData() {
  // Clean and convert data types
  lifeSatisfactionData.forEach((d) => {
    d.year = +d.year;
    d.life_satisfaction = +d.life_satisfaction;
    d.country = d.country.trim();
  });

  incomeData.forEach((d) => {
    d.year = +d.year;
    d.median_income = +d.median_income;
    d.country = d.country.trim();
  });

  // Check geographic data country codes
  if (geoData && geoData.features) {
    const geoCodes = geoData.features.map((f) => f.properties.id);
  }

  // Combine datasets by country and year
  combinedData = [];

  lifeSatisfactionData.forEach((lsRow) => {
    const matchingIncome = incomeData.find(
      (incRow) => incRow.country === lsRow.country && incRow.year === lsRow.year
    );

    if (matchingIncome) {
      combinedData.push({
        country: lsRow.country,
        year: lsRow.year,
        life_satisfaction: lsRow.life_satisfaction,
        median_income: matchingIncome.median_income,
        // Calculate derived metrics
        income_per_satisfaction:
          matchingIncome.median_income / lsRow.life_satisfaction,
      });
    }
  });

  // Calculate additional derived metrics
  calculateDerivedMetrics();

  // Set up scales
  setupScales();
}

/**
 * Calculate derived metrics for enhanced analysis
 */
function calculateDerivedMetrics() {
  // Calculate income growth rate and satisfaction change
  const countries = [...new Set(combinedData.map((d) => d.country))];

  countries.forEach((country) => {
    const countryData = combinedData
      .filter((d) => d.country === country)
      .sort((a, b) => a.year - b.year);

    for (let i = 1; i < countryData.length; i++) {
      const current = countryData[i];
      const previous = countryData[i - 1];

      // Income growth rate (%)
      current.income_growth =
        ((current.median_income - previous.median_income) /
          previous.median_income) *
        100;

      // Life satisfaction change
      current.satisfaction_change =
        current.life_satisfaction - previous.life_satisfaction;
    }
  });
}

/**
 * Set up color and size scales
 */
function setupScales() {
  const incomeExtent = d3.extent(combinedData, (d) => d.median_income);
  const satisfactionExtent = d3.extent(
    combinedData,
    (d) => d.life_satisfaction
  );

  colorScale = d3
    .scaleSequential(d3.interpolateViridis)
    .domain(satisfactionExtent);

  sizeScale = d3.scaleSqrt().domain(incomeExtent).range([4, 20]);
}

/**
 * Initialize chart containers
 */
function initializeCharts() {
  // Clear existing charts
  clearDashboard();

  // Chart 1: Scatterplot (Income vs Life Satisfaction)
  scatterplotChart = d3
    .select("#chart1")
    .append("svg")
    .attr("width", chartWidth + dashboardMargin.left + dashboardMargin.right)
    .attr("height", chartHeight + dashboardMargin.top + dashboardMargin.bottom)
    .append("g")
    .attr(
      "transform",
      `translate(${dashboardMargin.left},${dashboardMargin.top})`
    );

  // Chart 2: Radar Chart (Multi-dimensional comparison)
  radarChart = d3
    .select("#chart2")
    .append("svg")
    .attr("width", chartWidth + dashboardMargin.left + dashboardMargin.right)
    .attr("height", chartHeight + dashboardMargin.top + dashboardMargin.bottom)
    .append("g")
    .attr(
      "transform",
      `translate(${
        (chartWidth + dashboardMargin.left + dashboardMargin.right) / 2
      },${(chartHeight + dashboardMargin.top + dashboardMargin.bottom) / 2})`
    );

  // Chart 3: Choropleth Map (Geographic distribution)
  mapChart = d3
    .select("#chart3")
    .append("svg")
    .attr("width", chartWidth + dashboardMargin.left + dashboardMargin.right)
    .attr("height", chartHeight + dashboardMargin.top + dashboardMargin.bottom)
    .append("g")
    .attr(
      "transform",
      `translate(${dashboardMargin.left},${dashboardMargin.top})`
    );

  // Chart 4: Line Chart (Time trends)
  lineChart = d3
    .select("#chart4")
    .append("svg")
    .attr("width", chartWidth + dashboardMargin.left + dashboardMargin.right)
    .attr("height", chartHeight + dashboardMargin.top + dashboardMargin.bottom)
    .append("g")
    .attr(
      "transform",
      `translate(${dashboardMargin.left},${dashboardMargin.top})`
    );
}

/**
 * Create interactive controls
 */
function createControls() {
  // Year selector
  const years = [...new Set(combinedData.map((d) => d.year))].sort();

  // Add year selector to first chart container
  const controlDiv = d3
    .select("#chart1")
    .insert("div", "svg")
    .attr("class", "controls")
    .style("margin-bottom", "10px");

  controlDiv.append("label").text("Year: ").style("margin-right", "5px");

  const yearSelect = controlDiv
    .append("select")
    .attr("id", "yearSelector")
    .on("change", function () {
      selectedYear = +this.value;
      updateAllCharts();
    });

  yearSelect
    .selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d)
    .property("selected", (d) => d === selectedYear);

  // Clear selection button
  controlDiv
    .append("button")
    .text("Clear Selection")
    .style("margin-left", "10px")
    .on("click", function () {
      selectedCountries.clear();
      updateAllCharts();
    });
}

/**
 * Create all charts
 */
function createAllCharts() {
  createChart1(); // Scatterplot
  createChart2(); // Radar Chart
  createChart3(); // Choropleth Map
  createChart4(); // Line Chart
}

/**
 * Chart 1: Scatterplot (Income vs Life Satisfaction)
 */
function createChart1() {
  const currentData = combinedData.filter((d) => d.year === selectedYear);

  // Set up scales
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(currentData, (d) => d.median_income))
    .range([0, chartWidth]);

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(currentData, (d) => d.life_satisfaction))
    .range([chartHeight, 0]);

  // Clear previous content
  scatterplotChart.selectAll("*").remove();

  // Add axes
  scatterplotChart
    .append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale))
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", 35)
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Median Income (PPS)");

  scatterplotChart
    .append("g")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -35)
    .attr("x", -chartHeight / 2)
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Life Satisfaction (0-10)");

  // Add points
  const points = scatterplotChart
    .selectAll(".point")
    .data(currentData)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", (d) => xScale(d.median_income))
    .attr("cy", (d) => yScale(d.life_satisfaction))
    .attr("r", 6)
    .attr("fill", (d) =>
      selectedCountries.has(d.country) ? countryColors(d.country) : "#69b3a2"
    )
    .attr("stroke", (d) => (selectedCountries.has(d.country) ? "#333" : "#fff"))
    .attr("stroke-width", (d) => (selectedCountries.has(d.country) ? 2 : 1))
    .attr("opacity", 0.8)
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      toggleCountrySelection(d.country);
      updateAllCharts();
    })
    .on("mouseover", function (event, d) {
      showTooltip(
        event,
        `${d.country}<br/>Income: ${d.median_income.toFixed(
          0
        )} PPS<br/>Satisfaction: ${d.life_satisfaction.toFixed(1)}`
      );
    })
    .on("mouseout", hideTooltip);

  // Add title
  scatterplotChart
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text(`Income vs Life Satisfaction (${selectedYear})`);
}

/**
 * Chart 2: Radar Chart (Multi-dimensional comparison)
 */
function createChart2() {
  if (selectedCountries.size === 0) {
    radarChart.selectAll("*").remove();
    radarChart
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", 0)
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("Select countries in the scatterplot to compare");
    return;
  }

  const radius = Math.min(chartWidth, chartHeight) / 2 - 50;
  const dimensions = [
    "life_satisfaction",
    "median_income",
    "income_per_satisfaction",
  ];
  const dimensionLabels = [
    "Life Satisfaction",
    "Income Level",
    "Income Efficiency",
  ];

  // Prepare data for selected countries
  const radarData = Array.from(selectedCountries)
    .map((country) => {
      const countryData = combinedData.find(
        (d) => d.country === country && d.year === selectedYear
      );
      if (!countryData) return null;

      return {
        country: country,
        values: dimensions.map((dim, i) => ({
          dimension: dimensionLabels[i],
          value: countryData[dim],
          normalizedValue: normalizeValue(countryData[dim], dim),
        })),
      };
    })
    .filter((d) => d !== null);

  // Clear previous content
  radarChart.selectAll("*").remove();

  // Create radar chart structure
  const angleSlice = (Math.PI * 2) / dimensions.length;

  // Draw grid circles
  const levels = 5;
  for (let level = 1; level <= levels; level++) {
    radarChart
      .append("circle")
      .attr("r", (radius * level) / levels)
      .attr("fill", "none")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1);
  }

  // Draw axes
  const axes = radarChart
    .selectAll(".axis")
    .data(dimensionLabels)
    .enter()
    .append("g")
    .attr("class", "axis");

  axes
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (d, i) => radius * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y2", (d, i) => radius * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("stroke", "#999")
    .attr("stroke-width", 1);

  axes
    .append("text")
    .attr("x", (d, i) => (radius + 20) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y", (d, i) => (radius + 20) * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-size", "10px")
    .text((d) => d);

  // Draw data for each country
  radarData.forEach((countryData) => {
    const line = d3
      .lineRadial()
      .angle((d, i) => angleSlice * i)
      .radius((d) => radius * d.normalizedValue)
      .curve(d3.curveLinearClosed);

    // Draw line
    radarChart
      .append("path")
      .datum(countryData.values)
      .attr("d", line)
      .attr("fill", countryColors(countryData.country))
      .attr("fill-opacity", 0.1)
      .attr("stroke", countryColors(countryData.country))
      .attr("stroke-width", 2);

    // Draw points
    radarChart
      .selectAll(`.point-${countryData.country}`)
      .data(countryData.values)
      .enter()
      .append("circle")
      .attr("class", `point-${countryData.country}`)
      .attr(
        "cx",
        (d, i) =>
          radius * d.normalizedValue * Math.cos(angleSlice * i - Math.PI / 2)
      )
      .attr(
        "cy",
        (d, i) =>
          radius * d.normalizedValue * Math.sin(angleSlice * i - Math.PI / 2)
      )
      .attr("r", 4)
      .attr("fill", countryColors(countryData.country))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
  });

  // Add legend
  const legend = radarChart
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${-radius - 20}, ${radius - 20})`);

  radarData.forEach((d, i) => {
    const legendItem = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendItem
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", countryColors(d.country));

    legendItem
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .style("font-size", "10px")
      .text(d.country);
  });
}

/**
 * Normalize values for radar chart (0-1 scale)
 */
function normalizeValue(value, dimension) {
  const extent = d3.extent(combinedData, (d) => d[dimension]);
  return (value - extent[0]) / (extent[1] - extent[0]);
}

/**
 * Chart 3: Choropleth Map (Geographic distribution)
 */
function createChart3() {
  const currentData = combinedData.filter((d) => d.year === selectedYear);

  // Clear previous content
  mapChart.selectAll("*").remove();

  // Set up projection
  const projection = d3
    .geoMercator()
    .fitSize([chartWidth, chartHeight], geoData);

  const path = d3.geoPath().projection(projection);

  // Create color scale for life satisfaction
  const mapColorScale = d3
    .scaleSequential(d3.interpolateYlOrRd)
    .domain(d3.extent(currentData, (d) => d.life_satisfaction));

  // Helper function to get country data with comprehensive mapping
  function getCountryData(geoFeature) {
    // Get country code from the 'id' property
    const geoCountryCode = geoFeature.properties.id;

    if (!geoCountryCode) {
      console.warn("No country code found for feature:", geoFeature.properties);
      return null;
    }

    // Get all unique countries in current data
    const dataCountries = [...new Set(currentData.map((d) => d.country))];

    // Find matching country using comprehensive mapping
    const matchedCountryCode = findCountryMatch(geoCountryCode, dataCountries);

    if (matchedCountryCode) {
      const countryData = currentData.find(
        (cd) => cd.country === matchedCountryCode
      );
      if (countryData) {
        return countryData;
      }
    }

    return null;
  }

  // Helper function to get country name
  function getCountryName(geoFeature) {
    return (
      geoFeature.properties.na ||
      geoFeature.properties.name ||
      geoFeature.properties.id ||
      "Unknown"
    );
  }

  // Draw countries
  mapChart
    .selectAll(".country")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", (d) => {
      const countryData = getCountryData(d);
      return countryData
        ? mapColorScale(countryData.life_satisfaction)
        : "#f0f0f0";
    })
    .attr("stroke", (d) => {
      const countryData = getCountryData(d);
      return countryData && selectedCountries.has(countryData.country)
        ? "#333"
        : "#fff";
    })
    .attr("stroke-width", (d) => {
      const countryData = getCountryData(d);
      return countryData && selectedCountries.has(countryData.country) ? 3 : 1;
    })
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      const countryData = getCountryData(d);
      if (countryData) {
        toggleCountrySelection(countryData.country);
        updateAllCharts();
      }
    })
    .on("mouseover", function (event, d) {
      const countryName = getCountryName(d);
      const countryData = getCountryData(d);

      if (countryData) {
        showTooltip(
          event,
          `${countryName}<br/>Life Satisfaction: ${countryData.life_satisfaction.toFixed(
            1
          )}<br/>Income: ${countryData.median_income.toFixed(0)} PPS`
        );
      } else {
        const geoCountryCode = d.properties.id || "Unknown";
        showTooltip(
          event,
          `${countryName}<br/>Country Code: ${geoCountryCode}<br/>No data available for ${selectedYear}`
        );
      }
    })
    .on("mouseout", hideTooltip);

  // Add title
  mapChart
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text(`Life Satisfaction Across Europe (${selectedYear})`);

  // Add color legend
  const legendWidth = 200;
  const legendHeight = 10;

  const legend = mapChart
    .append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${chartWidth - legendWidth - 20}, ${chartHeight - 30})`
    );

  const legendScale = d3
    .scaleLinear()
    .domain(mapColorScale.domain())
    .range([0, legendWidth]);

  const legendAxis = d3
    .axisBottom(legendScale)
    .ticks(5)
    .tickFormat(d3.format(".1f"));

  // Create gradient
  const gradient = mapChart
    .append("defs")
    .append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  gradient
    .selectAll("stop")
    .data(d3.range(0, 1.1, 0.1))
    .enter()
    .append("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) =>
      mapColorScale(
        mapColorScale.domain()[0] +
          d * (mapColorScale.domain()[1] - mapColorScale.domain()[0])
      )
    );

  legend
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

  legend
    .append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis);
}

/**
 * Chart 4: Line Chart (Time trends)
 */
function createChart4() {
  if (selectedCountries.size === 0) {
    lineChart.selectAll("*").remove();
    lineChart
      .append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("Select countries to view trends");
    return;
  }

  // Prepare data for selected countries
  const lineData = Array.from(selectedCountries).map((country) => {
    const countryData = combinedData
      .filter((d) => d.country === country)
      .sort((a, b) => a.year - b.year);
    return {
      country: country,
      values: countryData,
    };
  });

  // Set up scales
  const years = d3.extent(combinedData, (d) => d.year);
  const xScale = d3.scaleLinear().domain(years).range([0, chartWidth]);

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(combinedData, (d) => d.life_satisfaction))
    .range([chartHeight, 0]);

  // Clear previous content
  lineChart.selectAll("*").remove();

  // Add axes
  lineChart
    .append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", 35)
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Year");

  lineChart
    .append("g")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -35)
    .attr("x", -chartHeight / 2)
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Life Satisfaction");

  // Create line generator
  const line = d3
    .line()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.life_satisfaction))
    .curve(d3.curveMonotoneX);

  // Draw lines for each country
  lineData.forEach((countryData) => {
    // Draw line
    lineChart
      .append("path")
      .datum(countryData.values)
      .attr("fill", "none")
      .attr("stroke", countryColors(countryData.country))
      .attr("stroke-width", 2)
      .attr("d", line);

    // Draw points
    lineChart
      .selectAll(`.point-${countryData.country}`)
      .data(countryData.values)
      .enter()
      .append("circle")
      .attr("class", `point-${countryData.country}`)
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => yScale(d.life_satisfaction))
      .attr("r", 4)
      .attr("fill", countryColors(countryData.country))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d) {
        showTooltip(
          event,
          `${d.country} (${
            d.year
          })<br/>Satisfaction: ${d.life_satisfaction.toFixed(
            1
          )}<br/>Income: ${d.median_income.toFixed(0)} PPS`
        );
      })
      .on("mouseout", hideTooltip);
  });

  // Add title
  lineChart
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Life Satisfaction Trends Over Time");

  // Add legend
  const legend = lineChart
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${chartWidth - 100}, 20)`);

  lineData.forEach((d, i) => {
    const legendItem = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendItem
      .append("line")
      .attr("x1", 0)
      .attr("x2", 15)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", countryColors(d.country))
      .attr("stroke-width", 2);

    legendItem
      .append("text")
      .attr("x", 20)
      .attr("y", 5)
      .style("font-size", "10px")
      .text(d.country);
  });
}

/**
 * Toggle country selection
 */
function toggleCountrySelection(country) {
  if (selectedCountries.has(country)) {
    selectedCountries.delete(country);
  } else {
    if (selectedCountries.size < 5) {
      // Limit to 5 countries for readability
      selectedCountries.add(country);
    }
  }
}

/**
 * Update all charts (for interactions)
 */
function updateAllCharts() {
  createChart1();
  createChart2();
  createChart3();
  createChart4();
}

/**
 * Tooltip functions
 */
function showTooltip(event, content) {
  // Remove existing tooltip
  d3.select(".tooltip").remove();

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .html(content);

  // Position tooltip
  tooltip
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 10 + "px");
}

function hideTooltip() {
  d3.select(".tooltip").remove();
}

/**
 * Show error message
 */
function showErrorMessage(message) {
  d3.selectAll(".container")
    .append("div")
    .style("color", "red")
    .style("font-weight", "bold")
    .style("text-align", "center")
    .style("margin", "20px")
    .text(message);
}

/**
 * Clear all dashboard charts
 */
function clearDashboard() {
  d3.select("#chart1").selectAll("*").remove();
  d3.select("#chart2").selectAll("*").remove();
  d3.select("#chart3").selectAll("*").remove();
  d3.select("#chart4").selectAll("*").remove();
}
