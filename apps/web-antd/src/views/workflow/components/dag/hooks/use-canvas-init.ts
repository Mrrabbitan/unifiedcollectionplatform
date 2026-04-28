import type { Edge, Node } from '@antv/x6';
import type { Ref } from 'vue';

import { ref } from 'vue';

import { Graph } from '@antv/x6';
import { Selection } from '@antv/x6-plugin-selection';

import {
  EDGE,
  EDGE_HOVER,
  NODE,
  NODE_HOVER,
  X6_EDGE_NAME,
  X6_NODE_NAME,
} from '../config';

interface Options {
  readonly: Ref<boolean>;
  graph: Ref<Graph | undefined>;
  paper: Ref<HTMLElement | undefined>;
  onNodeClick?: (node: Node) => void;
  onEdgeConnected?: (sourceId: string, targetId: string) => void;
  onDeleteSelected?: () => void;
}

export function useCanvasInit(options: Options) {
  const { graph, paper, onNodeClick, onEdgeConnected, onDeleteSelected } = options;

  const selectedCells = ref<Set<string>>(new Set());

  function registerCustomCells() {
    try {
      Graph.unregisterNode(X6_NODE_NAME);
    } catch {
      // ignore
    }
    try {
      Graph.unregisterEdge(X6_EDGE_NAME);
    } catch {
      // ignore
    }
    Graph.registerNode(X6_NODE_NAME, { ...NODE });
    Graph.registerEdge(X6_EDGE_NAME, { ...EDGE });
  }

  function graphInit(): Graph | null {
    if (!paper.value) {
      return null;
    }

    const g = new Graph({
      container: paper.value,
      autoResize: true,
      panning: true,
      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
      },
      grid: {
        size: 10,
        visible: true,
        type: 'dot',
        args: {
          color: '#E0E0E0',
          thickness: 1,
        },
      },
      connecting: {
        allowMulti: false,
        allowBlank: false,
        allowLoop: false,
        allowEdge: false,
        allowNode: true,
        allowPort: false,
        highlight: true,
        createEdge(): Edge | null {
          return g.createEdge({
            shape: X6_EDGE_NAME,
          }) as Edge;
        },
        validateConnection({ sourceCell, targetCell }) {
          if (sourceCell && targetCell && sourceCell.isNode() && targetCell.isNode()) {
            return sourceCell.id !== targetCell.id;
          }
          return false;
        },
      },
      highlighting: {
        nodeAvailable: {
          name: 'className',
          args: {
            className: 'available',
          },
        },
        magnetAvailable: {
          name: 'className',
          args: {
            className: 'available',
          },
        },
      },
    });

    g.use(
      new Selection({
        multiple: true,
        rubberband: true,
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
        movable: true,
      }),
    );

    return g;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      onDeleteSelected?.();
    }
  }

  function initGraph() {
    registerCustomCells();
    graph.value = graphInit() ?? undefined;

    if (!graph.value) return;

    document.addEventListener('keydown', handleKeyDown);

    graph.value.on('edge:connected', ({ isNew, edge }) => {
      if (isNew) {
        const sourceNode = edge.getSourceNode() as Node;
        const targetNode = edge.getTargetNode() as Node;
        if (sourceNode && targetNode) {
          edge.setSource(sourceNode);
          onEdgeConnected?.(sourceNode.id, targetNode.id);
        }
      }
    });

    graph.value.on('node:dblclick', ({ node }) => {
      onNodeClick?.(node);
    });

    graph.value.on('node:click', ({ node }) => {
      selectedCells.value.clear();
      selectedCells.value.add(node.id);
    });

    graph.value.on('edge:click', ({ edge }) => {
      selectedCells.value.clear();
      selectedCells.value.add(edge.id);
    });

    graph.value.on('blank:click', () => {
      selectedCells.value.clear();
    });

    graph.value.on('node:mouseenter', ({ node }) => {
      const nodeName = node.getData()?.taskName || node.id;
      node.addTools({
        name: 'button',
        args: {
          markup: [
            {
              tagName: 'text',
              textContent: nodeName,
              attrs: {
                fill: '#666',
                'font-size': 14,
                'text-anchor': 'center',
              },
            },
          ],
          x: 0,
          y: 0,
          offset: { x: 0, y: -20 },
        },
      });
    });

    graph.value.on('node:mouseleave', ({ node }) => {
      node.removeTool('button');
    });

    graph.value.on('cell:mouseenter', ({ cell }) => {
      if (!selectedCells.value.has(cell.id)) {
        if (cell.isNode()) {
          cell.setAttrs(NODE_HOVER.attrs);
        } else if (cell.isEdge()) {
          cell.setAttrs(EDGE_HOVER.attrs);
        }
      }
    });

    graph.value.on('cell:mouseleave', ({ cell }) => {
      if (!selectedCells.value.has(cell.id)) {
        if (cell.isNode()) {
          cell.setAttrs(NODE.attrs);
        } else if (cell.isEdge()) {
          cell.setAttrs(EDGE.attrs);
        }
      }
    });
  }

  function destroyGraph() {
    document.removeEventListener('keydown', handleKeyDown);
    selectedCells.value.clear();
    if (graph.value) {
      graph.value.dispose();
      graph.value = undefined;
    }
  }

  return {
    initGraph,
    destroyGraph,
    selectedCells,
  };
}
