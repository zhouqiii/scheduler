/* eslint-disable no-unused-vars */
import $ from 'jquery';
import _ from 'lodash';
import store from '../../../store';

/**
 * Node, to array
 */
const rtTargetarrArr = (id) => {
  const ids = $(`#${id}`).attr('data-targetarr');
  return ids ? ids.split(',') : [];
};

/**
 * Store node id to targetarr
 */
const saveTargetarr = (valId, domId) => {
  const $target = $(`#${domId}`);
  const targetStr = $target.attr('data-targetarr') ? `${$target.attr('data-targetarr')},${valId}` : `${valId}`;
  $target.attr('data-targetarr', targetStr);
  console.log('Store node id to targetarr', targetStr);
};

const rtBantpl = () => '<em class="ans-icon-forbidden" data-toggle="tooltip" data-html="true" data-container="body" data-placement="left" title="Prohibition execution"></em>';

/**
 * return node html
 */
const rtTasksTpl = ({
  id, name, x, y, targetarr, isAttachment, taskType, runFlag, nodenumber, successNode, failedNode,
}) => {
  let tpl = '';
  tpl += `<div class="w jtk-draggable jtk-droppable jtk-endpoint-anchor jtk-connected ${isAttachment ? 'jtk-ep' : ''}" data-targetarr="${targetarr || ''}" data-successNode="${successNode || ''}" data-failedNode="${failedNode || ''}" data-nodenumber="${nodenumber || 0}" data-tasks-type="${taskType}" id="${id}" style="left: ${x}px; top: ${y}px;">`;
  tpl += '<div>';
  tpl += '<div class="state-p"></div>';
  tpl += `<div class="icos icos-${taskType}"></div>`;
  tpl += `<span class="name-p">${name}</span>`;
  tpl += '</div>';
  tpl += '<div class="ep"></div>';
  tpl += '<div class="ban-p">';
  if (runFlag === 'FORBIDDEN') {
    tpl += rtBantpl();
  }
  tpl += '</div>';
  tpl += '</div>';

  return tpl;
};

/**
 * Get all tasks nodes
 */
const tasksAll = () => {
  const a = [];
  $('#canvas .w').each((idx, elem) => {
    const e = $(elem);
    a.push({
      id: e.attr('id'),
      name: e.find('.name-p').text(),
      targetarr: e.attr('data-targetarr') || '',
      nodenumber: e.attr('data-nodenumber'),
      x: parseInt(e.css('left'), 10),
      y: parseInt(e.css('top'), 10),
    });
  });
  return a;
};

/**
 * Determine if name is in the current dag map
 * rely dom / backfill
 */
const isNameExDag = (name, rely) => {
  if (rely === 'dom') {
    return _.findIndex(tasksAll(), (v) => v.name === name) !== -1;
  }
  return _.findIndex(store.state.dag.tasks, (v) => v.name === name) !== -1;
};

/**
 * Change svg line color
 */
const setSvgColor = (e, color) => {
  // Traverse clear all colors
  $('.jtk-connector').each((i, o) => {
    _.map($(o)[0].childNodes, (v) => {
      if ($(v).attr('fill') === '#ccc') {
        $(v).attr('fill', '#2d8cf0');
      }
      if ($(v).attr('fill') === '#4caf50') {
        $(v).attr('fill', '#4caf50').attr('stroke', '#4caf50').attr('stroke-width', 2);
        $(v).prev().attr('stroke', '#4caf50').attr('stroke-width', 2);
      } else if ($(v).attr('fill') === '#252d39') {
        $(v).attr('stroke', '#252d39').attr('stroke-width', 2);
        $(v).prev().attr('stroke', '#252d39').attr('stroke-width', 2);
      } else {
        $(v).attr('stroke', '#2d8cf0').attr('stroke-width', 2);
      }
    });
  });

  // Add color to the selection
  _.map($(e.canvas)[0].childNodes, (v, i) => {
    if ($(v).attr('fill') === '#2d8cf0') {
      $(v).attr('fill', '#ccc');
    }
    $(v).attr('stroke', '#ccc');
    if ($(v).attr('class')) {
      $(v).attr('stroke-width', 2);
    }
  });
};

/**
 * Get all node ids
 */
const allNodesId = () => {
  const idArr = [];
  $('.w').each((i, o) => {
    const $obj = $(o);
    const $span = $obj.find('.name-p').text();
    if ($span) {
      idArr.push({
        id: $obj.attr('id'),
        name: $span,
      });
    }
  });
  return idArr;
};
/**
 * compute scale，because it cant get from jquery directly
 * @param el element
 * @returns {boolean|number}
 */
const computeScale = function (el) {
  const matrix = el.css('transform');
  if (!matrix || matrix === 'none') {
    return false;
  }
  const values = matrix.split('(')[1].split(')')[0].split(',');
  return Math.sqrt(values[0] * values[0] + values[1] * values[1]);
};

export {
  rtTargetarrArr,
  saveTargetarr,
  rtTasksTpl,
  tasksAll,
  isNameExDag,
  setSvgColor,
  allNodesId,
  rtBantpl,
  computeScale,
};
