const customerCountries = [
    'Australia',
    'Austria',
    'Canada',
    'Iceland',
    'Ireland',
    'Italy',
    'Norway',
    'United Kingdom',
    'United States'
];

document.addEventListener('DOMContentLoaded', function() {
    fetch('../assets/data/world-110m.json')
        .then(response => {
            if (!response.ok) {
                console.error('Failed to load map data:', response.status, response.statusText);
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(worldData => {
            if (!worldData || !worldData.objects || !worldData.objects.countries) {
                throw new Error('Invalid map data format');
            }

            const container = document.getElementById('world-map');
            const width = container.clientWidth;
            const height = Math.min(600, width * 0.55);
            
            const svg = d3.select('#world-map')
                .append('svg')
                .attr('width', '100%')
                .attr('height', height)
                .attr('viewBox', `0 0 ${width} ${height}`)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .style('background-color', '#ffffff');

            // Create tooltip
            const tooltip = d3.select('#world-map')
                .append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0)
                .style('position', 'absolute')
                .style('background-color', 'rgba(0, 0, 0, 0.9)')
                .style('color', 'white')
                .style('padding', '8px 12px')
                .style('border-radius', '4px')
                .style('font-size', '14px')
                .style('font-weight', '500')
                .style('pointer-events', 'none')
                .style('box-shadow', '0 2px 8px rgba(0,0,0,0.2)');

            // Use Robinson projection for better global view
            const projection = d3.geoRobinson()
                .scale(width * 0.16)
                .translate([width / 2, height / 2]);

            const path = d3.geoPath().projection(projection);

            const countries = topojson.feature(worldData, worldData.objects.countries);

            // Draw all countries
            svg.selectAll('path')
                .data(countries.features)
                .enter()
                .append('path')
                .attr('d', path)
                .attr('fill', d => {
                    const countryName = d.properties.name;
                    return customerCountries.includes(countryName) ? '#b8b8b8' : '#e0e0e0';
                })
                .attr('stroke', '#ffffff')
                .attr('stroke-width', '0.5')
                .style('cursor', 'pointer')
                .on('mouseover', function(event, d) {
                    // Highlight effect
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', d => {
                            const countryName = d.properties.name;
                            return customerCountries.includes(countryName) ? '#909090' : '#c8c8c8';
                        })
                        .attr('stroke', '#ffd700')  // Golden highlight
                        .attr('stroke-width', '2');
                    
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 1);
                    
                    tooltip.html(d.properties.name)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mousemove', function(event) {
                    tooltip
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', d => {
                            const countryName = d.properties.name;
                            return customerCountries.includes(countryName) ? '#b8b8b8' : '#e0e0e0';
                        })
                        .attr('stroke', '#ffffff')
                        .attr('stroke-width', '0.5');
                    
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });
        })
        .catch(error => {
            console.error('Error loading the world map:', error);
            document.getElementById('world-map').innerHTML = 'Error loading map: ' + error.message;
        });
}); 