// Configuration
const margin = { top: 60, right: 100, bottom: 120, left: 100 };
const width = 1000 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Color schemes for different metrics
const colorSchemes = {
    Gender: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'],
    Age_Group: ['#ff6b6b', '#feca57', '#48dbfb', '#0abde3'],
    Ethnicity: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#fd79a8'],
    Sexual_Orientation: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
    LGBTQ: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
    Veteran: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
    Disability: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
    Indigenous: ['#ff6b6b', '#4ecdc4', '#45b7d1']
};

// Global variables
let data = [];
let filteredData = [];
let currentView = 'demographics';
let currentMetric = 'Gender';
let activeFilters = {
    divisions: new Set(),
    nationalities: new Set(),
    ageMin: 24,
    ageMax: 65
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
});

// Load and process data
async function loadData() {
    try {
        const rawData = await d3.csv('./data/deidataset.csv');
        data = rawData.map((d, i) => ({
            id: +d.Id,
            name: d.Name,
            surname: d.Surname,
            division: d.Division,
            manager: d.Manager,
            nationality: d.Nationality,
            gender: d.Gender,
            sexualOrientation: d.Sexual_Orientation,
            lgbtq: d.LGBTQ,
            indigenous: d.Indigenous,
            ethnicity: d.Ethnicity,
            disability: d.Disability,
            veteran: d.Veteran,
            age: +d.Age,
            ageGroup: getAgeGroup(+d.Age)
        }));

        filteredData = [...data];
        initializeFilters();
        updateVisualization();
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Helper function to create age groups
function getAgeGroup(age) {
    if (age <= 31) return '24-31';
    if (age <= 37) return '31-37';
    if (age <= 44) return '37-44';
    return '44-65';
}

// Setup event listeners
function setupEventListeners() {
    // View tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            updateVisualization();
        });
    });

    // Metric selector
    document.getElementById('metric-select').addEventListener('change', function() {
        currentMetric = this.value;
        updateVisualization();
    });

    // Age sliders
    const ageMin = document.getElementById('age-min');
    const ageMax = document.getElementById('age-max');
    
    [ageMin, ageMax].forEach(slider => {
        slider.addEventListener('input', function() {
            const min = Math.min(+ageMin.value, +ageMax.value);
            const max = Math.max(+ageMin.value, +ageMax.value);
            ageMin.value = min;
            ageMax.value = max;
            activeFilters.ageMin = min;
            activeFilters.ageMax = max;
            document.getElementById('age-range').textContent = `${min}-${max}`;
            filterData();
        });
    });
}

// Initialize filter checkboxes
function initializeFilters() {
    // Division filters
    const divisions = [...new Set(data.map(d => d.division))].sort();
    const divisionContainer = document.getElementById('division-filters');
    
    divisions.forEach(division => {
        const item = document.createElement('div');
        item.className = 'filter-item';
        item.innerHTML = `
            <input type="checkbox" id="div-${division}" checked data-type="division" data-value="${division}">
            <label for="div-${division}">${division}</label>
        `;
        item.querySelector('input').addEventListener('change', handleFilterChange);
        divisionContainer.appendChild(item);
        activeFilters.divisions.add(division);
    });

    // Nationality filters - show only top 10 most common
    const nationalityCounts = {};
    data.forEach(d => {
        nationalityCounts[d.nationality] = (nationalityCounts[d.nationality] || 0) + 1;
    });
    
    const topNationalities = Object.entries(nationalityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(d => d[0]);
    
    const nationalityContainer = document.getElementById('nationality-filters');
    
    topNationalities.forEach(nationality => {
        const item = document.createElement('div');
        item.className = 'filter-item';
        item.innerHTML = `
            <input type="checkbox" id="nat-${nationality}" checked data-type="nationality" data-value="${nationality}">
            <label for="nat-${nationality}">${nationality}</label>
        `;
        item.querySelector('input').addEventListener('change', handleFilterChange);
        nationalityContainer.appendChild(item);
        activeFilters.nationalities.add(nationality);
    });
}

// Handle filter changes
function handleFilterChange(event) {
    const type = event.target.dataset.type;
    const value = event.target.dataset.value;
    
    if (type === 'division') {
        if (event.target.checked) {
            activeFilters.divisions.add(value);
        } else {
            activeFilters.divisions.delete(value);
        }
    } else if (type === 'nationality') {
        if (event.target.checked) {
            activeFilters.nationalities.add(value);
        } else {
            activeFilters.nationalities.delete(value);
        }
    }
    
    filterData();
}

// Filter data based on active filters
function filterData() {
    filteredData = data.filter(d => {
        // Age filter
        if (d.age < activeFilters.ageMin || d.age > activeFilters.ageMax) return false;
        
        // Division filter
        if (activeFilters.divisions.size > 0 && !activeFilters.divisions.has(d.division)) return false;
        
        // Nationality filter
        if (activeFilters.nationalities.size > 0 && !activeFilters.nationalities.has(d.nationality)) return false;
        
        return true;
    });

    updateVisualization();
    updateStats();
}

// Get dimension value for data point
function getDimensionValue(d, dimension) {
    const mapping = {
        'Gender': d.gender,
        'Age_Group': d.ageGroup,
        'Ethnicity': d.ethnicity,
        'Sexual_Orientation': d.sexualOrientation,
        'LGBTQ': d.lgbtq,
        'Veteran': d.veteran,
        'Disability': d.disability,
        'Indigenous': d.indigenous
    };
    return mapping[dimension];
}

// Get shortened label for chart display only
function getShortLabel(value) {
    if (value === 'Non-binary/non-conforming') {
        return 'Non-b/Non-c';
    }
    return value;
}

// Update visualization based on current view
function updateVisualization() {
    const svg = d3.select('.main-chart');
    svg.selectAll('*').remove();

    const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    switch(currentView) {
        case 'demographics':
            drawDemographicsOverview(g);
            break;
        case 'divisions':
            drawByDivision(g);
            break;
        case 'age-groups':
            drawByAgeGroup(g);
            break;
        case 'diversity-index':
            drawDiversityIndex(g);
            break;
    }
}

// Draw demographics overview (Question 1)
function drawDemographicsOverview(g) {
    const metricValues = [...new Set(filteredData.map(d => getDimensionValue(d, currentMetric)))].filter(v => v);
    const counts = {};
    
    metricValues.forEach(value => {
        counts[value] = filteredData.filter(d => getDimensionValue(d, currentMetric) === value).length;
    });

    const data = Object.entries(counts).map(([key, value]) => ({ key, value }));
    data.sort((a, b) => b.value - a.value);

    // Create a mapping for short labels for x-axis display
    const dataWithShortLabels = data.map(d => ({
        ...d,
        shortLabel: getShortLabel(d.key)
    }));

    const xScale = d3.scaleBand()
        .domain(dataWithShortLabels.map(d => d.shortLabel))
        .range([0, width])
        .padding(0.4);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(metricValues)
        .range(colorSchemes[currentMetric] || d3.schemeCategory10);

    // Bars
    g.selectAll('.bar')
        .data(dataWithShortLabels)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.shortLabel))
        .attr('y', d => yScale(d.value))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.value))
        .attr('fill', d => colorScale(d.key))
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.key}: ${d.value} employees (${(d.value/filteredData.length*100).toFixed(1)}%)`);
            d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).attr('opacity', 0.8);
        });

    // Labels on bars
    g.selectAll('.bar-label')
        .data(dataWithShortLabels)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => xScale(d.shortLabel) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.value) - 8)
        .attr('text-anchor', 'middle')
        .style('fill', '#f9fafb')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .text(d => d.value);

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '500')
        .style('text-anchor', 'middle')
        .attr('dy', '1.2em');

    g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '500');

    // Axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .text('Number of Employees');

    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 20})`)
        .style('text-anchor', 'middle')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .text(currentMetric);

    // Title
    g.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('fill', '#f9fafb')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text(`Distribution by ${currentMetric}`);

    // Pass original values to legend so legend order matches chart order but keeps full names
    const sortedMetricValues = data.map(d => d.key);
    updateLegend(sortedMetricValues, colorScale);
}

// Draw by division (Questions 2 & 4)
function drawByDivision(g) {
    const divisions = [...new Set(filteredData.map(d => d.division))].sort();
    const metricValues = [...new Set(filteredData.map(d => getDimensionValue(d, currentMetric)))].filter(v => v);
    
    const data = divisions.map(division => {
        const divisionData = filteredData.filter(d => d.division === division);
        const counts = {};
        metricValues.forEach(value => {
            counts[value] = divisionData.filter(d => getDimensionValue(d, currentMetric) === value).length;
        });
        return {
            division,
            total: divisionData.length,
            values: metricValues.map(value => ({
                key: value,
                value: counts[value] || 0,
                percentage: divisionData.length > 0 ? (counts[value] || 0) / divisionData.length * 100 : 0
            }))
        };
    });

    const x0Scale = d3.scaleBand()
        .domain(divisions)
        .range([0, width])
        .padding(0.3);

    const x1Scale = d3.scaleBand()
        .domain(metricValues)
        .range([0, x0Scale.bandwidth()])
        .padding(0.15);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max(d.values, v => v.value))])
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(metricValues)
        .range(colorSchemes[currentMetric] || d3.schemeCategory10);

    // Grouped bars
    const divisionGroups = g.selectAll('.division-group')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'division-group')
        .attr('transform', d => `translate(${x0Scale(d.division)},0)`);

    divisionGroups.selectAll('.bar')
        .data(d => d.values)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x1Scale(d.key))
        .attr('y', d => yScale(d.value))
        .attr('width', x1Scale.bandwidth())
        .attr('height', d => height - yScale(d.value))
        .attr('fill', d => colorScale(d.key))
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            const division = d3.select(this.parentNode).datum().division;
            showTooltip(event, `${division} - ${d.key}: ${d.value} employees (${d.percentage.toFixed(1)}%)`);
            d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).attr('opacity', 0.8);
        });

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0Scale))
        .selectAll('text')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '500')
        .style('text-anchor', 'middle')
        .attr('dy', '1.2em');

    g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '500');

    // Axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .text('Number of Employees');

    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 20})`)
        .style('text-anchor', 'middle')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .text('Division');

    // Title
    g.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('fill', '#f9fafb')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text(`${currentMetric} Distribution by Division`);

    updateLegend(metricValues, colorScale);
}

// Draw by age group (Question 3)
function drawByAgeGroup(g) {
    const ageGroups = ['24-31', '31-37', '37-44', '44-65'];
    const metricValues = [...new Set(filteredData.map(d => getDimensionValue(d, currentMetric)))].filter(v => v);
    
    const data = ageGroups.map(ageGroup => {
        const ageGroupData = filteredData.filter(d => d.ageGroup === ageGroup);
        const counts = {};
        metricValues.forEach(value => {
            counts[value] = ageGroupData.filter(d => getDimensionValue(d, currentMetric) === value).length;
        });
        return {
            ageGroup,
            total: ageGroupData.length,
            values: metricValues.map(value => ({
                key: value,
                value: counts[value] || 0,
                percentage: ageGroupData.length > 0 ? (counts[value] || 0) / ageGroupData.length * 100 : 0
            }))
        };
    });

    const x0Scale = d3.scaleBand()
        .domain(ageGroups)
        .range([0, width])
        .padding(0.2);

    const x1Scale = d3.scaleBand()
        .domain(metricValues)
        .range([0, x0Scale.bandwidth()])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max(d.values, v => v.value))])
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(metricValues)
        .range(colorSchemes[currentMetric] || d3.schemeCategory10);

    // Grouped bars
    const ageGroups_g = g.selectAll('.age-group')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'age-group')
        .attr('transform', d => `translate(${x0Scale(d.ageGroup)},0)`);

    ageGroups_g.selectAll('.bar')
        .data(d => d.values)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x1Scale(d.key))
        .attr('y', d => yScale(d.value))
        .attr('width', x1Scale.bandwidth())
        .attr('height', d => height - yScale(d.value))
        .attr('fill', d => colorScale(d.key))
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            const ageGroup = d3.select(this.parentNode).datum().ageGroup;
            showTooltip(event, `Age ${ageGroup} - ${d.key}: ${d.value} employees (${d.percentage.toFixed(1)}%)`);
            d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).attr('opacity', 0.8);
        });

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0Scale))
        .selectAll('text')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '500')
        .style('text-anchor', 'middle')
        .attr('dy', '1.2em');

    g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '500');

    // Axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .text('Number of Employees');

    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 20})`)
        .style('text-anchor', 'middle')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .text('Age Group');

    // Title
    g.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('fill', '#f9fafb')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text(`${currentMetric} Distribution by Age Group`);

    updateLegend(metricValues, colorScale);
}

// Draw diversity index (Question 4)
function drawDiversityIndex(g) {
    const divisions = [...new Set(filteredData.map(d => d.division))].sort();
    
    const data = divisions.map(division => {
        const divisionData = filteredData.filter(d => d.division === division);
        
        // Calculate diversity score (Simpson's Diversity Index)
        const metricCounts = {};
        divisionData.forEach(d => {
            const value = getDimensionValue(d, currentMetric);
            metricCounts[value] = (metricCounts[value] || 0) + 1;
        });
        
        const total = divisionData.length;
        let diversityScore = 0;
        
        if (total > 0) {
            const proportions = Object.values(metricCounts).map(count => count / total);
            diversityScore = 1 - proportions.reduce((sum, p) => sum + p * p, 0);
        }
        
        return {
            division,
            diversityScore: diversityScore * 100, // Convert to percentage
            total
        };
    });

    data.sort((a, b) => b.diversityScore - a.diversityScore);

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.division))
        .range([0, width])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([0, 100]);

    // Bars
    g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.division))
        .attr('y', d => yScale(d.diversityScore))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.diversityScore))
        .attr('fill', d => colorScale(d.diversityScore))
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.division}: ${d.diversityScore.toFixed(1)}% diversity score (${d.total} employees)`);
            d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).attr('opacity', 0.8);
        });

    // Labels on bars
    g.selectAll('.bar-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => xScale(d.division) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.diversityScore) - 8)
        .attr('text-anchor', 'middle')
        .style('fill', '#f9fafb')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .text(d => d.diversityScore.toFixed(1) + '%');

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '500')
        .style('text-anchor', 'middle')
        .attr('dy', '1.2em');

    g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '500');

    // Axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .text('Diversity Score (%)');

    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 20})`)
        .style('text-anchor', 'middle')
        .style('fill', '#eaeef3')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .text('Division');

    // Title
    g.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('fill', '#f9fafb')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text(`Diversity Index by Division (${currentMetric})`);

    // Remove legend for diversity index view
    d3.select('.legend').selectAll('*').remove();
}

// Update legend
function updateLegend(values, colorScale) {
    const legend = d3.select('.legend');
    legend.selectAll('*').remove();

    if (!values || values.length === 0) return;

    const legendItems = legend.selectAll('.legend-item')
        .data(values)
        .enter()
        .append('div')
        .attr('class', 'legend-item');

    legendItems.append('div')
        .attr('class', 'legend-color')
        .style('background-color', d => colorScale(d));

    legendItems.append('span')
        .text(d => d);
}

// Update statistics
function updateStats() {
    document.getElementById('total-count').textContent = data.length.toLocaleString();
    document.getElementById('filtered-count').textContent = filteredData.length.toLocaleString();
    
    // Calculate overall diversity score
    const metricCounts = {};
    filteredData.forEach(d => {
        const value = getDimensionValue(d, currentMetric);
        metricCounts[value] = (metricCounts[value] || 0) + 1;
    });
    
    const total = filteredData.length;
    let diversityScore = 0;
    
    if (total > 0) {
        const proportions = Object.values(metricCounts).map(count => count / total);
        diversityScore = 1 - proportions.reduce((sum, p) => sum + p * p, 0);
    }
    
    document.getElementById('diversity-score').textContent = (diversityScore * 100).toFixed(1) + '%';
    
    const percentage = (filteredData.length / data.length) * 100;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
}

// Tooltip functions
function showTooltip(event, content) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = content;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
}