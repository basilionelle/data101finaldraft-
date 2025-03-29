// Sample data - Replace with your actual data
const sampleData = {
    cities: [
        { name: 'Bacoor Cavite', coordinates: [14.4621, 120.9271], rating: 4.6, foodTypes: ['Filipino', 'Healthy'] },
        { name: 'Cebu City', coordinates: [10.3157, 123.8854], rating: 4.5, foodTypes: ['Lechon', 'Coffee'] },
        { name: 'Davao City', coordinates: [7.0707, 125.6087], rating: 4.4, foodTypes: ['Japanese', 'Milk Tea'] },
        { name: 'Makati City', coordinates: [14.5547, 121.0244], rating: 4.7, foodTypes: ['Japanese', 'International'] },
        { name: 'Quezon City', coordinates: [14.6760, 121.0437], rating: 4.6, foodTypes: ['Filipino', 'Japanese'] }
    ],
    foodTypes: [
        { name: 'Filipino', count: 42 },
        { name: 'Japanese', count: 28 },
        { name: 'Coffee', count: 25 },
        { name: 'Milk Tea', count: 22 },
        { name: 'Healthy', count: 18 },
        { name: 'Chicken', count: 15 }
    ],
    stores: [
        { name: 'Toss Eat Bar and Restaurant', rating: 4.8, reviewers: 2000, city: 'Bacoor Cavite', foodType: 'Filipino' },
        { name: '24 Chicken', rating: 4.8, reviewers: 5000, city: 'Cebu City', foodType: 'Chicken' },
        { name: 'Botejyu', rating: 4.3, reviewers: 59, city: 'Davao City', foodType: 'Japanese' },
        { name: 'Nikkei', rating: 4.6, reviewers: 100, city: 'Makati City', foodType: 'Japanese' },
        { name: 'Gorudo Ramen', rating: 4.8, reviewers: 77, city: 'Quezon City', foodType: 'Japanese' }
    ]
};

// State management for filters
let currentFilters = {
    selectedCity: null,
    selectedFoodType: null,
    minRating: 1
};

// Initialize filters
const initializeFilters = () => {
    const foodTypeSelect = document.getElementById('foodTypeSelect');
    const ratingRange = document.getElementById('ratingRange');
    const ratingValue = document.getElementById('ratingValue');

    // Populate food type dropdown
    const uniqueFoodTypes = [...new Set(sampleData.stores.map(store => store.foodType))];
    uniqueFoodTypes.forEach(foodType => {
        const option = document.createElement('option');
        option.value = foodType;
        option.textContent = foodType;
        foodTypeSelect.appendChild(option);
    });

    // Event listeners for filters
    foodTypeSelect.addEventListener('change', (e) => {
        currentFilters.selectedFoodType = e.target.value;
        updateVisualizations();
    });

    ratingRange.addEventListener('input', (e) => {
        currentFilters.minRating = parseFloat(e.target.value);
        ratingValue.textContent = `${currentFilters.minRating.toFixed(1)}★`;
        updateVisualizations();
    });
};

// Initialize map
const map = L.map('choropleth-map').setView([12.8797, 121.7740], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors'
}).addTo(map);

// Function to filter data based on current filters
const filterData = () => {
    return sampleData.stores.filter(store => {
        const cityMatch = !currentFilters.selectedCity || store.city === currentFilters.selectedCity;
        const foodTypeMatch = !currentFilters.selectedFoodType || store.foodType === currentFilters.selectedFoodType;
        const ratingMatch = store.rating >= currentFilters.minRating;
        return cityMatch && foodTypeMatch && ratingMatch;
    });
};

// Function to update visualizations
const updateVisualizations = () => {
    barChart.update();
    scatterPlot.update();
    updateMapMarkers();
};

// Function to update map markers
const updateMapMarkers = () => {
    const filteredStores = filterData();
    const activeCities = new Set(filteredStores.map(store => store.city));

    Object.entries(markers).forEach(([cityName, marker]) => {
        const isActive = activeCities.has(cityName);
        marker.setStyle({
            fillOpacity: isActive ? 0.8 : 0.3
        });
    });
};

// Add markers to map with color based on rating
const markers = {};
sampleData.cities.forEach(city => {
    const color = city.rating >= 4.2 ? '#D73027' :
                 city.rating >= 3.8 ? '#FEC44F' : '#FFF7BC';
    
    const marker = L.circleMarker(city.coordinates, {
        radius: 10,
        fillColor: color,
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    })
    .bindPopup(`
        <b>${city.name}</b><br>
        Rating: ${city.rating}<br>
        Food Types: ${city.foodTypes.join(', ')}
    `)
    .addTo(map);

    marker.on('mouseover', () => {
        currentFilters.selectedCity = city.name;
        updateVisualizations();
        marker.openPopup();
    });

    marker.on('mouseout', () => {
        currentFilters.selectedCity = null;
        updateVisualizations();
        marker.closePopup();
    });

    marker.on('click', () => {
        if (currentFilters.selectedCity === city.name) {
            currentFilters.selectedCity = null;
        } else {
            currentFilters.selectedCity = city.name;
        }
        updateVisualizations();
    });

    markers[city.name] = marker;
});

// Create bar chart
const barChart = {
    svg: null,
    x: null,
    y: null,

    init: () => {
        const margin = {top: 20, right: 20, bottom: 30, left: 100};
        const width = document.getElementById('bar-chart').clientWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        barChart.svg = d3.select('#bar-chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        barChart.x = d3.scaleLinear()
            .range([0, width]);

        barChart.y = d3.scaleBand()
            .range([0, height])
            .padding(0.1);

        barChart.svg.append('g')
            .attr('class', 'y-axis');

        barChart.svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`);

        barChart.update();
    },

    update: () => {
        const filteredData = sampleData.foodTypes.map(type => {
            const filteredStores = filterData().filter(store => store.foodType === type.name);
            return {
                name: type.name,
                count: filteredStores.length,
                totalCount: type.count
            };
        });

        barChart.x.domain([0, d3.max(filteredData, d => d.totalCount)]);
        barChart.y.domain(filteredData.map(d => d.name));

        const bars = barChart.svg.selectAll('rect')
            .data(filteredData);

        // Update existing bars
        bars.transition()
            .duration(300)
            .attr('y', d => barChart.y(d.name))
            .attr('height', barChart.y.bandwidth())
            .attr('width', d => barChart.x(d.totalCount))
            .attr('fill-opacity', d => {
                if (!currentFilters.selectedFoodType) return 1;
                return d.name === currentFilters.selectedFoodType ? 1 : 0.3;
            })
            .attr('fill', d => currentFilters.selectedFoodType === d.name ? '#FF6B6B' : '#4ECDC4');

        // Add new bars
        bars.enter()
            .append('rect')
            .attr('y', d => barChart.y(d.name))
            .attr('height', barChart.y.bandwidth())
            .attr('x', 0)
            .attr('width', d => barChart.x(d.totalCount))
            .attr('fill', d => currentFilters.selectedFoodType === d.name ? '#FF6B6B' : '#4ECDC4')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                if (currentFilters.selectedFoodType === d.name) {
                    currentFilters.selectedFoodType = null;
                } else {
                    currentFilters.selectedFoodType = d.name;
                }
                // Update dropdown to match selection
                document.getElementById('foodTypeSelect').value = currentFilters.selectedFoodType || '';
                updateVisualizations();
            });

        // Remove old bars
        bars.exit().remove();

        // Update axes
        barChart.svg.select('.y-axis')
            .transition()
            .duration(300)
            .call(d3.axisLeft(barChart.y));

        barChart.svg.select('.x-axis')
            .transition()
            .duration(300)
            .call(d3.axisBottom(barChart.x));

        // Add count labels
        const labels = barChart.svg.selectAll('.count-label')
            .data(filteredData);

        labels.enter()
            .append('text')
            .attr('class', 'count-label')
            .merge(labels)
            .transition()
            .duration(300)
            .attr('x', d => barChart.x(d.totalCount) + 5)
            .attr('y', d => barChart.y(d.name) + barChart.y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .text(d => `${d.count}/${d.totalCount}`);

        labels.exit().remove();
    }
};

// Create scatter plot
const scatterPlot = {
    svg: null,
    x: null,
    y: null,

    init: () => {
        const margin = {top: 20, right: 20, bottom: 30, left: 40};
        const width = document.getElementById('scatter-plot').clientWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        scatterPlot.svg = d3.select('#scatter-plot')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        scatterPlot.x = d3.scaleLinear()
            .domain([0, 5])
            .range([0, width]);

        scatterPlot.y = d3.scaleLinear()
            .domain([0, d3.max(sampleData.stores, d => d.reviewers)])
            .range([height, 0]);

        scatterPlot.svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(scatterPlot.x));

        scatterPlot.svg.append('g')
            .call(d3.axisLeft(scatterPlot.y));

        scatterPlot.update();
    },

    update: () => {
        const filteredData = filterData();
        const tooltip = d3.select('body').selectAll('.tooltip').data([0]);
        
        const tooltipEnter = tooltip.enter()
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        const dots = scatterPlot.svg.selectAll('circle')
            .data(filteredData);

        // Update existing dots
        dots.transition()
            .duration(300)
            .attr('cx', d => scatterPlot.x(d.rating))
            .attr('cy', d => scatterPlot.y(d.reviewers))
            .style('opacity', 1);

        // Add new dots
        dots.enter()
            .append('circle')
            .attr('cx', d => scatterPlot.x(d.rating))
            .attr('cy', d => scatterPlot.y(d.reviewers))
            .attr('r', 6)
            .style('fill', d => {
                if (currentFilters.selectedCity === d.city) return '#FF6B6B';
                if (currentFilters.selectedFoodType === d.foodType) return '#FF6B6B';
                return '#4ECDC4';
            })
            .style('opacity', 0)
            .transition()
            .duration(300)
            .style('opacity', 1)
            .on('mouseover', (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`
                    Store: ${d.name}<br/>
                    Rating: ${d.rating}<br/>
                    Reviewers: ${d.reviewers}<br/>
                    City: ${d.city}<br/>
                    Food Type: ${d.foodType}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Remove old dots
        dots.exit()
            .transition()
            .duration(300)
            .style('opacity', 0)
            .remove();
    }
};

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeFilters();
    barChart.init();
    scatterPlot.init();
});
