// Configuration for Bar Chart Visualization
const margin = { top: 50, right: 50, bottom: 100, left: 80 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Global variables
let data = [];
let currentView = 'gender';
let currentScoreType = 'diversity';
let activeDepartments = [];
let minGroupSize = 5;

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
            // Calculate diversity scores as average of diversity questions
            const diversityQuestions = [+d.Aug_D_Q1, +d.Aug_D_Q2, +d.Aug_D_Q3, +d.Aug_D_Q4, +d.Aug_D_Q5];
            const validDiversityScores = diversityQuestions.filter(score => !isNaN(score));
            const avgDiversityScore = validDiversityScores.length > 0 ? 
                validDiversityScores.reduce((a, b) => a + b) / validDiversityScores.length : 0;
            
            return {
                id: +d.Id,
                division: d.Division,
                manager: d.Manager === 'True',
                gender: d.Gender,
                ethnicity: d.Ethnicity,
                lgbtq: d.LGBTQ,
                disability: d.Disability,
                indigenous: d.Indigenous,
                diversityAvg: avgDiversityScore,
                diversityPositive: +d.D_Positive || 0,
                diversityNegative: +d.D_Negative || 0
            };
        });

        // Get unique departments for filters
        activeDepartments = [...new Set(data.map(d => d.division))];
        createDepartmentFilters();
        
        createVisualization();
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Create department filter checkboxes
function createDepartmentFilters() {
    const container = document.getElementById('department-filters');
    container.innerHTML = '';
    
    activeDepartments.forEach(dept => {
        const div = document.createElement('div');
        div.className = 'filter-item';
        div.innerHTML = `
            <input type="checkbox" id="dept-${dept.replace(/\s+/g, '')}" checked data-filter="division" data-value="${dept}">
            <label for="dept-${dept.replace(/\s+/g, '')}">${dept}</label>
        `;
        container.appendChild(div);
    });
    
    // Add event listeners to new checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateVisualization);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            createVisualization();
            updateStats();
        });
    });

    // Score type radio buttons
    document.querySelectorAll('input[name="score-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentScoreType = this.value;
            createVisualization();
            updateStats();
        });
    });

    // Department filters
    document.getElementById('dept-all').addEventListener('change', function() {
        const isChecked = this.checked;
        document.querySelectorAll('#department-filters input[type="checkbox"]').forEach(cb => {
            cb.checked = isChecked;
        });
        updateVisualization();
    });

    // Minimum group size slider
    const groupSizeSlider = document.getElementById('min-group-size');
    groupSizeSlider.addEventListener('input', function() {
        minGroupSize = +this.value;
        document.getElementById('min-size-value').textContent = minGroupSize;
        updateVisualization();
    });
}

// Get filtered data based on current filters
function getFilteredData() {
    const checkedDepartments = Array.from(document.querySelectorAll('#department-filters input[type="checkbox"]:checked'))
        .map(cb => cb.dataset.value);
    
    return data.filter(d => checkedDepartments.includes(d.division));
}

// Aggregate data by current view
function aggregateData() {
    const filteredData = getFilteredData();
    const groupedData = new Map();

    filteredData.forEach(d => {
        let groupKey;
        
        switch(currentView) {
            case 'gender':
                groupKey = d.gender;
                break;
            case 'ethnicity':
                groupKey = d.ethnicity;
                break;
            case 'lgbtq':
                groupKey = d.lgbtq;
                break;
            case 'disability':
                groupKey = d.disability;
                break;
            case 'indigenous':
                groupKey = d.indigenous;
                break;
            case 'division':
                groupKey = d.division;
                break;
            default:
                groupKey = 'Unknown';
        }

        if (!groupedData.has(groupKey)) {
            groupedData.set(groupKey, []);
        }
        groupedData.get(groupKey).push(d);
    });

    // Calculate averages and filter by minimum group size
    const aggregated = [];
    groupedData.forEach((employees, group) => {
        if (employees.length >= minGroupSize) {
            let score;
            switch(currentScoreType) {
                case 'diversity':
                    score = employees.reduce((sum, emp) => sum + emp.diversityAvg, 0) / employees.length;
                    break;
                case 'positive':
                    score = employees.reduce((sum, emp) => sum + emp.diversityPositive, 0) / employees.length;
                    break;
                case 'negative':
                    score = employees.reduce((sum, emp) => sum + emp.diversityNegative, 0) / employees.length;
                    break;
                default:
                    score = 0;
            }
            
            aggregated.push({
                group: group,
                score: score,
                count: employees.length,
                employees: employees
            });
        }
    });

    // Sort by score descending
    return aggregated.sort((a, b) => b.score - a.score);
}

// Create visualization
function createVisualization() {
    const aggregatedData = aggregateData();
    
    // Clear previous chart
    const svg = d3.select('.bar-chart');
    svg.selectAll('*').remove();

    if (aggregatedData.length === 0) {
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#d1d5db')
            .text('No data available for current filters');
        return;
    }

    // Create scales
    const xScale = d3.scaleBand()
        .domain(aggregatedData.map(d => d.group))
        .range([0, width])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([
            Math.min(0, d3.min(aggregatedData, d => d.score)),
            d3.max(aggregatedData, d => d.score)
        ])
        .range([height, 0]);

    // Color scale based on score
    const colorScale = d3.scaleSequential()
        .domain(d3.extent(aggregatedData, d => d.score))
        .interpolator(d3.interpolateRdYlGn);

    // Create main group
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add bars
    const bars = g.selectAll('.bar')
        .data(aggregatedData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.group))
        .attr('y', d => yScale(Math.max(0, d.score)))
        .attr('width', xScale.bandwidth())
        .attr('height', d => Math.abs(yScale(d.score) - yScale(0)))
        .attr('fill', d => colorScale(d.score))
        .attr('stroke', 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            showTooltip(event, d);
            d3.select(this).attr('stroke-width', 2).attr('stroke', '#fff');
        })
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).attr('stroke-width', 1).attr('stroke', 'rgba(255, 255, 255, 0.3)');
        });

    // Add score labels on bars
    g.selectAll('.score-label')
        .data(aggregatedData)
        .enter()
        .append('text')
        .attr('class', 'score-label')
        .attr('x', d => xScale(d.group) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.score) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f9fafb')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .text(d => d.score.toFixed(2));

    // Add X axis
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${yScale(0)})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)')
        .attr('fill', '#d1d5db')
        .attr('font-size', '11px');

    // Add Y axis
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale).tickFormat(d3.format('.1f')))
        .selectAll('text')
        .attr('fill', '#d1d5db')
        .attr('font-size', '11px');

    // Add axis labels
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .attr('fill', '#f9fafb')
        .attr('font-size', '12px')
        .text(getYAxisLabel());

    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .attr('fill', '#f9fafb')
        .attr('font-size', '12px')
        .text(getXAxisLabel());

    // Add zero line if needed
    if (yScale.domain()[0] < 0) {
        g.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', width)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0))
            .attr('stroke', 'rgba(255, 255, 255, 0.5)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
    }

    // Update insights
    updateInsights(aggregatedData);
}

// Update visualization (for filtering)
function updateVisualization() {
    createVisualization();
    updateStats();
}

// Get Y axis label based on score type
function getYAxisLabel() {
    switch(currentScoreType) {
        case 'diversity': return 'Average Diversity Score';
        case 'positive': return 'Positive Responses Score';
        case 'negative': return 'Negative Responses Score';
        default: return 'Score';
    }
}

// Get X axis label based on current view
function getXAxisLabel() {
    switch(currentView) {
        case 'gender': return 'Gender Groups';
        case 'ethnicity': return 'Ethnic Groups';
        case 'lgbtq': return 'LGBTQ+ Status';
        case 'disability': return 'Disability Status';
        case 'indigenous': return 'Indigenous Status';
        case 'division': return 'Departments';
        default: return 'Groups';
    }
}

// Update statistics
function updateStats() {
    const aggregatedData = aggregateData();
    const filteredData = getFilteredData();
    
    const avgScore = aggregatedData.length > 0 ? 
        aggregatedData.reduce((sum, d) => sum + d.score, 0) / aggregatedData.length : 0;
    const highestScore = aggregatedData.length > 0 ? Math.max(...aggregatedData.map(d => d.score)) : 0;
    const lowestScore = aggregatedData.length > 0 ? Math.min(...aggregatedData.map(d => d.score)) : 0;

    document.getElementById('group-count').textContent = aggregatedData.length;
    document.getElementById('employee-count').textContent = filteredData.length;
    document.getElementById('avg-score').textContent = avgScore.toFixed(2);
    document.getElementById('highest-score').textContent = highestScore.toFixed(2);
    document.getElementById('lowest-score').textContent = lowestScore.toFixed(2);
    
    // Update progress bar (normalize score to 0-100%)
    const normalizedScore = currentScoreType === 'negative' 
        ? Math.max(0, (Math.abs(avgScore) / 2) * 100)
        : Math.max(0, ((avgScore + 2) / 4) * 100);
    document.getElementById('progress-fill').style.width = `${Math.min(100, normalizedScore)}%`;
}

// Update insights panel
function updateInsights(aggregatedData) {
    const insightsContent = document.getElementById('insights-content');
    
    if (aggregatedData.length === 0) {
        insightsContent.innerHTML = '<p>No data available for current filters.</p>';
        return;
    }

    const highest = aggregatedData[0];
    const lowest = aggregatedData[aggregatedData.length - 1];
    const avgScore = aggregatedData.reduce((sum, d) => sum + d.score, 0) / aggregatedData.length;

    let insights = `
        <div class="insight-item">
            <strong>Highest Score:</strong> ${highest.group} (${highest.score.toFixed(2)}, n=${highest.count})
        </div>
        <div class="insight-item">
            <strong>Lowest Score:</strong> ${lowest.group} (${lowest.score.toFixed(2)}, n=${lowest.count})
        </div>
        <div class="insight-item">
            <strong>Score Gap:</strong> ${(highest.score - lowest.score).toFixed(2)} points
        </div>
        <div class="insight-item">
            <strong>Overall Average:</strong> ${avgScore.toFixed(2)}
        </div>
    `;

    // Add specific insights based on current view
    if (currentView === 'gender' && aggregatedData.length >= 2) {
        insights += '<div class="insight-item"><strong>Gender Analysis:</strong> ';
        if (highest.score - lowest.score > 0.5) {
            insights += 'Significant differences in diversity perception between genders.';
        } else {
            insights += 'Relatively similar diversity perception across genders.';
        }
        insights += '</div>';
    }

    insightsContent.innerHTML = insights;
}

// Tooltip functions
function showTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `
        <strong>${d.group}</strong><br>
        Score: ${d.score.toFixed(3)}<br>
        Employees: ${d.count}<br>
        Score Type: ${getYAxisLabel()}
    `;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
} 