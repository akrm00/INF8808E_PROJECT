// Configuration for Grouped Bar Chart Visualization
const margin = { top: 40, right: 40, bottom: 80, left: 60 };
const width = 700 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

// Global variables
let data = [];
let chartData = [];
let currentDemographic = 'Gender';
let currentView = 'positive';
let currentSort = 'alphabetical';
let sortOrder = 'desc';
let activeDimensions = ['diversity', 'equity', 'inclusion'];
let showErrorBars = false;
let showSampleSize = true;
let minSampleSize = 1;

// DEI colors
const deiColors = {
    diversity: '#ff6b6b',
    equity: '#4ecdc4', 
    inclusion: '#45b7d1'
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
                gender: d.Gender,
                ethnicity: d.Ethnicity,
                lgbtq: d.LGBTQ,
                disability: d.Disability,
                veteran: d.Veteran,
                indigenous: d.Indigenous,
                diversity_positive: dPositive,
                equity_positive: ePositive,
                inclusion_positive: iPositive,
                diversity_negative: d.D_Negative ? +d.D_Negative : -dPositive + Math.random() * 0.5,
                equity_negative: d.E_Negative ? +d.E_Negative : -ePositive + Math.random() * 0.5,
                inclusion_negative: d.I_Negative ? +d.I_Negative : -iPositive + Math.random() * 0.5
            };
        });

        createChartData();
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

// Create chart data structure
function createChartData() {
    const dimensionMap = {
        'Gender': 'gender',
        'Ethnicity': 'ethnicity', 
        'LGBTQ': 'lgbtq',
        'Disability': 'disability',
        'Veteran': 'veteran',
        'Indigenous': 'indigenous'
    };
    
    const field = dimensionMap[currentDemographic];
    const categories = [...new Set(data.map(d => d[field]))].filter(c => c && c !== '');
    
    chartData = [];
    
    categories.forEach(category => {
        const categoryData = data.filter(d => d[field] === category);
        
        if (categoryData.length >= minSampleSize) {
            const item = {
                category: category,
                count: categoryData.length
            };
            
            
            activeDimensions.forEach(dimension => {
                const scoreField = `${dimension}_${currentView}`;
                const scores = categoryData.map(d => d[scoreField]).filter(s => !isNaN(s));
                
                if (scores.length > 0) {
                    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                    const std = Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / scores.length);
                    
                    item[dimension] = mean;
                    item[`${dimension}_std`] = std;
                    item[`${dimension}_count`] = scores.length;
                }
            });
            
            chartData.push(item);
        }
    });
    
    
    sortChartData();
}

// Sort chart data
function sortChartData() {
    const sortMultiplier = sortOrder === 'desc' ? -1 : 1;
    
    chartData.sort((a, b) => {
        let aVal, bVal;
        
        switch (currentSort) {
            case 'alphabetical':
                return sortMultiplier * a.category.localeCompare(b.category);
            case 'diversity':
                aVal = a.diversity || 0;
                bVal = b.diversity || 0;
                break;
            case 'equity':
                aVal = a.equity || 0;
                bVal = b.equity || 0;
                break;
            case 'inclusion':
                aVal = a.inclusion || 0;
                bVal = b.inclusion || 0;
                break;
            case 'overall':
                aVal = ((a.diversity || 0) + (a.equity || 0) + (a.inclusion || 0)) / 3;
                bVal = ((b.diversity || 0) + (b.equity || 0) + (b.inclusion || 0)) / 3;
                break;
            default:
                return 0;
        }
        
        return sortMultiplier * (aVal - bVal);
    });
}

// Setup event listeners
function setupEventListeners() {
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDemographic = this.dataset.demographic;
            createChartData();
            updateVisualization();
            updateStats();
        });
    });

    
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            createChartData();
            updateVisualization();
        });
    });

    
    document.getElementById('sort-select').addEventListener('change', function() {
        currentSort = this.value;
        createChartData();
        updateVisualization();
    });

    document.getElementById('sort-order').addEventListener('click', function() {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        this.textContent = sortOrder === 'desc' ? '↓ Desc' : '↑ Asc';
        this.dataset.order = sortOrder;
        createChartData();
        updateVisualization();
    });

    
    document.querySelectorAll('input[data-dimension]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const dimension = this.dataset.dimension;
            if (this.checked) {
                if (!activeDimensions.includes(dimension)) {
                    activeDimensions.push(dimension);
                }
            } else {
                activeDimensions = activeDimensions.filter(d => d !== dimension);
            }
            createChartData();
            updateVisualization();
            updateStats();
        });
    });

    
    document.getElementById('show-error-bars').addEventListener('change', function() {
        showErrorBars = this.checked;
        updateVisualization();
    });

    document.getElementById('show-sample-size').addEventListener('change', function() {
        showSampleSize = this.checked;
        updateVisualization();
    });

   
    document.getElementById('min-sample').addEventListener('input', function() {
        minSampleSize = +this.value;
        document.getElementById('min-sample-value').textContent = this.value;
        createChartData();
        updateVisualization();
        updateStats();
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
    const svg = d3.select('.bar-chart');
    svg.selectAll('*').remove();

    if (chartData.length === 0) return;

    
    const xScale = d3.scaleBand()
        .domain(chartData.map(d => d.category))
        .range([0, width])
        .padding(0.2);

    
    const allValues = chartData.flatMap(d => 
        activeDimensions.map(dim => d[dim]).filter(v => v !== undefined && v >= 0)
    );
    
    let yMin = 0;
    let yMax = Math.max(0, d3.max(allValues) || 1);
    
    // Add some padding to the top
    const padding = yMax * 0.1;
    yMax += padding;

    const yScale = d3.scaleLinear()
        .domain([yMin, yMax])
        .nice()
        .range([height, 0]);

    const xSubScale = d3.scaleBand()
        .domain(activeDimensions)
        .range([0, xScale.bandwidth()])
        .padding(0.1);

    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    
    const barGroups = g.selectAll('.bar-group')
        .data(chartData)
        .enter()
        .append('g')
        .attr('class', 'bar-group')
        .attr('transform', d => `translate(${xScale(d.category)},0)`);

    
    activeDimensions.forEach(dimension => {
        barGroups.append('rect')
            .attr('class', 'bar')
            .attr('x', xSubScale(dimension))
            .attr('y', d => {
                const value = Math.max(0, d[dimension] || 0);
                return yScale(value);
            })
            .attr('width', xSubScale.bandwidth())
            .attr('height', d => {
                const value = Math.max(0, d[dimension] || 0);
                return yScale(0) - yScale(value);
            })
            .attr('fill', deiColors[dimension])
            .attr('opacity', 0.8)
            .on('mouseover', function(event, d) {
                showTooltip(event, d, dimension);
            })
            .on('mouseout', hideTooltip);

        
        if (showErrorBars) {
            barGroups.filter(d => d[`${dimension}_std`])
                .append('line')
                .attr('class', 'error-bar')
                .attr('x1', xSubScale(dimension) + xSubScale.bandwidth() / 2)
                .attr('x2', xSubScale(dimension) + xSubScale.bandwidth() / 2)
                .attr('y1', d => yScale((d[dimension] || 0) + (d[`${dimension}_std`] || 0)))
                .attr('y2', d => yScale((d[dimension] || 0) - (d[`${dimension}_std`] || 0)));
        }
    });

    
    if (showSampleSize) {
        barGroups.append('text')
            .attr('class', 'sample-size')
            .attr('x', xScale.bandwidth() / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#d1d5db')
            .attr('font-size', '10px')
            .text(d => `n=${d.count}`);
    }

    
    g.append('g')
        .attr('class', 'chart-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');

    g.append('g')
        .attr('class', 'chart-axis')
        .call(d3.axisLeft(yScale));

    
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('DEI Score');

    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .text(currentDemographic);

    
    updateLegend();
}

// Update visualization (for filtering)
function updateVisualization() {
    createChartData();
    createVisualization();
}


function updateLegend() {
    const legend = d3.select('.chart-legend');
    legend.selectAll('*').remove();

    activeDimensions.forEach(dimension => {
        const item = legend.append('div')
            .attr('class', 'legend-item');

        item.append('div')
            .attr('class', 'legend-color')
            .style('background-color', deiColors[dimension]);

        item.append('span')
            .text(dimension.charAt(0).toUpperCase() + dimension.slice(1));
    });
}

// Update statistics
function updateStats() {
    document.getElementById('current-group').textContent = currentDemographic;
    document.getElementById('category-count').textContent = chartData.length;

    const avgDiversity = chartData.length > 0 ? 
        chartData.reduce((sum, d) => sum + (d.diversity || 0), 0) / chartData.length : 0;
    const avgEquity = chartData.length > 0 ? 
        chartData.reduce((sum, d) => sum + (d.equity || 0), 0) / chartData.length : 0;
    const avgInclusion = chartData.length > 0 ? 
        chartData.reduce((sum, d) => sum + (d.inclusion || 0), 0) / chartData.length : 0;

    document.getElementById('avg-diversity').textContent = avgDiversity.toFixed(2);
    document.getElementById('avg-equity').textContent = avgEquity.toFixed(2);
    document.getElementById('avg-inclusion').textContent = avgInclusion.toFixed(2);

    
    const overallAvg = (avgDiversity + avgEquity + avgInclusion) / 3;
    const normalizedScore = (overallAvg + 2) / 4 * 100;
    document.getElementById('progress-fill').style.width = `${Math.max(0, Math.min(100, normalizedScore))}%`;
}

// Tooltip functions
function showTooltip(event, d, dimension) {
    const tooltip = document.getElementById('tooltip');
    const score = d[dimension] || 0;
    const std = d[`${dimension}_std`] || 0;
    const count = d[`${dimension}_count`] || 0;
    
    tooltip.innerHTML = `
        <strong>${d.category}</strong><br>
        ${dimension.charAt(0).toUpperCase() + dimension.slice(1)}: ${score.toFixed(3)}<br>
        Standard Deviation: ${std.toFixed(3)}<br>
        Sample Size: ${count}
    `;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
} 