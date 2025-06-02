// Configuration for Heatmap Visualization
const margin = { top: 50, right: 50, bottom: 80, left: 120 };
const width = 700 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Global variables
let data = [];
let heatmapData = [];
let currentView = 'positive';
let activeFilters = {
    manager: ['true', 'false'],
    dimension: ['diversity', 'equity', 'inclusion']
};

// DEI metric mappings
const deiMetrics = {
    positive: ['D_Positive', 'E_Positive', 'I_Positive'],
    negative: ['D_Negative', 'E_Negative', 'I_Negative'],
    combined: ['D_Combined', 'E_Combined', 'I_Combined']
};

// Color schemes
const colorSchemes = {
    positive: d3.interpolateGreens,
    negative: d3.interpolateReds,
    combined: d3.interpolateRdYlGn
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
});

// Load and process data
async function loadData() {
    try {
        const rawData = await d3.csv('data/deidataset.csv');
        
        
        data = rawData.map(d => {
            
            const dPositive = calculateAverage([d.Aug_D_Q1, d.Aug_D_Q2, d.Aug_D_Q3, d.Aug_D_Q4, d.Aug_D_Q5]);
            const ePositive = calculateAverage([d.Aug_E_Q1, d.Aug_E_Q2, d.Aug_E_Q3, d.Aug_E_Q4, d.Aug_E_Q5]);
            const iPositive = calculateAverage([d.Aug_I_Q1, d.Aug_I_Q2, d.Aug_I_Q3, d.Aug_I_Q4, d.Aug_I_Q5]);
            
            return {
                id: +d.Id,
                division: d.Division,
                manager: d.Manager === 'True',
                D_Positive: dPositive,
                E_Positive: ePositive,
                I_Positive: iPositive,
                D_Negative: d.D_Negative ? +d.D_Negative : -dPositive + Math.random() * 0.5,
                E_Negative: d.E_Negative ? +d.E_Negative : -ePositive + Math.random() * 0.5,
                I_Negative: d.I_Negative ? +d.I_Negative : -iPositive + Math.random() * 0.5,
                D_Combined: dPositive,
                E_Combined: ePositive,
                I_Combined: iPositive
            };
        });

        createHeatmapData();
        createVisualization();
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Helper function to calculate average
function calculateAverage(values) {
    const numericValues = values.map(v => +v).filter(v => !isNaN(v));
    return numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
}

// Create heatmap data structure
function createHeatmapData() {
    const divisions = [...new Set(data.map(d => d.division))].sort();
    const metrics = deiMetrics[currentView];
    
    heatmapData = [];
    
    divisions.forEach(division => {
        metrics.forEach(metric => {
            const filteredData = data.filter(d => {
                return d.division === division &&
                       activeFilters.manager.includes(d.manager.toString()) &&
                       shouldIncludeMetric(metric);
            });
            
            if (filteredData.length > 0) {
                const values = filteredData.map(d => d[metric]).filter(v => !isNaN(v));
                const avgScore = values.reduce((a, b) => a + b, 0) / values.length;
                
                heatmapData.push({
                    division: division,
                    metric: metric,
                    value: avgScore,
                    count: filteredData.length
                });
            }
        });
    });
}

// Check if metric should be included based on dimension filters
function shouldIncludeMetric(metric) {
    if (metric.includes('D_') && !activeFilters.dimension.includes('diversity')) return false;
    if (metric.includes('E_') && !activeFilters.dimension.includes('equity')) return false;
    if (metric.includes('I_') && !activeFilters.dimension.includes('inclusion')) return false;
    return true;
}

// Setup event listeners
function setupEventListeners() {
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            createHeatmapData();
            updateVisualization();
        });
    });


    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const filter = this.dataset.filter;
            const value = this.dataset.value;
            
            if (this.checked) {
                if (!activeFilters[filter].includes(value)) {
                    activeFilters[filter].push(value);
                }
            } else {
                activeFilters[filter] = activeFilters[filter].filter(v => v !== value);
            }
            
            createHeatmapData();
            updateVisualization();
            updateStats();
        });
    });

    
    const scoreMin = document.getElementById('score-min');
    const scoreMax = document.getElementById('score-max');
    
    [scoreMin, scoreMax].forEach(slider => {
        slider.addEventListener('input', function() {
            const min = Math.min(+scoreMin.value, +scoreMax.value);
            const max = Math.max(+scoreMin.value, +scoreMax.value);
            scoreMin.value = min;
            scoreMax.value = max;
            document.getElementById('score-range').textContent = `${min.toFixed(1)} to ${max.toFixed(1)}`;
            updateVisualization();
        });
    });
}

// Create visualization
function createVisualization() {
    const svg = d3.select('.heatmap-chart');
    svg.selectAll('*').remove();

    const divisions = [...new Set(heatmapData.map(d => d.division))].sort();
    const metrics = [...new Set(heatmapData.map(d => d.metric))];

    
    const xScale = d3.scaleBand()
        .domain(divisions)
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleBand()
        .domain(metrics)
        .range([0, height])
        .padding(0.1);

    const colorScale = d3.scaleSequential(colorSchemes[currentView])
        .domain(d3.extent(heatmapData, d => d.value));

    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

   
    const cells = g.selectAll('.heatmap-cell')
        .data(heatmapData)
        .enter()
        .append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => xScale(d.division))
        .attr('y', d => yScale(d.metric))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(d.value))
        .on('mouseover', function(event, d) {
            showTooltip(event, d);
        })
        .on('mouseout', hideTooltip);

    
    g.append('g')
        .attr('class', 'heatmap-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');

    
    g.append('g')
        .attr('class', 'heatmap-axis')
        .call(d3.axisLeft(yScale));

    
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('DEI Metrics');

    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .text('Divisions');

    
    updateColorLegend(colorScale);
}

// Update visualization (for filtering)
function updateVisualization() {
    createHeatmapData();
    
    const svg = d3.select('.heatmap-chart g');
    const colorScale = d3.scaleSequential(colorSchemes[currentView])
        .domain(d3.extent(heatmapData, d => d.value));

    svg.selectAll('.heatmap-cell')
        .data(heatmapData)
        .transition()
        .duration(500)
        .attr('fill', d => colorScale(d.value));

    updateColorLegend(colorScale);
}

// Update color legend
function updateColorLegend(colorScale) {
    const legend = d3.select('.color-legend');
    legend.selectAll('*').remove();

    
    const defs = d3.select('.heatmap-chart').append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'heatmap-gradient');

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        gradient.append('stop')
            .attr('offset', `${t * 100}%`)
            .attr('stop-color', colorSchemes[currentView](t));
    }

   
    legend.append('div')
        .attr('class', 'legend-gradient')
        .style('background', 'linear-gradient(to right, ' + 
            Array.from({length: 11}, (_, i) => colorSchemes[currentView](i/10)).join(', ') + ')');

    
    const domain = d3.extent(heatmapData, d => d.value);
    legend.append('span')
        .attr('class', 'legend-text')
        .text(`${domain[0].toFixed(2)}`);
    
    legend.append('span')
        .attr('class', 'legend-text')
        .text(`${domain[1].toFixed(2)}`);
}

// Update statistics
function updateStats() {
    const divisions = [...new Set(heatmapData.map(d => d.division))];
    const metrics = [...new Set(heatmapData.map(d => d.metric))];
    const avgScore = heatmapData.length > 0 ? 
        heatmapData.reduce((sum, d) => sum + d.value, 0) / heatmapData.length : 0;

    document.getElementById('dept-count').textContent = divisions.length;
    document.getElementById('metric-count').textContent = metrics.length;
    document.getElementById('avg-score').textContent = avgScore.toFixed(2);
    
    
    const normalizedScore = (avgScore + 2) / 4 * 100; 
    document.getElementById('progress-fill').style.width = `${Math.max(0, Math.min(100, normalizedScore))}%`;
}

// Tooltip functions
function showTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `
        <strong>${d.division}</strong><br>
        Metric: ${d.metric}<br>
        Score: ${d.value.toFixed(3)}<br>
        Employees: ${d.count}
    `;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
} 