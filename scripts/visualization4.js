const margin = { top: 40, right: 40, bottom: 60, left: 60 };
const width = 700 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

let data = [];
let filteredData = [];
let currentXDimension = 'D_Positive';
let currentYDimension = 'E_Positive';
let showTrendline = false;
let showCorrelation = false;
let sizeByMarginalization = true;
let highlightOutliers = false;
let zoomEnabled = false;

let currentTransform = d3.zoomIdentity;
let zoom;
let xScale, yScale, sizeScale;
let mainGroup;

let marginalizationRange = [0, 5];
let ageRange = [24, 65];

let activeGroups = ['LGBTQ', 'Minority', 'Disability', 'Indigenous', 'Veteran'];
let activeCombinations = [];

const intersectionalColors = {
    'None': '#808080',
    'Single': '#4ecdc4',
    'LGBTQ': '#ff6b6b',
    'Minority': '#45b7d1',
    'Disability': '#96ceb4',
    'Indigenous': '#ffeaa7',
    'Veteran': '#dda0dd',
    'LGBTQ+Minority': '#ff4757',
    'Disability+Veteran': '#5f27cd',
    'Multiple': '#2d3436'
};

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
});

async function loadData() {
    try {
        const rawData = await d3.csv('data/deidataset.csv');
        
        data = rawData.map(d => {
            const dPositive = calculateAverage([d.Aug_D_Q1, d.Aug_D_Q2, d.Aug_D_Q3, d.Aug_D_Q4, d.Aug_D_Q5]);
            const ePositive = calculateAverage([d.Aug_E_Q1, d.Aug_E_Q2, d.Aug_E_Q3, d.Aug_E_Q4, d.Aug_E_Q5]);
            const iPositive = calculateAverage([d.Aug_I_Q1, d.Aug_I_Q2, d.Aug_I_Q3, d.Aug_I_Q4, d.Aug_I_Q5]);
            
            const isLGBTQ = d.LGBTQ === 'Yes';
            const isMinority = d.Ethnicity !== 'White';
            const hasDisability = d.Disability === 'Yes';
            const isIndigenous = d.Indigenous === 'Yes';
            const isVeteran = d.Veteran === 'Yes';
            
            const marginalizationCount = [isLGBTQ, isMinority, hasDisability, isIndigenous, isVeteran]
                .filter(Boolean).length;
            
            let intersectionalCategory = 'None';
            if (marginalizationCount === 0) {
                intersectionalCategory = 'None';
            } else if (marginalizationCount === 1) {
                if (isLGBTQ) intersectionalCategory = 'LGBTQ';
                else if (isMinority) intersectionalCategory = 'Minority';
                else if (hasDisability) intersectionalCategory = 'Disability';
                else if (isIndigenous) intersectionalCategory = 'Indigenous';
                else if (isVeteran) intersectionalCategory = 'Veteran';
            } else if (marginalizationCount === 2) {
                if (isLGBTQ && isMinority) intersectionalCategory = 'LGBTQ+Minority';
                else if (hasDisability && isVeteran) intersectionalCategory = 'Disability+Veteran';
                else intersectionalCategory = 'Multiple';
            } else {
                intersectionalCategory = 'Multiple';
            }
            
            return {
                id: +d.Id,
                name: d.Name || `Employee ${d.Id}`,
                division: d.Division,
                nationality: d.Nationality,
                age: +d.Age,
                gender: d.Gender,
                pronouns: d.Pronouns,
                D_Positive: dPositive,
                E_Positive: ePositive,
                I_Positive: iPositive,
                LGBTQ: isLGBTQ,
                Minority: isMinority,
                Disability: hasDisability,
                Indigenous: isIndigenous,
                Veteran: isVeteran,
                Marginalization_Count: marginalizationCount,
                Intersectional_Category: intersectionalCategory
            };
        });

        filterData();
        createVisualization();
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function calculateAverage(values) {
    const numericValues = values.map(v => +v).filter(v => !isNaN(v));
    return numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
}

function filterData() {
    filteredData = data.filter(d => {
        if (d.age < ageRange[0] || d.age > ageRange[1]) return false;
        
        if (d.Marginalization_Count < marginalizationRange[0] || d.Marginalization_Count > marginalizationRange[1]) return false;
        
        let hasActiveGroup = false;
        if (activeGroups.includes('LGBTQ') && d.LGBTQ) hasActiveGroup = true;
        if (activeGroups.includes('Minority') && d.Minority) hasActiveGroup = true;
        if (activeGroups.includes('Disability') && d.Disability) hasActiveGroup = true;
        if (activeGroups.includes('Indigenous') && d.Indigenous) hasActiveGroup = true;
        if (activeGroups.includes('Veteran') && d.Veteran) hasActiveGroup = true;
        
        if (d.Marginalization_Count === 0) hasActiveGroup = true;
        
        if (!hasActiveGroup) return false;
        
        if (activeCombinations.length > 0) {
            let matchesCombination = false;
            
            activeCombinations.forEach(combo => {
                switch (combo) {
                    case 'multiple':
                        if (d.Marginalization_Count >= 2) matchesCombination = true;
                        break;
                    case 'triple':
                        if (d.Marginalization_Count >= 3) matchesCombination = true;
                        break;
                    case 'lgbtq-minority':
                        if (d.LGBTQ && d.Minority) matchesCombination = true;
                        break;
                    case 'disability-veteran':
                        if (d.Disability && d.Veteran) matchesCombination = true;
                        break;
                }
            });
            
            if (!matchesCombination) return false;
        }
        
        return true;
    });
}

function setupEventListeners() {
    document.getElementById('reset-zoom').disabled = !zoomEnabled;
    
    document.getElementById('x-dimension').addEventListener('change', function() {
        currentXDimension = this.value;
        updateVisualization();
    });

    document.getElementById('y-dimension').addEventListener('change', function() {
        currentYDimension = this.value;
        updateVisualization();
    });

    document.getElementById('reset-zoom').addEventListener('click', function() {
        resetZoom();
    });

    document.getElementById('toggle-correlation').addEventListener('click', function() {
        showCorrelation = !showCorrelation;
        this.classList.toggle('active');
        this.textContent = showCorrelation ? 'Hide Correlation' : 'Show Correlation';
        updateVisualization();
    });

    document.getElementById('toggle-zoom').addEventListener('click', function() {
        zoomEnabled = !zoomEnabled;
        this.classList.toggle('active');
        this.textContent = zoomEnabled ? 'Disable Zoom' : 'Enable Zoom';
        
        const resetBtn = document.getElementById('reset-zoom');
        resetBtn.disabled = !zoomEnabled;
        
        currentTransform = d3.zoomIdentity;
        updateVisualization();
    });

    document.querySelectorAll('input[data-group]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const group = this.dataset.group;
            if (this.checked) {
                if (!activeGroups.includes(group)) {
                    activeGroups.push(group);
                }
            } else {
                activeGroups = activeGroups.filter(g => g !== group);
            }
            filterData();
            updateVisualization();
            updateStats();
        });
    });

    document.querySelectorAll('input[data-combination]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const combo = this.dataset.combination;
            if (this.checked) {
                if (!activeCombinations.includes(combo)) {
                    activeCombinations.push(combo);
                }
            } else {
                activeCombinations = activeCombinations.filter(c => c !== combo);
            }
            filterData();
            updateVisualization();
            updateStats();
        });
    });

    document.getElementById('show-trendline').addEventListener('change', function() {
        showTrendline = this.checked;
        updateVisualization();
    });

    document.getElementById('size-by-margin').addEventListener('change', function() {
        sizeByMarginalization = this.checked;
        updateVisualization();
    });

    document.getElementById('highlight-outliers').addEventListener('change', function() {
        highlightOutliers = this.checked;
        updateVisualization();
    });

    const marginMin = document.getElementById('margin-min');
    const marginMax = document.getElementById('margin-max');
    
    [marginMin, marginMax].forEach(slider => {
        slider.addEventListener('input', function() {
            const min = Math.min(+marginMin.value, +marginMax.value);
            const max = Math.max(+marginMin.value, +marginMax.value);
            marginMin.value = min;
            marginMax.value = max;
            marginalizationRange = [min, max];
            document.getElementById('margin-range').textContent = `${min}-${max}${max === 5 ? '+' : ''}`;
            filterData();
            updateVisualization();
            updateStats();
        });
    });

    const ageMin = document.getElementById('age-min');
    const ageMax = document.getElementById('age-max');
    
    [ageMin, ageMax].forEach(slider => {
        slider.addEventListener('input', function() {
            const min = Math.min(+ageMin.value, +ageMax.value);
            const max = Math.max(+ageMin.value, +ageMax.value);
            ageMin.value = min;
            ageMax.value = max;
            ageRange = [min, max];
            document.getElementById('age-range').textContent = `${min}-${max}`;
            filterData();
            updateVisualization();
            updateStats();
        });
    });
}

function createVisualization() {
    const svg = d3.select('.scatter-matrix');
    svg.selectAll('*').remove();

    if (filteredData.length === 0) return;

    xScale = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d[currentXDimension]))
        .nice()
        .range([0, width]);

    yScale = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d[currentYDimension]))
        .nice()
        .range([height, 0]);

    sizeScale = d3.scaleSqrt()
        .domain([0, 5])
        .range([3, 12]);

    mainGroup = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    svg.append('defs').append('clipPath')
        .attr('id', 'chart-clip')
        .append('rect')
        .attr('width', width)
        .attr('height', height);

    zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .extent([[0, 0], [width, height]])
        .on('zoom', handleZoom);

    if (zoomEnabled) {
        svg.call(zoom);
    } else {
        svg.on('.zoom', null);
    }

    const zoomContainer = mainGroup.append('g')
        .attr('class', 'zoom-container')
        .attr('clip-path', 'url(#chart-clip)');

    if (showTrendline) {
        const regression = calculateLinearRegression(filteredData, currentXDimension, currentYDimension);
        const x1 = xScale.domain()[0];
        const x2 = xScale.domain()[1];
        const y1 = regression.slope * x1 + regression.intercept;
        const y2 = regression.slope * x2 + regression.intercept;
        
        zoomContainer.append('line')
            .attr('class', 'trend-line')
            .attr('x1', xScale(x1))
            .attr('y1', yScale(y1))
            .attr('x2', xScale(x2))
            .attr('y2', yScale(y2));
    }

    const points = zoomContainer.selectAll('.scatter-point')
        .data(filteredData)
        .enter()
        .append('circle')
        .attr('class', 'scatter-point')
        .attr('cx', d => xScale(d[currentXDimension]))
        .attr('cy', d => yScale(d[currentYDimension]))
        .attr('r', d => sizeByMarginalization ? sizeScale(d.Marginalization_Count) : 4)
        .attr('fill', d => intersectionalColors[d.Intersectional_Category] || intersectionalColors['None'])
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            showTooltip(event, d);
            d3.select(this).classed('highlighted', true);
        })
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).classed('highlighted', false);
        });

    if (highlightOutliers) {
        const xMean = d3.mean(filteredData, d => d[currentXDimension]);
        const yMean = d3.mean(filteredData, d => d[currentYDimension]);
        const xStd = d3.deviation(filteredData, d => d[currentXDimension]);
        const yStd = d3.deviation(filteredData, d => d[currentYDimension]);
        
        points.filter(d => {
            const xZ = Math.abs((d[currentXDimension] - xMean) / xStd);
            const yZ = Math.abs((d[currentYDimension] - yMean) / yStd);
            return xZ > 2 || yZ > 2;
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
    }

    const xAxis = mainGroup.append('g')
        .attr('class', 'scatter-axis x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    const yAxis = mainGroup.append('g')
        .attr('class', 'scatter-axis y-axis')
        .call(d3.axisLeft(yScale));

    mainGroup.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text(getDimensionLabel(currentYDimension));

    mainGroup.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .text(getDimensionLabel(currentXDimension));

    if (showCorrelation) {
        const correlation = calculateCorrelation(filteredData, currentXDimension, currentYDimension);
        mainGroup.append('text')
            .attr('class', 'correlation-text')
            .attr('x', width - 10)
            .attr('y', 20)
            .attr('text-anchor', 'end')
            .text(`r = ${correlation.toFixed(3)}`);
    }

    if (currentTransform && !currentTransform.k === 1 && zoomEnabled) {
        svg.call(zoom.transform, currentTransform);
    }

    updateLegend();
}

function handleZoom(event) {
    currentTransform = event.transform;
    
    const newXScale = currentTransform.rescaleX(xScale);
    const newYScale = currentTransform.rescaleY(yScale);
    
    mainGroup.select('.x-axis').call(d3.axisBottom(newXScale));
    mainGroup.select('.y-axis').call(d3.axisLeft(newYScale));
    
    mainGroup.select('.zoom-container').selectAll('.scatter-point')
        .attr('cx', d => newXScale(d[currentXDimension]))
        .attr('cy', d => newYScale(d[currentYDimension]));
    
    if (showTrendline) {
        const regression = calculateLinearRegression(filteredData, currentXDimension, currentYDimension);
        const x1 = xScale.domain()[0];
        const x2 = xScale.domain()[1];
        const y1 = regression.slope * x1 + regression.intercept;
        const y2 = regression.slope * x2 + regression.intercept;
        
        mainGroup.select('.trend-line')
            .attr('x1', newXScale(x1))
            .attr('y1', newYScale(y1))
            .attr('x2', newXScale(x2))
            .attr('y2', newYScale(y2));
    }
}

function resetZoom() {
    if (!zoomEnabled) return;
    
    const svg = d3.select('.scatter-matrix');
    currentTransform = d3.zoomIdentity;
    
    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
}

function updateVisualization() {
    createVisualization();
}

function calculateLinearRegression(data, xField, yField) {
    const n = data.length;
    const sumX = d3.sum(data, d => d[xField]);
    const sumY = d3.sum(data, d => d[yField]);
    const sumXY = d3.sum(data, d => d[xField] * d[yField]);
    const sumXX = d3.sum(data, d => d[xField] * d[xField]);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
}

function calculateCorrelation(data, xField, yField) {
    const n = data.length;
    const sumX = d3.sum(data, d => d[xField]);
    const sumY = d3.sum(data, d => d[yField]);
    const sumXY = d3.sum(data, d => d[xField] * d[yField]);
    const sumXX = d3.sum(data, d => d[xField] * d[xField]);
    const sumYY = d3.sum(data, d => d[yField] * d[yField]);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
}

function getDimensionLabel(dimension) {
    const labels = {
        'Age': 'Age',
        'D_Positive': 'Diversity Score',
        'E_Positive': 'Equity Score',
        'I_Positive': 'Inclusion Score',
        'Marginalization_Count': 'Marginalization Level'
    };
    return labels[dimension] || dimension;
}

function updateLegend() {
    const legend = d3.select('.matrix-legend');
    legend.selectAll('*').remove();

    const activeCategories = [...new Set(filteredData.map(d => d.Intersectional_Category))];
    
    activeCategories.forEach(category => {
        const item = legend.append('div')
            .attr('class', 'legend-item');

        item.append('div')
            .attr('class', 'legend-color')
            .style('background-color', intersectionalColors[category]);

        item.append('span')
            .text(category);
    });
}

function updateStats() {
    document.getElementById('total-employees').textContent = data.length.toLocaleString();
    document.getElementById('visible-points').textContent = filteredData.length.toLocaleString();
    
    const correlation = calculateCorrelation(filteredData, currentXDimension, currentYDimension);
    document.getElementById('correlation-value').textContent = correlation.toFixed(3);
    
    const highMarginCount = filteredData.filter(d => d.Marginalization_Count >= 3).length;
    document.getElementById('high-margin-count').textContent = highMarginCount;
    
    const percentage = data.length > 0 ? (filteredData.length / data.length) * 100 : 0;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
}

function showTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    
    const intersectionalTraits = [];
    if (d.LGBTQ) intersectionalTraits.push('LGBTQ+');
    if (d.Minority) intersectionalTraits.push('Ethnic Minority');
    if (d.Disability) intersectionalTraits.push('Disability');
    if (d.Indigenous) intersectionalTraits.push('Indigenous');
    if (d.Veteran) intersectionalTraits.push('Veteran');
    
    tooltip.innerHTML = `
        <strong>${d.name}</strong><br>
        <strong>Division:</strong> ${d.division}<br>
        <strong>Nationality:</strong> ${d.nationality}<br>
        <strong>Age:</strong> ${d.age}<br>
        <strong>Pronouns:</strong> ${d.pronouns}<br>
        <hr style="margin: 0.5rem 0; border-color: rgba(255,255,255,0.3);">
        <strong>DEI Scores:</strong><br>
        Diversity: ${d.D_Positive.toFixed(2)}<br>
        Equity: ${d.E_Positive.toFixed(2)}<br>
        Inclusion: ${d.I_Positive.toFixed(2)}<br>
        <strong>Marginalization Level:</strong> ${d.Marginalization_Count}<br>
        <strong>Intersectional Traits:</strong><br>
        ${intersectionalTraits.length > 0 ? intersectionalTraits.join(', ') : 'None'}
    `;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
} 