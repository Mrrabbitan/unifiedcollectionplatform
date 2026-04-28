import type { Graph } from '@antv/x6';
import type { Ref } from 'vue';

import { ref } from 'vue';

import type { Coordinate, Dragged, TaskType } from '../types';

interface Options {
  readonly: Ref<boolean>;
  graph: Ref<Graph | undefined>;
  appendTask: (code: number, type: TaskType, coor: Coordinate) => void;
  generateTaskCode?: () => Promise<number>;
}

export function useDagDragAndDrop(options: Options) {
  const { readonly, graph, appendTask, generateTaskCode } = options;

  const dragged = ref<Dragged>({
    x: 0,
    y: 0,
    type: 'SHELL',
  });

  let taskCodeCounter = Date.now();

  function generateLocalTaskCode(): number {
    taskCodeCounter += 1;
    return taskCodeCounter;
  }

  function onDragStart(e: DragEvent, type: TaskType) {
    if (readonly.value) {
      e.preventDefault();
      return;
    }
    dragged.value = {
      x: e.offsetX,
      y: e.offsetY,
      type: type,
    };
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', type);
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  async function onDrop(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (readonly.value || !graph.value) {
      return;
    }
    const { type, x: eX, y: eY } = dragged.value;
    const { x, y } = graph.value.clientToLocal(e.clientX, e.clientY);
    
    let code: number;
    if (generateTaskCode) {
      code = await generateTaskCode();
    } else {
      code = generateLocalTaskCode();
    }
    
    appendTask(code, type, { x: x - eX, y: y - eY });
  }

  function preventDefault(e: DragEvent) {
    e.preventDefault();
  }

  return {
    onDragStart,
    onDrop,
    onDragenter: preventDefault,
    onDragover: preventDefault,
    onDragleave: preventDefault,
  };
}
