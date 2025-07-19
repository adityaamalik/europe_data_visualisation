# EuroLife Dashboard - Visualizing Well-Being Across Europe

## Live demo : https://group4datavis.netlify.app/

**Group 4:** Aditya Malik, Aakrshan Sharma  
**Course:** 6171 UE Exercise: Data Visualization (SoSe 25)

## Quick Start

Open `index.html` in a web browser to run the project.

## Project Structure

```
├── index.html                     # Main application entry point
├── style.css                      # Styling for all components
├── dataVis.js                     # Part 1: Scatterplot & Radar Chart
├── dashboard.js                   # Part 2: Interactive Dashboard
├── Datasets - Task 2/
│   ├── raw/                       # Original downloaded datasets
│   │   ├── european_countries.json
│   │   ├── eurostat_income.csv
│   │   └── eurostat_life_satisfaction.csv
│   └── cleaned/                   # Preprocessed datasets
│       ├── european_countries.json
│       ├── eurostat_income.csv
│       └── eurostat_life_satisfaction.csv
└── README.md
```

## Dashboard Overview

The EuroLife Dashboard explores quality of life across European countries through four coordinated visualizations:

1. **Scatterplot** - Income vs Life Satisfaction correlation
2. **Radar Chart** - Multi-dimensional country comparison
3. **Choropleth Map** - Geographic distribution of well-being indicators
4. **Line Chart** - Temporal trends analysis

## Project Screenshot

Below is a screenshot of the EuroLife Dashboard in action:

![EuroLife Dashboard Screenshot](group4\_ screenshot_part2.png)

## Project Video Demo

Below is a video demonstration of the EuroLife Dashboard in action:

<video src="group4_ video_part2.mp4" controls width="600"></video>

## Datasets

### 1. Life Satisfaction (`eurostat_life_satisfaction.csv`)

- **Source:** Eurostat EU-SILC (ilc_pw01)
- **Content:** Self-assessed life satisfaction scores (0-10 scale)
- **Coverage:** EU countries + Norway, Switzerland
- **Time Period:** 2013, 2018, 2021-2023
- **Dimensions:** Country, Year, Age Group, Gender, Education Level

### 2. Income (`eurostat_income.csv`)

- **Source:** Eurostat EU-SILC (ilc_di03)
- **Content:** Median equivalised disposable income (PPS per inhabitant)
- **Coverage:** Same as life satisfaction dataset
- **Time Period:** 2013, 2018, 2021-2023
- **Dimensions:** Country, Year, Age Group, Gender, Education Level

### 3. Geographic Boundaries (`european_countries.json`)

- **Source:** Eurostat NUTS2JSON (NUTS Level 0)
- **Content:** European country boundaries in GeoJSON format
- **Projection:** WGS84 (EPSG 4326)
- **Properties:** Country codes, names, administrative boundaries

## Data Cleaning & Preparation

### Preprocessing Steps (Raw → Cleaned)

1. **Standardization**

   - Unified country codes across all datasets
   - Consistent column naming conventions
   - Standardized time period coverage

2. **Data Quality**

   - Removed entries with missing country identifiers
   - Filtered out invalid satisfaction scores (outside 0-10 range)
   - Excluded negative or zero income values

3. **Missing Value Handling**

   - Applied median imputation for missing income data
   - Used country-year averages for missing satisfaction scores
   - Documented all imputation decisions

4. **Data Integration**
   - Ensured consistent country coverage across datasets
   - Aligned temporal dimensions (same years available)
   - Validated geographic boundaries match statistical data

### Dynamic Data Cleaning (In Dashboard)

The JavaScript code includes additional data validation:

- Runtime data type conversion and validation
- Edge case handling for user interactions
- Derived metric calculations (growth rates, satisfaction changes)
- Error handling for data loading failures

## Technical Implementation

- **D3.js v7.x** for data visualization
- **jQuery 3.x & jQuery UI 1.13.x** for interface components
- **Responsive design** with coordinated interactions
- **Brushing & Linking** across all visualizations
- **Animated transitions** for smooth user experience

## Interaction Features

- **Hover tooltips** with detailed information
- **Country selection** synchronized across all charts
- **Time filtering** with animated transitions
- **Multi-dimensional analysis** through coordinated views
- **Export capabilities** for insights and visualizations
