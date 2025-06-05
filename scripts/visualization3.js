// Configuration for Equity Hot Spots Heatmap
const margin = { top: 60, right: 40, bottom: 120, left: 150 };
const width = 1000 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Global variables
let data = [];
let heatmapData = [];
let currentView = 'demographics';
let currentMetric = 'negative';
let activeGroups = ['gender', 'ethnicity', 'lgbtq', 'disability', 'veteran', 'indigenous', 'minority'];
let showValues = true;
let showSampleCounts = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
});

// Load and process data
async function loadData() {
    try {
        const rawData = await d3.csv('./data/deidataset.csv');
        
        data = rawData.map(d => {
            // Calculate equity scores from individual questions
            const eQuestions = [d.Aug_E_Q1, d.Aug_E_Q2, d.Aug_E_Q3, d.Aug_E_Q4, d.Aug_E_Q5].map(v => +v);
            const ePositive = eQuestions.filter(v => !isNaN(v) && v > 0).reduce((a, b) => a + b, 0) / eQuestions.filter(v => !isNaN(v) && v > 0).length || 0;
            const eNegative = Math.abs(eQuestions.filter(v => !isNaN(v) && v < 0).reduce((a, b) => a + b, 0) / eQuestions.filter(v => !isNaN(v) && v < 0).length || 0);
            
            return {
                id: +d.Id,
                division: d.Division,
                manager: d.Manager,
                gender: d.Gender,
                ethnicity: d.Ethnicity,
                lgbtq: d.LGBTQ,
                disability: d.Disability,
                veteran: d.Veteran,
                indigenous: d.Indigenous,
                minority: d.Minority,
                equity_positive: ePositive,
                equity_negative: eNegative,
                equity_gap: ePositive - eNegative
            };
        });

        createHeatmapData();
        createVisualization();
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Create heatmap data structure
function createHeatmapData() {
    heatmapData = [];
    
    if (currentView === 'demographics') {
        const groupMappings = {
            'gender': 'gender',
            'ethnicity': 'ethnicity', 
            'lgbtq': 'lgbtq',
            'disability': 'disability',
            'veteran': 'veteran',
            'indigenous': 'indigenous',
            'minority': 'minority'
        };
        
        activeGroups.forEach(groupType => {
            const field = groupMappings[groupType];
            const categories = [...new Set(data.map(d => d[field]))].filter(c => c && c !== '');
            
            categories.forEach(category => {
                const categoryData = data.filter(d => d[field] === category);
                
                if (categoryData.length >= 1) {
                    const scores = categoryData.map(d => d[`equity_${currentMetric}`]).filter(s => !isNaN(s));
                    
                    if (scores.length > 0) {
                        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                        
                        heatmapData.push({
                            group: groupType.charAt(0).toUpperCase() + groupType.slice(1),
                            category: category,
                            value: mean,
                            count: scores.length,
                            groupType: groupType
                        });
                    }
                }
            });
        });
    } else if (currentView === 'divisions') {
        const divisions = [...new Set(data.map(d => d.division))].filter(d => d && d !== '');
        
        activeGroups.forEach(groupType => {
            const field = groupType === 'gender' ? 'gender' : 
                         groupType === 'ethnicity' ? 'ethnicity' : 
                         groupType === 'lgbtq' ? 'lgbtq' :
                         groupType === 'disability' ? 'disability' :
                         groupType === 'veteran' ? 'veteran' :
                         groupType === 'indigenous' ? 'indigenous' : 'minority';
            
            divisions.forEach(division => {
                const divisionData = data.filter(d => d.division === division);
                const scores = divisionData.map(d => d[`equity_${currentMetric}`]).filter(s => !isNaN(s));
                
                if (scores.length >= 1) {
                    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                    
                    heatmapData.push({
                        group: groupType.charAt(0).toUpperCase() + groupType.slice(1),
                        category: division,
                        value: mean,
                        count: scores.length,
                        groupType: groupType
                    });
                }
            });
        });
    } else if (currentView === 'managers') {
        const managers = [...new Set(data.map(d => d.manager))].filter(m => m && m !== '' && m !== 'No');
        
        // Limit to top managers by team size for readability
        const managerCounts = {};
        managers.forEach(manager => {
            managerCounts[manager] = data.filter(d => d.manager === manager).length;
        });
        
        const topManagers = Object.entries(managerCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15)
            .map(([manager,]) => manager);
        
        activeGroups.forEach(groupType => {
            const field = groupType === 'gender' ? 'gender' : 
                         groupType === 'ethnicity' ? 'ethnicity' : 
                         groupType === 'lgbtq' ? 'lgbtq' :
                         groupType === 'disability' ? 'disability' :
                         groupType === 'veteran' ? 'veteran' :
                         groupType === 'indigenous' ? 'indigenous' : 'minority';
            
            topManagers.forEach(manager => {
                const managerData = data.filter(d => d.manager === manager);
                const scores = managerData.map(d => d[`equity_${currentMetric}`]).filter(s => !isNaN(s));
                
                if (scores.length >= 1) {
                    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                    
                    heatmapData.push({
                        group: groupType.charAt(0).toUpperCase() + groupType.slice(1),
                        category: manager,
                        value: mean,
                        count: scores.length,
                        groupType: groupType
                    });
                }
            });
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // View tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            document.getElementById('current-view').textContent = 
                currentView === 'demographics' ? 'Demographics' : 
                currentView === 'divisions' ? 'Division' : 'Manager';
            createHeatmapData();
            updateVisualization();
            updateStats();
        });
    });

    // Metric selector
    document.getElementById('equity-metric').addEventListener('change', function() {
        currentMetric = this.value;
        createHeatmapData();
        updateVisualization();
        updateStats();
    });

    // Group filters
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
            createHeatmapData();
            updateVisualization();
            updateStats();
        });
    });

    // Visualization options
    document.getElementById('show-values').addEventListener('change', function() {
        showValues = this.checked;
        updateVisualization();
    });

    document.getElementById('show-sample-counts').addEventListener('change', function() {
        showSampleCounts = this.checked;
        updateVisualization();
    });
}

// Create visualization
function createVisualization() {
    const svg = d3.select('.heatmap');
    svg.selectAll('*').remove();

    if (heatmapData.length === 0) return;

    // Get unique groups and categories
    const groups = [...new Set(heatmapData.map(d => d.group))];
    const categories = [...new Set(heatmapData.map(d => d.category))];

    // Create scales
    const xScale = d3.scaleBand()
        .domain(categories)
        .range([0, width])
        .padding(0.05);

    const yScale = d3.scaleBand()
        .domain(groups)
        .range([0, height])
        .padding(0.05);

    // Color scale based on metric
    const values = heatmapData.map(d => d.value);
    const colorScale = currentMetric === 'negative' 
        ? d3.scaleSequential(d3.interpolateReds)
            .domain([0, d3.max(values)])
        : currentMetric === 'positive'
        ? d3.scaleSequential(d3.interpolateGreens)
            .domain([0, d3.max(values)])
        : d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([d3.min(values), d3.max(values)]);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create heatmap cells
    const cells = g.selectAll('.heatmap-cell')
        .data(heatmapData)
        .enter()
        .append('g')
        .attr('class', 'heatmap-cell');

    cells.append('rect')
        .attr('x', d => xScale(d.category))
        .attr('y', d => yScale(d.group))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, d);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.8);
            hideTooltip();
        });

    // Add text values
    if (showValues) {
        cells.append('text')
            .attr('x', d => xScale(d.category) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.group) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', d => d.value > (d3.max(values) * 0.6) ? 'white' : 'black')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(d => d.value.toFixed(2));
    }

    // Add sample counts
    if (showSampleCounts) {
        cells.append('text')
            .attr('x', d => xScale(d.category) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.group) + yScale.bandwidth() - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', d => d.value > (d3.max(values) * 0.6) ? 'white' : 'black')
            .attr('font-size', '8px')
            .text(d => `n=${d.count}`);
    }

    // Add axes
    const xAxis = g.append('g')
        .attr('class', 'chart-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    // Conditionally style text labels based on current view
    if (currentView === 'demographics') {
        // Keep angled labels for demographics
        xAxis.selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)')
            .attr('fill', '#d1d5db');
    } else {
        // Horizontal labels for divisions and managers
        xAxis.selectAll('text')
            .style('text-anchor', 'middle')
            .attr('dx', '0')
            .attr('dy', '1em')
            .attr('transform', 'rotate(0)')
            .attr('fill', '#d1d5db');
    }

    g.append('g')
        .attr('class', 'chart-axis')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('fill', '#d1d5db');

    // Add axis labels
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left + 20)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .attr('fill', '#f9fafb')
        .text('Demographic Groups');

    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 20})`)
        .style('text-anchor', 'middle')
        .attr('fill', '#f9fafb')
        .text(currentView === 'demographics' ? 'Categories' : 
              currentView === 'divisions' ? 'Divisions' : 'Managers');

    // Add color legend in top right
    const legendWidth = 200;
    const legendHeight = 15;
    const legendX = width - legendWidth - 10;
    const legendY = -40;
    
    // Create gradient definition
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
    const gradient = defs.select('#heatmap-gradient').empty() ? 
        defs.append('linearGradient').attr('id', 'heatmap-gradient') : 
        defs.select('#heatmap-gradient');
    
    gradient.attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
    
    // Clear existing stops
    gradient.selectAll('stop').remove();
    
    // Add color stops based on current metric
    const steps = 20;
    const minValue = d3.min(values);
    const maxValue = d3.max(values);
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const value = minValue + t * (maxValue - minValue);
        gradient.append('stop')
            .attr('offset', `${t * 100}%`)
            .attr('stop-color', colorScale(value));
    }
    
    // Add legend group
    const legendGroup = g.append('g')
        .attr('class', 'color-legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);
    
    // Add legend rectangle
    legendGroup.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#heatmap-gradient)')
        .style('stroke', 'rgba(255, 255, 255, 0.4)')
        .style('stroke-width', 1)
        .style('rx', 3);
    
    // Add legend title
    legendGroup.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -8)
        .style('text-anchor', 'middle')
        .style('fill', '#f9fafb')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .text(currentMetric === 'negative' ? 'Worse Equity' : 
              currentMetric === 'positive' ? 'Better Equity' : 'Equity Balance');
    
    // Add min/max labels
    legendGroup.append('text')
        .attr('x', 0)
        .attr('y', legendHeight + 15)
        .style('text-anchor', 'start')
        .style('fill', '#d1d5db')
        .style('font-size', '10px')
        .text(minValue.toFixed(2));
    
    legendGroup.append('text')
        .attr('x', legendWidth)
        .attr('y', legendHeight + 15)
        .style('text-anchor', 'end')
        .style('fill', '#d1d5db')
        .style('font-size', '10px')
        .text(maxValue.toFixed(2));
    
    // Add arrow indicators
    if (currentMetric === 'negative') {
        legendGroup.append('text')
            .attr('x', legendWidth + 10)
            .attr('y', legendHeight / 2)
            .style('text-anchor', 'start')
            .style('fill', '#ff6b6b')
            .style('font-size', '14px')
            .style('dominant-baseline', 'middle')
            .text('→ Problematic');
    } else if (currentMetric === 'positive') {
        legendGroup.append('text')
            .attr('x', legendWidth + 10)
            .attr('y', legendHeight / 2)
            .style('text-anchor', 'start')
            .style('fill', '#4ecdc4')
            .style('font-size', '14px')
            .style('dominant-baseline', 'middle')
            .text('→ Good');
    }
}

// Update visualization
function updateVisualization() {
    createHeatmapData();
    createVisualization();
}

// Update statistics
function updateStats() {
    document.getElementById('category-count').textContent = heatmapData.length;

    if (heatmapData.length > 0) {
        const values = heatmapData.map(d => d.value);
        const worstScore = currentMetric === 'negative' ? d3.max(values) : d3.min(values);
        const bestScore = currentMetric === 'negative' ? d3.min(values) : d3.max(values);
        
        document.getElementById('worst-score').textContent = worstScore.toFixed(3);
        document.getElementById('best-score').textContent = bestScore.toFixed(3);

        // Show most critical groups
        const sortedData = [...heatmapData].sort((a, b) => 
            currentMetric === 'negative' ? b.value - a.value : a.value - b.value
        );
        
        const criticalList = document.getElementById('critical-list');
        criticalList.innerHTML = '';
        
        sortedData.slice(0, 5).forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'critical-item';
            div.innerHTML = `
                <strong>${index + 1}.</strong> ${item.group} - ${item.category}: 
                <span style="color: ${currentMetric === 'negative' ? '#ff6b6b' : '#4ecdc4'}">
                    ${item.value.toFixed(3)}
                </span> (n=${item.count})
            `;
            criticalList.appendChild(div);
        });

        // Update progress bar (normalized score)
        const avgScore = values.reduce((a, b) => a + b, 0) / values.length;
        const normalizedScore = currentMetric === 'negative' 
            ? (1 - (avgScore / d3.max(values))) * 100
            : (avgScore / d3.max(values)) * 100;
        document.getElementById('progress-fill').style.width = `${Math.max(0, Math.min(100, normalizedScore))}%`;
    }
}

// Tooltip functions
function showTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    const metricName = currentMetric === 'negative' ? 'E_Negative' : 
                      currentMetric === 'positive' ? 'E_Positive' : 'Equity Gap';
    
    tooltip.innerHTML = `
        <strong>${d.group}: ${d.category}</strong><br>
        ${metricName}: ${d.value.toFixed(3)}<br>
        Sample Size: ${d.count}<br>
        <em>${currentMetric === 'negative' ? 'Higher = Worse Equity' : 
             currentMetric === 'positive' ? 'Higher = Better Equity' : 
             'Higher = Better Equity Balance'}</em>
    `;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
} 