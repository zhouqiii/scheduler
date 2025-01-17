/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import 'jquery-ui/ui/widgets/resizable';
import Vue from 'vue';
import _ from 'lodash';
import { jsPlumb } from 'jsplumb';
// import mStart from '@/conf/home/pages/projects/pages/definition/pages/list/_source/start';
import DragZoom from './dragZoom';
import store from '../../../store';
import router from '../../../router';
import { uuid, findComponentDownward } from '../../../utils/tree/index';

import {
  tasksAll,
  rtTasksTpl,
  setSvgColor,
  saveTargetarr,
  rtTargetarrArr,
  computeScale,
} from './util';

const JSP = function () {
  this.dag = {};
  this.selectedElement = {};

  this.config = {
    // Whether to drag
    isDrag: true,
    // Whether to allow connection
    isAttachment: false,
    // Whether to drag a new node
    isNewNodes: true,
    // Whether to support double-click node events
    isDblclick: true,
    // Whether to support right-click menu events
    isContextmenu: true,
    // Whether to allow click events
    isClick: false,
  };
};
/**
 * dag init
 */
JSP.prototype.init = function ({ dag, instance, options }) {
  // Get the dag component instance
  this.dag = dag;
  // Get jsplumb instance
  this.JspInstance = instance;
  // Get JSP options
  this.options = options || {};
  // Register jsplumb connection type and configuration
  this.JspInstance.registerConnectionType('basic', {
    anchor: 'Continuous',
    connector: 'Bezier', // Line type
  });

  // Initial configuration
  this.setConfig({
    isDrag: !store.state.dag.isDetails,
    isAttachment: false,
    isNewNodes: !store.state.dag.isDetails,
    isDblclick: true,
    isContextmenu: true,
    isClick: false,
  });

  // Monitor line click
  this.JspInstance.bind('click', (e) => {
    if (this.config.isClick) {
      this.connectClick(e);
    }
  });

  // Drag and drop
  if (this.config.isNewNodes) {
    DragZoom.init();
  }
};

/**
 * set config attribute
 */
JSP.prototype.setConfig = function (o) {
  this.config = Object.assign(this.config, {}, o);
};

/**
 * Node binding event
 */
JSP.prototype.tasksEvent = function (selfId) {
  const tasks = $(`#${selfId}`);
  // Bind right event
  tasks.on('contextmenu', (e) => {
    this.tasksContextmenu(e);
    return false;
  });

  // Binding double click event
  tasks.find('.icos').bind('dblclick', (e) => {
    this.tasksDblclick(e);
  });

  // Binding click event
  tasks.on('click', (e) => {
    this.tasksClick(e);
  });
};

/**
 * Dag node drag and drop processing
 */
JSP.prototype.draggable = function () {
  if (this.config.isNewNodes) {
    let selfId;
    const self = this;
    $('.toolbar-btn .roundedRect').draggable({
      scope: 'plant',
      helper: 'clone',
      containment: $('.dag-model'),
      // eslint-disable-next-line no-unused-vars
      stop(e, ui) {
      },
      drag() {
        $('body').find('.tooltip.fade.top.in').remove();
      },
    });

    $('#canvas').droppable({
      scope: 'plant',
      drop(ev, ui) {
        let id = 'tasks-' + Math.ceil(Math.random() * 100000) // eslint-disable-line
        let scale = computeScale($(this));
        scale = scale || 1;
        // Get mouse coordinates and after scale coordinate
        const left = parseInt(ui.offset.left - $(this).offset().left, 10) / scale;
        const top = parseInt(ui.offset.top - $(this).offset().top, 10) / scale;
        // Generate template node
        $('#canvas').append(rtTasksTpl({
          id,
          name: id,
          x: left,
          y: top,
          isAttachment: self.config.isAttachment,
          taskType: findComponentDownward(self.dag.$root, 'dag-chart').dagBarId,
        }));
        // Get the generated node
        const thisDom = jsPlumb.getSelector('.statemachine-demo .w');
        // Generating a connection node
        self.JspInstance.batch(() => {
          self.initNode(thisDom[thisDom.length - 1]);
        });
        selfId = id;
        self.tasksEvent(selfId);
        // Dom structure is not generated without pop-up form form
        if ($(`#${selfId}`).html()) {
          // dag event
          findComponentDownward(self.dag.$root, 'dag-chart').createNodes({
            id: selfId,
          });
        }
      },
    });
  }
};

/**
 * Echo json processing and old data structure processing
 */
JSP.prototype.jsonHandle = function ({ largeJson, locations }) {
  _.map(largeJson, (v) => {
    // Generate template
    $('#canvas').append(rtTasksTpl({
      id: v.id,
      name: v.name,
      x: locations[v.id].x,
      y: locations[v.id].y,
      targetarr: locations[v.id].targetarr,
      isAttachment: this.config.isAttachment,
      taskType: v.type,
      runFlag: v.runFlag,
      nodenumber: locations[v.id].nodenumber,
      successNode: v.conditionResult === undefined ? '' : v.conditionResult.successNode[0],
      failedNode: v.conditionResult === undefined ? '' : v.conditionResult.failedNode[0],
    }));

    // contextmenu event
    $(`#${v.id}`).on('contextmenu', (e) => {
      this.tasksContextmenu(e);
      return false;
    });

    // dblclick event
    $(`#${v.id}`).find('.icos').bind('dblclick', (e) => {
      this.tasksDblclick(e);
    });

    // click event
    $(`#${v.id}`).bind('click', (e) => {
      this.tasksClick(e);
    });
  });
};

/**
 * Initialize a single node
 */
JSP.prototype.initNode = function (el) {
  // Whether to drag
  if (this.config.isDrag) {
    this.JspInstance.draggable(el, {
      containment: 'dag-container',
    });
  }

  // Node attribute configuration
  this.JspInstance.makeSource(el, {
    filter: '.ep',
    anchor: 'Continuous',
    connectorStyle: {
      stroke: '#2d8cf0',
      strokeWidth: 2,
      outlineStroke: 'transparent',
      outlineWidth: 4,
    },
    // This place is leaking
    // connectionType: "basic",
    extract: {
      action: 'the-action',
    },
    maxConnections: -1,
  });

  // Node connection property configuration
  this.JspInstance.makeTarget(el, {
    dropOptions: { hoverClass: 'dragHover' },
    anchor: 'Continuous',
    allowLoopback: false, // Forbid yourself to connect yourself
  });
  this.JspInstance.fire('jsPlumbDemoNodeAdded', el);
};

/**
 * Node right click menu
 */
JSP.prototype.tasksContextmenu = function (event) {
  if (this.config.isContextmenu) {
    const routerName = router.history.current.name;
    // state
    const isOne = routerName === 'projects-definition-details' && this.dag.releaseState !== 'NOT_RELEASE';
    // hide
    const isTwo = store.state.dag.isDetails;

    const html = [
      `<a href="javascript:" id="startRunning" class="${isOne ? '' : 'disbled'}"><em class="ans-icon-play"></em><span>Start</span></a>`,
      `<a href="javascript:" id="editNodes" class="${isTwo ? 'disbled' : ''}"><em class="ans-icon-edit"></em><span>Edit</span></a>`,
      `<a href="javascript:" id="copyNodes" class="${isTwo ? 'disbled' : ''}"><em class="ans-icon-copy"></em><span>Copy</span></a>`,
      `<a href="javascript:" id="removeNodes" class="${isTwo ? 'disbled' : ''}"><em class="ans-icon-trash"></em><span>Delete</span></a>`,
    ];

    const operationHtml = () => html.splice(',');

    const e = event;
    const $id = e.currentTarget.id;
    const $contextmenu = $('#contextmenu');
    const $name = $(`#${$id}`).find('.name-p').text();
    const $left = e.pageX + document.body.scrollLeft - 5;
    const $top = e.pageY + document.body.scrollTop - 5;
    $contextmenu.css({
      left: $left,
      top: $top,
      visibility: 'visible',
    });
    // Action bar
    $contextmenu.html('').append(operationHtml);

    if (isOne) {
      // start run
      $('#startRunning').on('click', () => {
        const { name } = store.state.dag;
        const { id } = router.history.current.params;
        store.dispatch('dag/getStartCheck', { processDefinitionId: id }).then(() => {
          findComponentDownward(this.dag.$root, 'dag-chart').setRunParam({
            item: {
              id,
              name,
            },
            startTaskName: $name,
          });
        }).catch((err) => {
          Vue.$message.error(err.msg || '');
        });
      });
    }
    if (!isTwo) {
      // edit node
      $('#editNodes').click(() => {
        findComponentDownward(this.dag.$root, 'dag-chart').createNodes({
          id: $id,
          type: $(`#${$id}`).attr('data-tasks-type'),
        });
      });
      // delete node
      $('#removeNodes').click(() => {
        this.removeNodes($id);
      });

      // copy node
      $('#copyNodes').click(() => {
        this.copyNodes($id);
      });
    }
  }
};

/**
 * Node double click event
 */
JSP.prototype.tasksDblclick = function (e) {
  // Untie event
  if (this.config.isDblclick) {
    const id = $(e.currentTarget.offsetParent).attr('id');

    findComponentDownward(this.dag.$root, 'dag-chart').createNodes({
      id,
      type: $(`#${id}`).attr('data-tasks-type'),
    });
  }
};

/**
 * Node click event
 */
JSP.prototype.tasksClick = function (e) {
  let $id;
  const self = this;
  const $body = $('body');
  if (this.config.isClick) {
    const $connect = this.selectedElement.connect;
    $('.w').removeClass('jtk-tasks-active');
    $(e.currentTarget).addClass('jtk-tasks-active');
    if ($connect) {
      setSvgColor($connect, '#2d8cf0');
      this.selectedElement.connect = null;
    }
    this.selectedElement.id = $(e.currentTarget).attr('id');

    // Unbind copy and paste events
    $body.unbind('copy').unbind('paste');
    // Copy binding id
    $id = self.selectedElement.id;

    $body.bind({
      copy() {
        $id = self.selectedElement.id;
      },
      paste() {
        // eslint-disable-next-line no-unused-expressions
        $id && self.copyNodes($id);
      },
    });
  }
};

/**
 * Remove binding events
 * paste
 */
JSP.prototype.removePaste = function () {
  const $body = $('body');
  // Unbind copy and paste events
  $body.unbind('copy').unbind('paste');
  // Remove selected node parameters
  this.selectedElement.id = null;
  // Remove node selection effect
  $('.w').removeClass('jtk-tasks-active');
};

/**
 * Line click event
 */
JSP.prototype.connectClick = function (e) {
  // Set svg color
  setSvgColor(e, '#0097e0');
  const $id = this.selectedElement.id;
  if ($id) {
    $(`#${$id}`).removeClass('jtk-tasks-active');
    this.selectedElement.id = null;
  }
  this.selectedElement.connect = e;
};

/**
 * toolbarEvent
 * @param {Pointer}
 */
JSP.prototype.handleEventPointer = function (is) {
  this.setConfig({
    isClick: is,
    isAttachment: false,
  });
};

/**
 * toolbarEvent
 * @param {Line}
 */
JSP.prototype.handleEventLine = function (is) {
  const wDom = $('.w');
  this.setConfig({
    isAttachment: is,
  });
  // eslint-disable-next-line no-unused-expressions
  is ? wDom.addClass('jtk-ep') : wDom.removeClass('jtk-ep');
};

/**
 * toolbarEvent
 * @param {Remove}
 */
JSP.prototype.handleEventRemove = function () {
  const $id = this.selectedElement.id || null;
  const $connect = this.selectedElement.connect || null;
  if ($id) {
    this.removeNodes(this.selectedElement.id);
  } else {
    this.removeConnect($connect);
  }

  // Monitor whether to edit DAG
  store.commit('dag/setIsEditDag', true);
};

/**
 * Delete node
 */
JSP.prototype.removeNodes = function ($id) {
  // Delete node processing(data-targetarr)
  _.map(tasksAll(), (v) => {
    const targetarr = v.targetarr.split(',');
    if (targetarr.length) {
      const newArr = _.filter(targetarr, (v1) => v1 !== $id);
      $(`#${v.id}`).attr('data-targetarr', newArr.toString());
    }
  });
  // delete node
  this.JspInstance.remove($id);

  // delete dom
  $(`#${$id}`).remove();

  // callback onRemoveNodes event
  // eslint-disable-next-line no-unused-expressions
  this.options && this.options.onRemoveNodes && this.options.onRemoveNodes($id);
  const connects = [];
  _.map(this.JspInstance.getConnections(), (v) => {
    connects.push({
      endPointSourceId: v.sourceId,
      endPointTargetId: v.targetId,
    });
  });
  // Storage line dependence
  store.commit('dag/setConnects', connects);
};

/**
 * Delete connection
 */
JSP.prototype.removeConnect = function ($connect) {
  if (!$connect) {
    return;
  }
  // Remove connections and remove node and node dependencies
  const { targetId } = $connect;
  const { sourceId } = $connect;
  let targetarr = rtTargetarrArr(targetId);
  if (targetarr.length) {
    targetarr = _.filter(targetarr, (v) => v !== sourceId);
    $(`#${targetId}`).attr('data-targetarr', targetarr.toString());
  }
  if ($(`#${sourceId}`).attr('data-tasks-type') === 'CONDITIONS') {
    $(`#${sourceId}`).attr('data-nodenumber', Number($(`#${sourceId}`).attr('data-nodenumber')) - 1);
  }
  this.JspInstance.deleteConnection($connect);

  this.selectedElement = {};
};

/**
 * Copy node
 */
JSP.prototype.copyNodes = function ($id) {
  let newNodeInfo = _.cloneDeep(_.find(store.state.dag.tasks, (v) => v.id === $id));
  const newNodePors = store.state.dag.locations[$id];
  // Unstored nodes do not allow replication
  if (!newNodePors) {
    return;
  }
  // Generate random id
  const newUuId = `${uuid() + uuid()}`;
  const id = newNodeInfo.id.length > 8 ? newNodeInfo.id.substr(0, 7) : newNodeInfo.id;
  const name = newNodeInfo.name.length > 8 ? newNodeInfo.name.substr(0, 7) : newNodeInfo.name;

  // new id
  const newId = `${id || ''}-${newUuId}`;
  // new name
  const newName = `${name || ''}-${newUuId}`;
  // coordinate x
  const newX = newNodePors.x + 100;
  // coordinate y
  const newY = newNodePors.y + 40;

  // Generate template node
  $('#canvas').append(rtTasksTpl({
    id: newId,
    name: newName,
    x: newX,
    y: newY,
    isAttachment: this.config.isAttachment,
    taskType: newNodeInfo.type,
  }));

  // Get the generated node
  const thisDom = jsPlumb.getSelector('.statemachine-demo .w');

  // Copy node information
  newNodeInfo = Object.assign(newNodeInfo, {
    id: newId,
    name: newName,
  });

  // Add new node
  store.commit('dag/addTasks', newNodeInfo);
  // Add node location information
  store.commit('dag/addLocations', {
    [newId]: {
      name: newName,
      targetarr: '',
      nodenumber: 0,
      x: newX,
      y: newY,
    },
  });

  // Generating a connection node
  this.JspInstance.batch(() => {
    this.initNode(thisDom[thisDom.length - 1]);
    // Add events to nodes
    this.tasksEvent(newId);
  });
};
/**
 * toolbarEvent
 * @param {Screen}
 */
JSP.prototype.handleEventScreen = function ({ item, is }) {
  let screenOpen = true;
  if (is) {
    item.icon = 'ans-icon-min';
    screenOpen = true;
  } else {
    item.icon = 'ans-icon-max';
    screenOpen = false;
  }
  const $mainLayoutModel = $('.main-layout-model');
  if (screenOpen) {
    $mainLayoutModel.addClass('dag-screen');
  } else {
    $mainLayoutModel.removeClass('dag-screen');
  }
};
/**
 * save task
 * @param tasks
 * @param locations
 * @param connects
 */
JSP.prototype.saveStore = function () {
  return new Promise((resolve) => {
    const connects = [];
    const locations = {};
    const tasks = [];

    const is = (id) => !!_.filter(tasksAll(), (v) => v.id === id).length;

    // task
    _.map(_.cloneDeep(store.state.dag.tasks), (v) => {
      if (is(v.id)) {
        const preTasks = [];
        const id = $(`#${v.id}`);
        const tar = id.attr('data-targetarr');
        const idDep = tar ? id.attr('data-targetarr').split(',') : [];
        if (idDep.length) {
          _.map(idDep, (v1) => {
            preTasks.push($(`#${v1}`).find('.name-p').text());
          });
        }

        let tasksParam = _.assign(v, {
          preTasks,
        });

        // Sub-workflow has no retries and interval
        if (v.type === 'SUB_PROCESS') {
          tasksParam = _.omit(tasksParam, ['maxRetryTimes', 'retryInterval']);
        }

        tasks.push(tasksParam);
      }
    });

    _.map(this.JspInstance.getConnections(), (v) => {
      connects.push({
        endPointSourceId: v.sourceId,
        endPointTargetId: v.targetId,
      });
    });
    _.map(tasksAll(), (v) => {
      locations[v.id] = {
        name: v.name,
        targetarr: v.targetarr,
        nodenumber: v.nodenumber,
        x: v.x,
        y: v.y,
      };
    });
    let targetArrBool = false;
    _.forEach(locations, (item) => {
      if (item.targetarr) {
        targetArrBool = true;
        return false;
      }
      return true;
    });
    if (connects.length && !targetArrBool) {
      Vue.$message.warning('The workflow canvas is abnormal and cannot be saved, please recreate');
      return false;
    }

    // Storage node
    store.commit('dag/setTasks', tasks);
    // Store coordinate information
    store.commit('dag/setLocations', locations);
    // Storage line dependence
    store.commit('dag/setConnects', connects);

    resolve({
      connects,
      tasks,
      locations,
    });
    return true;
  });
};
/**
 * Event processing
 */

JSP.prototype.handleEvent = function () {
  this.JspInstance.bind('beforeDrop', (info) => {
    console.log(info);
    const rtTargetArr = (id) => {
      const ids = $(`#${id}`).attr('data-targetarr');
      return ids ? ids.split(',') : [];
    };
    const { sourceId } = info;// 出
    const { targetId } = info;// 入
    console.log(sourceId, targetId);
    const rtTargetArrs = rtTargetArr(targetId);
    const rtSouceArrs = rtTargetArr(sourceId);
    /**
     * Recursive search for nodes
     */
    let recursiveVal;
    // eslint-disable-next-line no-shadow
    const recursiveTargetarr = (arr, targetId) => {
      for (const i in arr) {
        if (arr[i] === targetId) {
          recursiveVal = targetId;
        } else {
          const targetArr = rtTargetArr(arr[i]);
          recursiveTargetarr(targetArr, targetId);
        }
      }
      return recursiveVal;
    };

    // Connection to connected nodes is not allowed
    if (_.findIndex(rtTargetArrs, (v) => v === sourceId) !== -1) {
      console.log(rtTargetArrs, 'not allowed');
      return false;
    }

    // Recursive form to find if the target Targetarr has a sourceId
    if (recursiveTargetarr(rtSouceArrs, targetId)) {
      console.log('has a sourceId');
      return false;
    }
    if ($(`#${sourceId}`).attr('data-tasks-type') === 'CONDITIONS' && parseInt($(`#${sourceId}`).attr('data-nodenumber'), 10) === 2) {
      return false;
    }
    console.log('data-nodenumber');
    $(`#${sourceId}`).attr('data-nodenumber', parseInt($(`#${sourceId}`).attr('data-nodenumber'), 10) + 1);

    // Storage node dependency information
    saveTargetarr(sourceId, targetId);

    // Monitor whether to edit DAG
    store.commit('dag/setIsEditDag', true);

    return true;
  });
};
/**
 * Backfill data processing
 */
JSP.prototype.jspBackfill = function ({ connects, locations, largeJson }) {
  // Backfill nodes
  this.jsonHandle({
    largeJson,
    locations,
  });

  const wNodes = jsPlumb.getSelector('.statemachine-demo .w');

  // Backfill line
  this.JspInstance.batch(() => {
    for (let i = 0; i < wNodes.length; i++) {
      this.initNode(wNodes[i]);
    }
    _.map(connects, (v) => {
      let sourceId = v.endPointSourceId.split('-');
      let targetId = v.endPointTargetId.split('-');
      if (sourceId.length === 4 && targetId.length === 4) {
        sourceId = `${sourceId[0]}-${sourceId[1]}-${sourceId[2]}`;
        targetId = `${targetId[0]}-${targetId[1]}-${targetId[2]}`;
      } else {
        sourceId = v.endPointSourceId;
        targetId = v.endPointTargetId;
      }

      if ($(`#${sourceId}`).attr('data-tasks-type') === 'CONDITIONS' && $(`#${sourceId}`).attr('data-successnode') === $(`#${targetId}`).find('.name-p').text()) {
        this.JspInstance.connect({
          source: sourceId,
          target: targetId,
          type: 'basic',
          paintStyle: { strokeWidth: 2, stroke: '#4caf50' },
          HoverPaintStyle: { stroke: '#ccc', strokeWidth: 3 },
          overlays: [['Label', { label: 'success', location: 0.5, id: 'label' }]],
        });
      } else if ($(`#${sourceId}`).attr('data-tasks-type') === 'CONDITIONS' && $(`#${sourceId}`).attr('data-failednode') === $(`#${targetId}`).find('.name-p').text()) {
        this.JspInstance.connect({
          source: sourceId,
          target: targetId,
          type: 'basic',
          paintStyle: { strokeWidth: 2, stroke: '#252d39' },
          HoverPaintStyle: { stroke: '#ccc', strokeWidth: 3 },
          overlays: [['Label', { label: 'failed', location: 0.5, id: 'label' }]],
        });
      } else {
        this.JspInstance.connect({
          source: sourceId,
          target: targetId,
          type: 'basic',
          paintStyle: { strokeWidth: 2, stroke: '#2d8cf0' },
          HoverPaintStyle: { stroke: '#ccc', strokeWidth: 3 },
        });
      }
    });
  });

  jsPlumb.fire('jsPlumbDemoLoaded', this.JspInstance);

  // Connection monitoring
  this.handleEvent();

  // Drag and drop new nodes
  this.draggable();
};

export default new JSP();
