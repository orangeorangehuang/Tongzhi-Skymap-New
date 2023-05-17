'use client';

import React, { useEffect, useState, useRef } from 'react';
import { drag, zoom } from 'd3';
import { select } from 'd3-selection';
import { geoPath, geoGraticule10 } from 'd3-geo';
// @ts-ignore
import { geoAitoff } from 'd3-geo-projection';

import { starData, lineData, constData, milkyData } from '@/data/starData';

const colorPalette: {[key: string]: string} = {
  黃: '#FED049',
  紅: '#DC3535',
  黑: '#69687d',
  白: '#FFFFFF',
  level1: '#FFFFFF',
  level2: '#FFDEB4',
  level3: '#F15A59',
};

const sizePalette: {[key: string]: string} = {
  level1: '15',
  level2: '18',
  level3: '22',
};

const Skymap = () => {
  const [showStarName, setShowStarName] = useState(true);
  const svgRef = useRef(null);
  const rotate = [0, -90];
  const scale = 650;

  useEffect(() => {
    let svg = select(svgRef.current);
    let projection = geoAitoff()
      .scale(scale)
      .rotate(rotate)
      .translate([window.innerWidth / 2, window.innerHeight / 2]);
    let pathGenerator = geoPath(projection);

    svg
      .append('defs')
      .append('path')
      .datum({ type: 'Sphere' })
      .attr('id', 'sphere')
      .attr('d', pathGenerator({ type: 'Sphere' }));
    svg.append('use').attr('class', 'stroke').attr('xlink:href', '#sphere');
    svg.append('path').datum(geoGraticule10()).attr('class', 'stroke').attr('d', pathGenerator);

    console.log(milkyData);

    // @ts-ignore
    svg.selectAll('.milkyWay').data(milkyData).enter().append('path').attr('d', pathGenerator).attr('class', 'milkyWay');
    // @ts-ignore
    svg.selectAll('.starline').data(lineData).enter().append('path').attr('d', pathGenerator).attr('class', 'starLine');

    svg
      .selectAll('g')
      .data(starData)
      .enter()
      .append('g')
      .append('circle')
      .attr('cx', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0];
      })
      .attr('cy', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1];
      })
      .attr('r', 2)
      .attr('id', (d) => {
        return d.properties.id;
      })
      .style('fill', (d) => {
        return colorPalette[d.properties.color];
      });

    svg
      .selectAll('g')
      .data(starData)
      .append('text')
      .text((d) => {
        return d.properties.display_name;
      })
      .attr('x', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0] - 10;
      })
      .attr('y', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1] - 5;
      })
      .attr('class', 'starText');

    svg
      .selectAll('.constellation')
      .data(constData)
      .enter()
      .append('text')
      .text((d) => {
        return d.properties.display_name;
      })
      // @ts-ignore
      .attr('d', pathGenerator)
      .attr('x', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0] - 15;
      })
      .attr('y', (d) => {
        return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1] - 5;
      })
      .attr('id', (d) => {
        return d.properties.id;
      })
      .attr('name', (d) => {
        return d.properties.name;
      })
      .style('fill', (d) => {
        return colorPalette['level' + d.properties.color];
      })
      .style('font-size', (d) => {
        return sizePalette['level' + d.properties.color];
      })
      .attr('class', 'constellation');

    // Update Coorinates
    const updateCord = () => {
      svg.selectAll('path').attr('d', (d: any) => {
        return geoPath(projection)(d);
      });
      svg
        .selectAll('circle')
        .data(starData)
        .attr('cx', (d) => {
          return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0];
        })
        .attr('cy', (d) => {
          return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1];
        });
      svg
        .selectAll('.starText')
        .data(starData)
        .attr('x', (d) => {
          return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0] - 10;
        })
        .attr('y', (d) => {
          return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1] - 5;
        });
      svg
        .selectAll('.constellation')
        .data(constData)
        .attr('x', (d) => {
          return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[0] - 15;
        })
        .attr('y', (d) => {
          return projection([+d.geometry.coordinates[0], +d.geometry.coordinates[1]])[1] - 5;
        });
    };

    // Drag Event
    const dragBehavior = drag<any, any>().on('drag', (event) => {
      const { dx, dy } = event;
      rotate[0] += dx;
      rotate[1] -= dy;
      projection.rotate(rotate);
      updateCord();
    });

    // Zoom Event
    const zoomBehavior = zoom<any, any>().on('zoom', (event) => {
      if (event.transform.k > 5) {
        // zoom too close
        event.transform.k = 5;
      } else if (event.transform.k < 0.4) {
        // zoom too far
        event.transform.k = 0.4;
      } else if (event.transform.k < 1 && showStarName) {
        // disable words
        setShowStarName(false);
        svg.selectAll('.starText').data(starData).attr('display', 'none');
      } else if (showStarName) {
        // show words
        setShowStarName(true);
        svg.selectAll('.starText').data(starData).attr('display', 'block');
      }
      projection.scale(scale * event.transform.k);
      updateCord();
    });

    svg.call(dragBehavior);
    svg.call(zoomBehavior);
  });

  return (
    <>
      <svg
        ref={svgRef}
        style={{
          height: '100%',
          width: '100%',
          marginRight: '0px',
          marginLeft: '0px',
          backgroundColor: 'black',
        }}
      ></svg>
    </>
  );
};

export default Skymap;