// Configuration
const gridSize = 100;
const cellSize = 6;
const margin = { top: 20, right: 20, bottom: 20, left: 20 };

// Color schemes for different dimensions
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
let currentDimension = 'Gender';
let activeFilters = {};

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
            nationality: d.Nationality,
            gender: d.Gender,
            sexualOrientation: d.Sexual_Orientation,
            lgbtq: d.LGBTQ,
            indigenous: d.Indigenous,
            ethnicity: d.Ethnicity,
            disability: d.Disability,
            veteran: d.Veteran,
            age: +d.Age,
            ageGroup: getAgeGroup(+d.Age),
            x: i % gridSize,
            y: Math.floor(i / gridSize)
        }));

        filteredData = [...data];
        updateVisualization();
        createFilters();
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
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDimension = this.dataset.dimension;
            updateVisualization();
        });
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
            document.getElementById('age-range').textContent = `${min}-${max}`;
            filterData();
        });
    });
}

// Create filter checkboxes
function createFilters() {
    const container = document.getElementById('filters-container');
    const dimensions = ['Gender', 'LGBTQ', 'Ethnicity', 'Sexual_Orientation', 'Veteran', 'Disability', 'Indigenous'];
    
    dimensions.forEach(dim => {
        const values = [...new Set(data.map(d => getDimensionValue(d, dim)))].filter(v => v);
        
        const group = document.createElement('div');
        group.className = 'filter-group';
        group.innerHTML = `<h4 style="color: #f9fafb; font-size: 0.9rem; margin-bottom: 0.5rem;">${dim}</h4>`;
        
        values.forEach(value => {
            const item = document.createElement('div');
            item.className = 'filter-item';
            item.innerHTML = `
                <input type="checkbox" id="${dim}-${value}" checked data-dimension="${dim}" data-value="${value}">
                <label for="${dim}-${value}">${value}</label>
            `;
            
            item.querySelector('input').addEventListener('change', filterData);
            group.appendChild(item);
        });
        
        container.appendChild(group);
    });
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

// Filter data based on active filters
function filterData() {
    const ageMin = +document.getElementById('age-min').value;
    const ageMax = +document.getElementById('age-max').value;
    
    // Get active checkboxes
    const activeCheckboxes = {};
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        const dim = cb.dataset.dimension;
        const value = cb.dataset.value;
        if (!activeCheckboxes[dim]) activeCheckboxes[dim] = [];
        activeCheckboxes[dim].push(value);
    });

    filteredData = data.filter(d => {
        // Age filter
        if (d.age < ageMin || d.age > ageMax) return false;
        
        
        for (const [dim, values] of Object.entries(activeCheckboxes)) {
            if (!values.includes(getDimensionValue(d, dim))) return false;
        }
        
        return true;
    });

    updateVisualization();
    updateStats();
}

// Update visualization
function updateVisualization() {
    const svg = d3.select('.waffle-grid');
    svg.selectAll('*').remove();

    
    const values = [...new Set(filteredData.map(d => getDimensionValue(d, currentDimension)))].filter(v => v);
    const colorScale = d3.scaleOrdinal()
        .domain(values)
        .range(colorSchemes[currentDimension] || d3.schemeCategory10);

    
    const gridData = Array(gridSize * gridSize).fill(null).map((_, i) => {
        const dataPoint = filteredData[i];
        return {
            x: i % gridSize,
            y: Math.floor(i / gridSize),
            data: dataPoint
        };
    });

   
    const cells = svg.selectAll('.waffle-cell')
        .data(gridData);

    cells.enter()
        .append('rect')
        .attr('class', 'waffle-cell')
        .attr('x', d => d.x * cellSize)
        .attr('y', d => d.y * cellSize)
        .attr('width', cellSize - 0.5)
        .attr('height', cellSize - 0.5)
        .attr('fill', d => d.data ? colorScale(getDimensionValue(d.data, currentDimension)) : '#2a2a2a')
        .attr('opacity', d => d.data ? 1 : 0.3)
        .on('mouseover', function(event, d) {
            if (d.data) showTooltip(event, d.data);
        })
        .on('mouseout', hideTooltip);

    
    updateLegend(values, colorScale);
}

// Update legend
function updateLegend(values, colorScale) {
    const legend = d3.select('.legend');
    legend.selectAll('*').remove();

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
    
    const percentage = (filteredData.length / data.length) * 100;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
}

// Tooltip functions
function showTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `
        <strong>${d.name} ${d.surname}</strong><br>
        Division: ${d.division}<br>
        Nationality: ${d.nationality}<br>
        Age: ${d.age} years
    `;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.opacity = 0;
}