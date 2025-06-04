const margin = { top: 40, right: 60, bottom: 150, left: 100 };
const width = 700 - margin.left - margin.right;
const height = 550 - margin.top - margin.bottom;

let data = [];
let filteredData = [];
let currentDimension = 'lgbtq';
let currentScoreType = 'I_Positive';
let ageRange = [24, 65];
let showDataPoints = false;
let showMeans = true;
let sortByScore = false;
let showOutliers = true;
let showWhiskers = true;
let colorByScore = false;
let highlightLGBTQ = false;
let highlightLowScores = false;

const groupColors = {
    'Yes': '#ff6b6b',
    'No': '#4ecdc4',
    'Prefer not to say': '#96ceb4',
    'He/him/his': '#45b7d1',
    'She/her/hers': '#ff6b6b',
    'They/them/theirs': '#feca57',
    'Other': '#96ceb4',
    'White': '#e0e0e0',
    'Asian': '#ff6b6b',
    'Black': '#45b7d1',
    'Hispanic': '#feca57',
    'Other_Ethnicity': '#96ceb4',
    'default': '#808080'
};

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
});

async function loadData() {
    try {
        const rawData = await d3.csv('./data/deidataset.csv');
        
        data = rawData.map(d => {
            // Calculate inclusion scores
            const iQuestions = [d.Aug_I_Q1, d.Aug_I_Q2, d.Aug_I_Q3, d.Aug_I_Q4, d.Aug_I_Q5].map(v => +v);
            const iPositive = iQuestions.filter(v => !isNaN(v) && v > 0).reduce((a, b) => a + b, 0) / iQuestions.filter(v => !isNaN(v) && v > 0).length || 0;
            const iNegative = Math.abs(iQuestions.filter(v => !isNaN(v) && v < 0).reduce((a, b) => a + b, 0) / iQuestions.filter(v => !isNaN(v) && v < 0).length || 0);
            const iOverall = iQuestions.filter(v => !isNaN(v)).reduce((a, b) => a + b, 0) / iQuestions.filter(v => !isNaN(v)).length || 0;
            
            // Clean and normalize data
            const pronouns = d.Pronouns || 'Not specified';
            const ethnicity = d.Ethnicity || 'Not specified';
            
            return {
                id: +d.Id,
                name: d.Name || `Employee ${d.Id}`,
                division: d.Division,
                age: +d.Age,
                gender: d.Gender,
                pronouns: pronouns,
                ethnicity: ethnicity,
                lgbtq: d.LGBTQ || 'Not specified',
                disability: d.Disability || 'No',
                I_Positive: iPositive,
                I_Negative: iNegative,
                I_Overall: iOverall,
                // Individual inclusion questions for detailed analysis
                I_Q1: +d.Aug_I_Q1 || 0, // Inclusive culture
                I_Q2: +d.Aug_I_Q2 || 0, // Comfortable sharing opinion
                I_Q3: +d.Aug_I_Q3 || 0, // Feel valued
                I_Q4: +d.Aug_I_Q4 || 0, // Company taking actions
                I_Q5: +d.Aug_I_Q5 || 0  // Sense of belonging
            };
        });

        filterData();
        createVisualization();
        updateStats();
        updateInsights();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function filterData() {
    filteredData = data.filter(d => {
        return d.age >= ageRange[0] && d.age <= ageRange[1];
    });
}

function setupEventListeners() {
    // Dimension tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDimension = this.dataset.dimension;
            createVisualization();
            updateInsights();
        });
    });

    // Score type selector
    document.getElementById('score-type').addEventListener('change', function() {
        currentScoreType = this.value;
        createVisualization();
        updateInsights();
    });

    // Control buttons - Sort only
    document.getElementById('sort-groups').addEventListener('click', function() {
        sortByScore = !sortByScore;
        this.classList.toggle('active');
        this.textContent = sortByScore ? 'Original Order' : 'Sort by Score';
        createVisualization();
    });

    // Age range sliders
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
            createVisualization();
            updateStats();
        });
    });

    // Display options
    document.getElementById('show-data-points').addEventListener('change', function() {
        showDataPoints = this.checked;
        createVisualization();
    });

    document.getElementById('show-means').addEventListener('change', function() {
        showMeans = this.checked;
        createVisualization();
    });

    document.getElementById('show-outliers').addEventListener('change', function() {
        showOutliers = this.checked;
        createVisualization();
    });

    document.getElementById('show-whiskers').addEventListener('change', function() {
        showWhiskers = this.checked;
        createVisualization();
    });

    document.getElementById('color-by-score').addEventListener('change', function() {
        colorByScore = this.checked;
        createVisualization();
    });

    // Highlight options
    document.getElementById('highlight-lgbtq').addEventListener('change', function() {
        highlightLGBTQ = this.checked;
        createVisualization();
    });

    document.getElementById('highlight-low-scores').addEventListener('change', function() {
        highlightLowScores = this.checked;
        createVisualization();
    });
}

function createVisualization() {
    const svg = d3.select('.boxplot-chart');
    svg.selectAll('*').remove();

    if (filteredData.length === 0) return;

    // Group data by current dimension
    const groupedData = groupDataByDimension();
    
    if (groupedData.length === 0) return;

    // Sort groups if requested
    if (sortByScore) {
        groupedData.sort((a, b) => d3.mean(b.values, d => d[currentScoreType]) - d3.mean(a.values, d => d[currentScoreType]));
    }

    // Scales
    const xScale = d3.scaleBand()
        .domain(groupedData.map(d => d.key))
        .range([0, width])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d[currentScoreType]))
        .nice()
        .range([height, 0]);

    const mainGroup = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create box plots
    groupedData.forEach((group, i) => {
        const groupData = group.values;
        const xPos = xScale(group.key);
        const bandWidth = xScale.bandwidth();
        const boxWidth = Math.min(bandWidth * 0.8, 60);
        const centerX = xPos + bandWidth / 2;

        // Calculate statistics
        const sortedValues = groupData.map(d => d[currentScoreType]).sort(d3.ascending);
        const q1 = d3.quantile(sortedValues, 0.25);
        const median = d3.quantile(sortedValues, 0.5);
        const q3 = d3.quantile(sortedValues, 0.75);
        const mean = d3.mean(sortedValues);
        const iqr = q3 - q1;
        const lowerWhisker = Math.max(d3.min(sortedValues), q1 - 1.5 * iqr);
        const upperWhisker = Math.min(d3.max(sortedValues), q3 + 1.5 * iqr);

        // Get box color
        let boxColor = getGroupColor(group.key);
        if (colorByScore) {
            boxColor = getScoreColor(mean);
        }
        if (highlightLGBTQ && currentDimension === 'lgbtq' && group.key === 'Yes') {
            boxColor = '#ff4757';
        }
        if (highlightLowScores && mean < d3.quantile(groupedData.map(g => d3.mean(g.values, d => d[currentScoreType])), 0.25)) {
            boxColor = '#ff4757';
        }

        // Whiskers
        if (showWhiskers) {
            // Lower whisker
            mainGroup.append('line')
                .attr('x1', centerX)
                .attr('x2', centerX)
                .attr('y1', yScale(q1))
                .attr('y2', yScale(lowerWhisker))
                .attr('stroke', '#666')
                .attr('stroke-width', 2);

            // Upper whisker
            mainGroup.append('line')
                .attr('x1', centerX)
                .attr('x2', centerX)
                .attr('y1', yScale(q3))
                .attr('y2', yScale(upperWhisker))
                .attr('stroke', '#666')
                .attr('stroke-width', 2);

            // Whisker caps
            mainGroup.append('line')
                .attr('x1', centerX - boxWidth/4)
                .attr('x2', centerX + boxWidth/4)
                .attr('y1', yScale(lowerWhisker))
                .attr('y2', yScale(lowerWhisker))
                .attr('stroke', '#666')
                .attr('stroke-width', 2);

            mainGroup.append('line')
                .attr('x1', centerX - boxWidth/4)
                .attr('x2', centerX + boxWidth/4)
                .attr('y1', yScale(upperWhisker))
                .attr('y2', yScale(upperWhisker))
                .attr('stroke', '#666')
                .attr('stroke-width', 2);
        }

        // Box (IQR)
        mainGroup.append('rect')
            .attr('x', centerX - boxWidth/2)
            .attr('y', yScale(q3))
            .attr('width', boxWidth)
            .attr('height', yScale(q1) - yScale(q3))
            .attr('fill', boxColor)
            .attr('opacity', 0.7)
            .attr('stroke', '#333')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
                showGroupTooltip(event, group);
                d3.select(this).attr('opacity', 0.9);
            })
            .on('mouseout', function() {
                hideTooltip();
                d3.select(this).attr('opacity', 0.7);
            });

        // Median line
        mainGroup.append('line')
            .attr('x1', centerX - boxWidth/2)
            .attr('x2', centerX + boxWidth/2)
            .attr('y1', yScale(median))
            .attr('y2', yScale(median))
            .attr('stroke', '#333')
            .attr('stroke-width', 3);

        // Mean indicator
        if (showMeans) {
            mainGroup.append('circle')
                .attr('cx', centerX)
                .attr('cy', yScale(mean))
                .attr('r', 4)
                .attr('fill', '#ff6b6b')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
        }

        // Outliers
        if (showOutliers) {
            groupData.forEach(d => {
                const value = d[currentScoreType];
                if (value < lowerWhisker || value > upperWhisker) {
                    mainGroup.append('circle')
                        .attr('cx', centerX + (Math.random() - 0.5) * boxWidth * 0.6)
                        .attr('cy', yScale(value))
                        .attr('r', 3)
                        .attr('fill', '#ff4757')
                        .attr('opacity', 0.6)
                        .style('cursor', 'pointer')
                        .on('mouseover', function(event) {
                            showDataTooltip(event, d);
                        })
                        .on('mouseout', hideTooltip);
                }
            });
        }

        // Data points (if enabled)
        if (showDataPoints) {
            groupData.forEach(d => {
                if (!showOutliers || (d[currentScoreType] >= lowerWhisker && d[currentScoreType] <= upperWhisker)) {
                    mainGroup.append('circle')
                        .attr('cx', centerX + (Math.random() - 0.5) * boxWidth * 0.6)
                        .attr('cy', yScale(d[currentScoreType]))
                        .attr('r', 2)
                        .attr('fill', boxColor)
                        .attr('opacity', 0.5)
                        .style('cursor', 'pointer')
                        .on('mouseover', function(event) {
                            showDataTooltip(event, d);
                        })
                        .on('mouseout', hideTooltip);
                }
            });
        }

        // Sample size label
        mainGroup.append('text')
            .attr('x', centerX)
            .attr('y', height + 35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('fill', '#d1d5db')
            .attr('font-weight', '500')
            .text(`n=${groupData.length}`);
    });

    // Axes
    const xAxis = mainGroup.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    // Rotate x-axis labels if needed
    xAxis.selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-2em')
        .attr('dy', '4em')
        .attr('transform', 'rotate(-45)')
        .attr('fill', '#fff')
        .attr('font-size', '12px');

    const yAxis = mainGroup.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale));

    yAxis.selectAll('text')
        .attr('fill', '#d1d5db')
        .attr('font-size', '12px');

    yAxis.selectAll('line')
        .attr('stroke', 'rgba(255,255,255,0.2)');

    yAxis.select('.domain')
        .attr('stroke', 'rgba(255,255,255,0.3)');

    // Axis labels
    mainGroup.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .attr('fill', '#f9fafb')
        .attr('font-size', '14px')
        .text(getScoreLabel(currentScoreType));

    mainGroup.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 20})`)
        .style('text-anchor', 'middle')
        .attr('fill', '#f9fafb')
        .attr('font-size', '14px')
        .text(getDimensionLabel(currentDimension));
}

function groupDataByDimension() {
    const grouped = d3.group(filteredData, d => d[currentDimension]);
    
    return Array.from(grouped, ([key, values]) => ({
        key: key || 'Not specified',
        values: values
    })).filter(group => group.values.length >= 5); // Minimum 5 employees per group
}

function getGroupColor(groupKey) {
    return groupColors[groupKey] || groupColors['default'];
}

function getScoreColor(score) {
    const scoreScale = d3.scaleSequential(d3.interpolateRdYlGn)
        .domain(d3.extent(filteredData, d => d[currentScoreType]));
    return scoreScale(score);
}

function getScoreLabel(scoreType) {
    const labels = {
        'I_Positive': 'Positive Inclusion Score',
        'I_Negative': 'Negative Inclusion Score',
        'I_Overall': 'Overall Inclusion Score'
    };
    return labels[scoreType] || scoreType;
}

function getDimensionLabel(dimension) {
    const labels = {
        'lgbtq': 'LGBTQ+ Status',
        'pronouns': 'Pronouns Used',
        'ethnicity': 'Cultural Background'
    };
    return labels[dimension] || dimension;
}

function showGroupTooltip(event, group) {
    const tooltip = document.getElementById('tooltip');
    const scores = group.values.map(d => d[currentScoreType]);
    const mean = d3.mean(scores);
    const median = d3.quantile(scores.sort(d3.ascending), 0.5);
    const std = d3.deviation(scores);
    const q1 = d3.quantile(scores, 0.25);
    const q3 = d3.quantile(scores, 0.75);
    
    tooltip.innerHTML = `
        <strong>${group.key}</strong><br>
        <strong>Sample Size:</strong> ${group.values.length}<br>
        <strong>Mean:</strong> ${mean.toFixed(3)}<br>
        <strong>Median:</strong> ${median.toFixed(3)}<br>
        <strong>Q1:</strong> ${q1.toFixed(3)}<br>
        <strong>Q3:</strong> ${q3.toFixed(3)}<br>
        <strong>Std Dev:</strong> ${std.toFixed(3)}
    `;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function showDataTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    
    tooltip.innerHTML = `
        <strong>${d.name}</strong><br>
        <strong>${getDimensionLabel(currentDimension)}:</strong> ${d[currentDimension]}<br>
        <strong>${getScoreLabel(currentScoreType)}:</strong> ${d[currentScoreType].toFixed(3)}<br>
        <strong>Age:</strong> ${d.age}<br>
        <strong>Division:</strong> ${d.division}
    `;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
}

function updateStats() {
    const groupedData = groupDataByDimension();
    
    document.getElementById('total-employees').textContent = filteredData.length.toLocaleString();
    document.getElementById('group-count').textContent = groupedData.length;
    
    if (groupedData.length > 0) {
        const allScores = filteredData.map(d => d[currentScoreType]);
        const minScore = d3.min(allScores);
        const maxScore = d3.max(allScores);
        document.getElementById('score-range').textContent = `${minScore.toFixed(2)} - ${maxScore.toFixed(2)}`;
        
        const groupMeans = groupedData.map(g => d3.mean(g.values, d => d[currentScoreType]));
        const largestGap = d3.max(groupMeans) - d3.min(groupMeans);
        document.getElementById('largest-gap').textContent = largestGap.toFixed(3);
        
        const percentage = (filteredData.length / data.length) * 100;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
    }
}

function updateInsights() {
    const insightsContent = document.getElementById('insights-content');
    const groupedData = groupDataByDimension();
    
    if (groupedData.length === 0) {
        insightsContent.innerHTML = '<p>No sufficient data for current filters.</p>';
        return;
    }

    const groupStats = groupedData.map(group => ({
        name: group.key,
        mean: d3.mean(group.values, d => d[currentScoreType]),
        median: d3.quantile(group.values.map(d => d[currentScoreType]).sort(d3.ascending), 0.5),
        count: group.values.length,
        values: group.values
    })).sort((a, b) => b.mean - a.mean);

    const highest = groupStats[0];
    const lowest = groupStats[groupStats.length - 1];
    const gap = highest.mean - lowest.mean;

    let insights = `
        <div class="insight-item">
            <strong>Highest ${getScoreLabel(currentScoreType)}:</strong><br>
            ${highest.name} (Mean: ${highest.mean.toFixed(3)}, n=${highest.count})
        </div>
        <div class="insight-item">
            <strong>Lowest ${getScoreLabel(currentScoreType)}:</strong><br>
            ${lowest.name} (Mean: ${lowest.mean.toFixed(3)}, n=${lowest.count})
        </div>
        <div class="insight-item">
            <strong>Mean Difference:</strong> ${gap.toFixed(3)} points
        </div>
    `;

    // Add dimension-specific insights
    if (currentDimension === 'lgbtq') {
        const lgbtqYes = groupStats.find(g => g.name === 'Yes');
        const lgbtqNo = groupStats.find(g => g.name === 'No');
        
        if (lgbtqYes && lgbtqNo) {
            const difference = lgbtqNo.mean - lgbtqYes.mean;
            const significant = Math.abs(difference) > 0.1;
            insights += `
                <div class="insight-item">
                    <strong>LGBTQ+ Analysis:</strong><br>
                    ${difference > 0 ? 'Non-LGBTQ+ employees' : 'LGBTQ+ employees'} score ${Math.abs(difference).toFixed(3)} points higher on average.
                    ${significant ? ' <span style="color: #ff6b6b;">Significant difference!</span>' : ''}
                </div>
            `;
        }
    } else if (currentDimension === 'pronouns') {
        insights += `
            <div class="insight-item">
                <strong>Pronouns Analysis:</strong><br>
                ${groupStats.length} different pronoun groups detected. 
                ${gap > 0.2 ? 'Large variation in inclusion scores across pronoun preferences.' : 'Relatively consistent scores across pronoun groups.'}
            </div>
        `;
    } else if (currentDimension === 'ethnicity') {
        insights += `
            <div class="insight-item">
                <strong>Cultural Background Analysis:</strong><br>
                ${groupStats.length} cultural groups represented. 
                ${gap > 0.2 ? 'Notable differences in inclusion scores across cultural backgrounds.' : 'Fairly consistent inclusion scores across cultural groups.'}
            </div>
        `;
    }

    insightsContent.innerHTML = insights;
} 