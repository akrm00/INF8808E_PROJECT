// Visualization 5: Intersectional DEI Analysis - Scatter Plot/Bubble Chart
// Target Questions: 15-17 (Multiple layers of marginalization, department performance, improvement levers)

class IntersectionalAnalysis {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentView = 'intersectional';
        this.currentScoreType = 'overall';
        this.isSorted = false;
        
        // Chart dimensions - responsive
        this.margin = { top: 20, right: 20, bottom: 60, left: 60 };
        this.updateDimensions();
        
        // Initialize
        this.initializeElements();
        this.loadData();
        this.setupEventListeners();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateDimensions();
            this.updateVisualization();
        });
    }
    
    updateDimensions() {
        const container = document.querySelector('.chart-container');
        const containerWidth = container?.offsetWidth || 800;
        const containerHeight = container?.offsetHeight || 500;
        
        this.width = Math.max(400, containerWidth - this.margin.left - this.margin.right - 40);
        this.height = Math.max(300, containerHeight - this.margin.top - this.margin.bottom - 40);
    }
    
    initializeElements() {
        this.svg = d3.select('.main-chart')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
            
        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
            
        this.tooltip = d3.select('#tooltip');
        
        // Scales
        this.xScale = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
        this.sizeScale = d3.scaleSqrt().range([4, 30]);
        this.colorScale = d3.scaleOrdinal()
            .domain(['critical', 'low', 'moderate', 'good', 'excellent'])
            .range(['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']);
    }
    
    async loadData() {
        try {
            this.data = await d3.csv('data/deidataset.csv', d => ({
                ...d,
                Age: +d.Age,
                Aug_D_Q1: +d.Aug_D_Q1, Aug_D_Q2: +d.Aug_D_Q2, Aug_D_Q3: +d.Aug_D_Q3, Aug_D_Q4: +d.Aug_D_Q4, Aug_D_Q5: +d.Aug_D_Q5,
                Aug_E_Q1: +d.Aug_E_Q1, Aug_E_Q2: +d.Aug_E_Q2, Aug_E_Q3: +d.Aug_E_Q3, Aug_E_Q4: +d.Aug_E_Q4, Aug_E_Q5: +d.Aug_E_Q5,
                Aug_I_Q1: +d.Aug_I_Q1, Aug_I_Q2: +d.Aug_I_Q2, Aug_I_Q3: +d.Aug_I_Q3, Aug_I_Q4: +d.Aug_I_Q4, Aug_I_Q5: +d.Aug_I_Q5,
                D_Negative: +d.D_Negative, D_Neutral: +d.D_Neutral, D_Positive: +d.D_Positive,
                E_Negative: +d.E_Negative, E_Neutral: +d.E_Neutral, E_Positive: +d.E_Positive,
                I_Negative: +d.I_Negative, I_Neutral: +d.I_Neutral, I_Positive: +d.I_Positive
            }));
            
            this.setupFilters();
            this.updateVisualization();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    setupFilters() {
        // Setup department filters
        const departments = [...new Set(this.data.map(d => d.Division))].sort();
        const departmentContainer = d3.select('#department-filters');
        
        departments.forEach(dept => {
            const filterItem = departmentContainer.append('div').attr('class', 'filter-item');
            
            filterItem.append('input')
                .attr('type', 'checkbox')
                .attr('id', `dept-${dept.replace(/\s+/g, '-')}`)
                .attr('checked', true);
                
            filterItem.append('label')
                .attr('for', `dept-${dept.replace(/\s+/g, '-')}`)
                .text(dept);
        });
    }
    
    setupEventListeners() {
        // View tabs
        d3.selectAll('.tab-btn').on('click', (event) => {
            const view = event.target.dataset.view;
            if (view && view !== this.currentView) {
                this.currentView = view;
                d3.selectAll('.tab-btn').classed('active', false);
                d3.select(event.target).classed('active', true);
                this.updateVisualization();
            }
        });
        
        // Score type selector
        d3.select('#score-type').on('change', (event) => {
            this.currentScoreType = event.target.value;
            this.updateVisualization();
        });
        
        // Sort button
        d3.select('#sort-groups').on('click', () => {
            this.isSorted = !this.isSorted;
            d3.select('#sort-groups').classed('active', this.isSorted);
            this.updateVisualization();
        });
        
        // Filter controls
        d3.selectAll('.filter-item input[type="checkbox"]').on('change', () => {
            this.updateVisualization();
        });
    }
    
    getFilteredData() {
        // Get selected departments
        const selectedDepts = [];
        d3.selectAll('#department-filters input:checked').each(function() {
            const label = d3.select(this.parentNode).select('label').text();
            selectedDepts.push(label);
        });
        
        return this.data.filter(d => selectedDepts.includes(d.Division));
    }
    
    calculateDEIScore(d, type = 'overall') {
        const diversity = (d.D_Positive - d.D_Negative) / 5;
        const equity = (d.E_Positive - d.E_Negative) / 5;
        const inclusion = (d.I_Positive - d.I_Negative) / 5;
        
        switch(type) {
            case 'diversity': return diversity;
            case 'equity': return equity;
            case 'inclusion': return inclusion;
            default: return (diversity + equity + inclusion) / 3;
        }
    }
    
    getIntersectionalGroups() {
        const data = this.getFilteredData();
        const minSize = 5; // Fixed minimum size
        
        // Create intersectional identity combinations
        const groups = d3.group(data, d => {
            const identities = [];
            if (d.Minority === 'Yes') identities.push('Minority');
            if (d.LGBTQ === 'Yes') identities.push('LGBTQ+');
            if (d.Disability === 'Yes') identities.push('Disability');
            if (d.Indigenous === 'Yes') identities.push('Indigenous');
            if (d.Veteran === 'Yes') identities.push('Veteran');
            
            return identities.length > 0 ? identities.join(' + ') : 'Majority Group';
        });
        
        const result = [];
        groups.forEach((members, groupName) => {
            if (members.length >= minSize) {
                const avgScore = d3.mean(members, d => this.calculateDEIScore(d, this.currentScoreType));
                const marginalizationLayers = groupName === 'Majority Group' ? 0 : groupName.split(' + ').length;
                
                result.push({
                    group: groupName,
                    count: members.length,
                    score: avgScore,
                    marginalizationLayers,
                    scoreCategory: this.getScoreCategory(avgScore),
                    x: marginalizationLayers, // X: Number of marginalization layers
                    y: avgScore, // Y: DEI Score
                    size: members.length, // Bubble size: Number of people
                    members
                });
            }
        });
        
        return result;
    }
    
    getDepartmentPerformance() {
        const data = this.getFilteredData();
        const minSize = 5; // Fixed minimum size
        
        const departments = d3.group(data, d => d.Division);
        const result = [];
        
        departments.forEach((members, deptName) => {
            if (members.length >= minSize) {
                const avgScore = d3.mean(members, d => this.calculateDEIScore(d, this.currentScoreType));
                
                // Calculate diversity index (Simpson's index)
                const genderCounts = d3.rollup(members, v => v.length, d => d.Gender);
                const total = members.length;
                let diversityIndex = 0;
                genderCounts.forEach(count => {
                    const proportion = count / total;
                    diversityIndex += proportion * proportion;
                });
                diversityIndex = 1 - diversityIndex;
                
                result.push({
                    department: deptName,
                    count: members.length,
                    score: avgScore,
                    diversityIndex,
                    scoreCategory: this.getScoreCategory(avgScore),
                    x: diversityIndex, // X: Diversity Index
                    y: avgScore, // Y: DEI Score
                    size: members.length, // Bubble size: Number of employees
                    members
                });
            }
        });
        
        return result;
    }
    
    getScoreCategory(score) {
        if (score < -1) return 'critical';
        if (score < -0.5) return 'low';
        if (score < 0) return 'moderate';
        if (score < 0.5) return 'good';
        return 'excellent';
    }
    
    updateVisualization() {
        this.updateDimensions();
        
        let chartData = [];
        
        switch(this.currentView) {
            case 'intersectional':
                chartData = this.getIntersectionalGroups();
                this.renderScatterPlot(chartData, {
                    xLabel: 'Number of Marginalization Layers',
                    yLabel: `${this.getScoreTypeLabel()} Score`,
                    title: 'Intersectional Groups Analysis'
                });
                break;
            case 'department-performance':
                chartData = this.getDepartmentPerformance();
                this.renderScatterPlot(chartData, {
                    xLabel: 'Diversity Index',
                    yLabel: `${this.getScoreTypeLabel()} Score`,
                    title: 'Department Performance vs Diversity'
                });
                break;
        }
        
        this.updateStatistics(chartData);
        this.updateLegend();
    }
    
    renderScatterPlot(data, config) {
        // Clear previous chart
        this.chartGroup.selectAll('*').remove();
        
        if (data.length === 0) {
            this.chartGroup.append('text')
                .attr('x', this.width / 2)
                .attr('y', this.height / 2)
                .attr('text-anchor', 'middle')
                .style('fill', '#d1d5db')
                .style('font-size', '16px')
                .text('No data available with current filters');
            return;
        }
        
        // Set up scales
        const xExtent = d3.extent(data, d => d.x);
        const yExtent = d3.extent(data, d => d.y);
        const sizeExtent = d3.extent(data, d => d.size);
        
        // Add padding to extents
        const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        
        this.xScale
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([0, this.width]);
            
        this.yScale
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([this.height, 0]);
            
        this.sizeScale
            .domain(sizeExtent)
            .range([6, 25]);
        
        // Add grid lines
        const xTicks = this.xScale.ticks(6);
        const yTicks = this.yScale.ticks(6);
        
        this.chartGroup.selectAll('.grid-line-x')
            .data(xTicks)
            .enter().append('line')
            .attr('class', 'grid-line')
            .attr('x1', d => this.xScale(d))
            .attr('x2', d => this.xScale(d))
            .attr('y1', 0)
            .attr('y2', this.height);
            
        this.chartGroup.selectAll('.grid-line-y')
            .data(yTicks)
            .enter().append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', d => this.yScale(d))
            .attr('y2', d => this.yScale(d));
        
        // Add bubbles
        this.chartGroup.selectAll('.bubble')
            .data(data)
            .enter().append('circle')
            .attr('class', 'bubble')
            .attr('cx', d => this.xScale(d.x))
            .attr('cy', d => this.yScale(d.y))
            .attr('r', d => this.sizeScale(d.size))
            .attr('fill', d => this.colorScale(d.scoreCategory))
            .attr('opacity', 0.7)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.handleBubbleClick(d));
        
        // Add axes
        this.chartGroup.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale).ticks(6));
        
        this.chartGroup.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(this.yScale).ticks(6));
        
        // Add axis labels
        this.chartGroup.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height + 65)
            .attr('text-anchor', 'middle')
            .style('fill', '#d1d5db')
            .style('font-size', '16px')
            .text(config.xLabel);
        
        this.chartGroup.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -85)
            .attr('x', -this.height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', '#d1d5db')
            .style('font-size', '16px')
            .text(config.yLabel);
        
        // Add reference lines if needed
        if (this.currentView === 'intersectional' || this.currentView === 'department-performance') {
            // Add horizontal line at y=0
            if (yExtent[0] < 0 && yExtent[1] > 0) {
                this.chartGroup.append('line')
                    .attr('class', 'reference-line')
                    .attr('x1', 0)
                    .attr('x2', this.width)
                    .attr('y1', this.yScale(0))
                    .attr('y2', this.yScale(0))
                    .attr('stroke', '#ffffff')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '5,5')
                    .attr('opacity', 0.5);
            }
        }
    }
    
    handleBubbleClick(d) {
        // Add click interaction - could expand bubble or show details
        console.log('Clicked:', d);
    }
    
    updateStatistics(data) {
        const criticalGroups = data.filter(d => (d.score || d.y) < -0.5); // Fixed threshold of -0.5
        
        d3.select('#total-groups').text(data.length);
        d3.select('#critical-groups').text(criticalGroups.length);
        
        if (data.length > 0) {
            const bestPerformer = data.reduce((a, b) => 
                (a.score || a.y || 0) > (b.score || b.y || 0) ? a : b);
            const worstPerformer = data.reduce((a, b) => 
                (a.score || a.y || 0) < (b.score || b.y || 0) ? a : b);
            
            const bestName = bestPerformer.group || bestPerformer.department || 'N/A';
            const worstName = worstPerformer.group || worstPerformer.department || 'N/A';
            
            d3.select('#best-group').text(bestName.length > 15 ? bestName.substring(0, 15) + '...' : bestName);
            d3.select('#worst-group').text(worstName.length > 15 ? worstName.substring(0, 15) + '...' : worstName);
        }
        
        // Update progress bar
        const progressValue = data.length > 0 ? (data.length - criticalGroups.length) / data.length : 0;
        d3.select('#progress-fill').style('width', (progressValue * 100) + '%');
    }
    
    updateLegend() {
        const legendContainer = d3.select('.legend-container');
        legendContainer.selectAll('*').remove();
        
        const categories = ['critical', 'low', 'moderate', 'good', 'excellent'];
        const labels = ['Critical', 'Low', 'Moderate', 'Good', 'Excellent'];
        
        categories.forEach((category, i) => {
            const legendItem = legendContainer.append('div').attr('class', 'legend-item');
            
            legendItem.append('div')
                .attr('class', 'legend-color')
                .style('background-color', this.colorScale(category));
            
            legendItem.append('span').text(labels[i]);
        });
        
        // Add size legend
        const sizeLegend = legendContainer.append('div').attr('class', 'size-legend');
        sizeLegend.append('span').text('Bubble size = Count/Priority');
    }
    
    getScoreTypeLabel() {
        const labels = {
            'overall': 'Overall DEI',
            'diversity': 'Diversity',
            'equity': 'Equity',
            'inclusion': 'Inclusion'
        };
        return labels[this.currentScoreType] || 'DEI';
    }
    
    showTooltip(event, d) {
        let content = '';
        
        switch(this.currentView) {
            case 'intersectional':
                content = `
                    <div class="tooltip-title">${d.group}</div>
                    <div class="tooltip-content">
                        Employees: ${d.count}<br>
                        Score: ${d.score.toFixed(3)}<br>
                        Layers: ${d.marginalizationLayers}<br>
                        Category: ${d.scoreCategory}
                    </div>
                `;
                break;
            case 'department-performance':
                content = `
                    <div class="tooltip-title">${d.department}</div>
                    <div class="tooltip-content">
                        Employees: ${d.count}<br>
                        DEI Score: ${d.score.toFixed(3)}<br>
                        Diversity Index: ${d.diversityIndex.toFixed(3)}<br>
                        Category: ${d.scoreCategory}
                    </div>
                `;
                break;
        }
        
        this.tooltip
            .style('opacity', 1)
            .html(content)
            .classed('show', true);
        
        this.moveTooltip(event);
    }
    
    moveTooltip(event) {
        const tooltipWidth = this.tooltip.node().offsetWidth;
        const tooltipHeight = this.tooltip.node().offsetHeight;
        
        let left = event.pageX + 10;
        let top = event.pageY - 10;
        
        // Prevent tooltip from going off-screen
        if (left + tooltipWidth > window.innerWidth - 20) {
            left = event.pageX - tooltipWidth - 10;
        }
        
        if (top - tooltipHeight < 20) {
            top = event.pageY + 20;
        }
        
        this.tooltip
            .style('left', left + 'px')
            .style('top', top + 'px');
    }
    
    hideTooltip() {
        this.tooltip
            .style('opacity', 0)
            .classed('show', false);
    }
}

// Initialize visualization when page loads
document.addEventListener('DOMContentLoaded', () => {
    new IntersectionalAnalysis();
});
