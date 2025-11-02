import { Component, ChangeDetectionStrategy, input, ElementRef, viewChild, effect } from '@angular/core';
import * as d3 from 'd3';

interface MoodData {
  rating: number;
  timestamp: Date;
}

@Component({
  selector: 'app-mood-chart',
  standalone: true,
  template: `<div #chart class="w-full h-64 mt-4 mb-2"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoodChartComponent {
  data = input.required<MoodData[]>();
  
  private chartContainer = viewChild<ElementRef<HTMLDivElement>>('chart');

  constructor() {
    effect(() => {
      // Re-run the chart creation when data or the container is available/changes.
      if (this.data() && this.chartContainer()) {
        this.createChart();
      }
    });
  }

  private createChart(): void {
    const element = this.chartContainer()?.nativeElement;
    if (!element || !this.data() || this.data().length === 0) {
      return;
    }

    const data = this.data();
    d3.select(element).select('svg').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 30 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = 256 - margin.top - margin.bottom;

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.timestamp) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0.5, 5.5]) // Extend domain for better padding
      .range([height, 0]);

    // X-axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(d3.timeDay.every(1)).tickFormat(d3.timeFormat('%a')))
      .selectAll('text')
      .style('fill', 'currentColor');

    // Y-axis
    const yAxis = svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => {
        const emojis = ['','😔', '😕', '😐', '🙂', '😄'];
        // Fix: d3.NumberValue must be converted to a primitive number for comparisons.
        const tickValue = d.valueOf();
        return Number.isInteger(tickValue) && tickValue > 0 && tickValue < 6 ? emojis[tickValue] : '';
      }))
      .selectAll('text')
      .style('font-size', '1.2rem');
      
    svg.selectAll('.domain, .tick line').style('stroke', 'currentColor');
    
    // Line
    const line = d3.line<MoodData>()
      .x(d => x(d.timestamp))
      .y(d => y(d.rating))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Points
    svg.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.timestamp))
      .attr('cy', d => y(d.rating))
      .attr('r', 4)
      .attr('fill', 'steelblue');
  }
}
