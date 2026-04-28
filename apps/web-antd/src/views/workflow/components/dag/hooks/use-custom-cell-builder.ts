import type { Edge, Node } from '@antv/x6';

import { X6_EDGE_NAME, X6_NODE_NAME, TASK_COLORS } from '../config';
import type { Coordinate, TaskType, WorkflowData } from '../types';

export function useCustomCellBuilder() {
  function parseLocationStr(locationStr: string) {
    if (!locationStr) return null;
    try {
      const locations = JSON.parse(locationStr);
      return Array.isArray(locations) ? locations : null;
    } catch {
      return null;
    }
  }

  function buildEdge(
    sourceId: string,
    targetId: string,
    label = '',
  ): Edge.Metadata {
    return {
      shape: X6_EDGE_NAME,
      source: {
        cell: sourceId,
      },
      target: {
        cell: targetId,
      },
      labels: label ? [label] : undefined,
    };
  }

  function buildNode(
    id: string,
    type: TaskType,
    taskName: string,
    coordinate: Coordinate = { x: 100, y: 100 },
  ): Node.Metadata {
    const truncation = taskName && taskName.length > 15
      ? taskName.substring(0, 15) + '...'
      : taskName || id;
    const color = TASK_COLORS[type] || '#1890FF';

    return {
      id: id,
      shape: X6_NODE_NAME,
      x: coordinate.x,
      y: coordinate.y,
      data: {
        taskType: type,
        taskName: taskName || id,
      },
      attrs: {
        body: {
          fill: '#ffffff',
          stroke: color,
        },
        title: {
          text: truncation,
          fill: '#333333',
        },
      },
    };
  }

  function buildGraph(definition: WorkflowData) {
    const nodes: Node.Metadata[] = [];
    const edges: Edge.Metadata[] = [];

    const locations = parseLocationStr(definition.workflowDefinition?.locations) || [];
    const tasks = definition.taskDefinitionList || [];
    const connects = definition.workflowTaskRelationList || [];

    tasks.forEach((task) => {
      const location = locations.find((l: any) => l.taskCode === task.code) || {};
      const node = buildNode(
        String(task.code),
        task.taskType,
        task.name,
        {
          x: location.x || 100,
          y: location.y || 100,
        },
      );
      nodes.push(node);
    });

    connects
      .filter((r) => !!r.preTaskCode)
      .forEach((c) => {
        const edge = buildEdge(
          String(c.preTaskCode),
          String(c.postTaskCode),
          c.name,
        );
        edges.push(edge);
      });

    return {
      nodes,
      edges,
    };
  }

  return {
    buildNode,
    buildEdge,
    buildGraph,
  };
}
