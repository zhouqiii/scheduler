/* eslint-disable no-unused-vars */
/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
import $ from 'jquery';
import * as d3 from 'd3';
import 'jquery-ui/ui/widgets/tooltip';
import 'jquery-ui/themes/base/tooltip.css';
import 'jquery-ui/themes/base/theme.css';
import { rtInstancesTooltip, rtCountMethod } from './util';
import { tasksState, tasksType } from '../../components/Dag/config';

let self = this;
let ToolData = '';

const Tree = function () {
  self = this;
  this.selfTree = {};
  this.tree = function () {};
  // basic configuration
  this.config = {
    barHeight: 26,
    axisHeight: 40,
    squareSize: 10,
    squarePading: 4,
    taskNum: 25,
    nodesMax: 0,
  };
  // Margin configuration
  this.config.margin = {
    top: this.config.barHeight / 2 + this.config.axisHeight,
    right: 0,
    bottom: 0,
    left: this.config.barHeight / 2,
  };
  // width
  this.config.margin.width = 960 - this.config.margin.left - this.config.margin.right;
  // bar width
  this.config.barWidth = parseInt(this.config.margin.width * 0.9, 10);
};

/**
 * init
 */
Tree.prototype.init = function ({ data, limit, selfTree }) {
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    this.selfTree = selfTree;
    this.config.taskNum = limit;
    this.duration = 400;
    this.i = 0;
    this.tree = d3.layout.tree().nodeSize([0, 46]);
    const tasks = this.tree.nodes(data);

    this.diagonal = d3.svg
      .diagonal()
      .projection((d) => [d.y, d.x]);

    this.svg = d3.select('.tree')
      .append('g')
      .attr('class', 'level')
      .attr('transform', `translate(${this.config.margin.left},${this.config.margin.top})`);
    data.x0 = 0;
    data.y0 = 0;
    this.squareNum = tasks[tasks.length === 1 ? 0 : 1].instances.length;

    // Calculate the maximum node length
    this.config.nodesMax = rtCountMethod(data.children);

    this.treeUpdate(this.root = data).then(() => {
      this.treeTooltip();
      selfTree.isLoading = false;
      resolve();
    });
  });
};

/**
 * tasks
 */
Tree.prototype.nodesClass = function (d) {
  let sclass = 'node';
  // eslint-disable-next-line no-underscore-dangle
  if (d.children === undefined && d._children === undefined) {
    sclass += ' leaf';
  } else {
    sclass += ' parent';
    if (d.children === undefined) { sclass += ' collapsed'; } else { sclass += ' expanded'; }
  }
  return sclass;
};

/**
 * toottip handle
 */
Tree.prototype.treeTooltip = function () {
  $('rect.state').tooltip({
    html: true,
    container: 'body',
    content() {
      return rtInstancesTooltip(ToolData);
    },
  });
  $('circle.task').tooltip({
    html: true,
    container: 'body',
  });
};

/**
 * tree Expand hidden
 */
Tree.prototype.treeToggles = function (clicked_d) { // eslint-disable-line

  self.removeTooltip();

  d3.selectAll(`[task_id=${clicked_d.uuid}]`).each((d) => {
    if (clicked_d !== d && d.children) { // eslint-disable-line
      d._children = d.children;
      d.children = null;
      self.treeUpdate(d);
    }
  });
  if (clicked_d._children) {
    clicked_d.children = clicked_d._children;
    clicked_d._children = null;
  } else {
    clicked_d._children = clicked_d.children;
    clicked_d.children = null;
  }
  self.treeUpdate(clicked_d);
  self.treeTooltip();
};

/**
 * update tree
 */
Tree.prototype.treeUpdate = function (source) {
  return new Promise((resolve) => {
    const tasks = this.tree.nodes(this.root);
    const height = Math.max(500, tasks.length * this.config.barHeight
       + this.config.margin.top + this.config.margin.bottom);
    const width = (this.config.nodesMax * 70)
     + (this.squareNum * (this.config.squareSize + this.config.squarePading))
     + this.config.margin.left + this.config.margin.right + 50;

    d3.select('svg')
      .transition()
      .duration(this.duration)
      .attr('height', height)
      .attr('width', width);
    tasks.forEach((n, i) => {
      n.x = i * this.config.barHeight;
    });
    const task = this.svg.selectAll('g.node')
      // eslint-disable-next-line no-return-assign
      .data(tasks, (d) => d.id || (d.id = ++this.i));

    const nodeEnter = task.enter()
      .append('g')
      .attr('class', this.nodesClass)
      .attr('transform', () => `translate(${source.y0},${source.x0})`)
      .style('opacity', 1e-6);

    // Node circle
    nodeEnter.append('circle')
      .attr('r', (this.config.barHeight / 3))
      .attr('class', 'task')
      .attr('data-toggle', 'tooltip')
      .attr('title', (d) => (d.type ? d.type : ''))
      .attr('height', this.config.barHeight)
      .attr('width', (d) => this.config.barWidth - d.y)
      .style('fill', (d) => (d.type ? tasksType[d.type].color : '#fff'))
      .attr('task_id', (d) => d.name)
      .on('click', this.treeToggles);

    // Node text
    nodeEnter.append('text')
      .attr('dy', 3.5)
      .attr('dx', this.config.barHeight / 2)
      .text((d) => d.name);

    // Right node information
    nodeEnter.append('g')
      .attr('class', 'stateboxes')
      .attr('transform', (d) => `translate(${(this.config.nodesMax * 60) - d.y},0)`)
      .selectAll('rect')
      .data((d) => d.instances)
      .enter()
      .append('rect')
      .on('click', (d) => {
        this.removeTooltip();
        if (d.type === 'SUB_PROCESS') {
          this.selfTree.onSubProcessHandle(d.subflowId);
        }
      })
      .attr('class', 'state')
      .style('fill', (d) => (d.state && tasksState[d.state].color) || '#ffffff')
      .attr('data-toggle', 'tooltip')
      .attr('rx', (d) => (d.type ? 0 : 12))
      .attr('ry', (d) => (d.type ? 0 : 12))
      .style('shape-rendering', (d) => (d.type ? 'crispEdges' : 'auto'))
      .attr('title', (data) => rtInstancesTooltip(data))
      .attr('x', (d, i) => (i * (this.config.squareSize + this.config.squarePading)))
      .attr('y', -(this.config.squareSize / 2))
      .attr('width', 10)
      .attr('height', 10)
      .on('mouseover', (data) => {
        ToolData = data;
        d3.select(this).transition();
      })
      .on('mouseout', () => {
        $('.ui-tooltip').css('display', 'none');
        d3.select(this).transition();
      });

    // Convert nodes to their new location。
    nodeEnter.transition()
      .duration(this.duration)
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .style('opacity', 1);

    // Node line
    task.transition()
      .duration(this.duration)
      .attr('class', this.nodesClass)
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .style('opacity', 1);

    // Convert the exit node to the new location of the parent node。
    task.exit().transition()
      .duration(this.duration)
      .attr('transform', (d) => `translate(${source.y},${source.x})`)
      .style('opacity', 1e-6)
      .remove();

    // Update link
    const link = this.svg.selectAll('path.link')
      .data(this.tree.links(tasks), (d) => d.target.id);

    // Enter any new links in the previous location of the parent node。
    link.enter().insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        // console.log(d);
        const o = { x: source.x0, y: source.y0 };
        return this.diagonal({ source: o, target: o });
      })
      .transition()
      .duration(this.duration)
      .attr('d', this.diagonal);

    // Transition link
    link.transition()
      .duration(this.duration)
      .attr('d', this.diagonal);

    // Convert the exit node to the new location of the parent node
    link.exit().transition()
      .duration(this.duration)
      .attr('d', (d) => {
        const o = { x: source.x, y: source.y };
        return this.diagonal({ source: o, target: o });
      })
      .remove();

    // Hide the old position for a transition.
    tasks.forEach((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
    resolve();
  });
};

/**
 * reset
 */
Tree.prototype.reset = function () {
  $('.d3-tree .tree').html('');
};

/**
 * Manually clear tooltip
 */
Tree.prototype.removeTooltip = function () {
  $('body').find('.tooltip.fade.top.in').remove();
};

export default new Tree();
