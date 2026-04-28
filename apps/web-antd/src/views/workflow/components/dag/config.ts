export const X6_NODE_NAME = 'dag-task';
export const X6_EDGE_NAME = 'dag-edge';
export const X6_PORT_OUT_NAME = 'dag-port-out';

const EDGE_COLOR = '#A2B1C3';
const BG_BLUE = '#E6F4FF';
const BG_WHITE = '#FFFFFF';
const NODE_BORDER = '#D9D9D9';
const TITLE = '#333333';
const STROKE_BLUE = '#1890FF';
const NODE_SHADOW = 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.15))';

export const PORT = {
  groups: {
    [X6_PORT_OUT_NAME]: {
      position: {
        name: 'absolute',
        args: {
          x: 200,
          y: 24,
        },
      },
      markup: [
        {
          tagName: 'g',
          selector: 'body',
          children: [
            {
              tagName: 'circle',
              selector: 'circle-outer',
            },
            {
              tagName: 'text',
              selector: 'plus-text',
            },
            {
              tagName: 'circle',
              selector: 'circle-inner',
            },
          ],
        },
      ],
      attrs: {
        body: {
          magnet: true,
        },
        'plus-text': {
          fontSize: 12,
          fill: NODE_BORDER,
          text: '+',
          textAnchor: 'middle',
          x: 0,
          y: 3,
        },
        'circle-outer': {
          stroke: NODE_BORDER,
          strokeWidth: 2,
          r: 6,
          fill: BG_WHITE,
        },
        'circle-inner': {
          r: 4,
          fill: 'transparent',
        },
      },
    },
  },
};

export const PORT_HOVER = {
  groups: {
    [X6_PORT_OUT_NAME]: {
      attrs: {
        'circle-outer': {
          stroke: STROKE_BLUE,
          fill: BG_BLUE,
          r: 8,
        },
        'circle-inner': {
          fill: STROKE_BLUE,
          r: 6,
        },
      },
    },
  },
};

export const PORT_SELECTED = {
  groups: {
    [X6_PORT_OUT_NAME]: {
      attrs: {
        'plus-text': {
          fill: STROKE_BLUE,
        },
        'circle-outer': {
          stroke: STROKE_BLUE,
          fill: BG_WHITE,
        },
      },
    },
  },
};

export const NODE = {
  width: 220,
  height: 48,
  markup: [
    {
      tagName: 'rect',
      selector: 'body',
      className: 'dag-task-body',
    },
    {
      tagName: 'text',
      selector: 'title',
    },
  ],
  attrs: {
    body: {
      refWidth: '100%',
      refHeight: '100%',
      rx: 6,
      ry: 6,
      pointerEvents: 'visiblePainted',
      fill: BG_WHITE,
      stroke: NODE_BORDER,
      strokeWidth: 1,
      strokeDasharray: 'none',
      filter: 'none',
    },
    title: {
      refX: 20,
      refY: 18,
      fontFamily: 'Microsoft Yahei, sans-serif',
      fontSize: 14,
      fontWeight: '500',
      fill: TITLE,
      strokeWidth: 0,
    },
  },
  ports: {
    ...PORT,
    items: [
      {
        id: X6_PORT_OUT_NAME,
        group: X6_PORT_OUT_NAME,
      },
    ],
  },
};

export const NODE_HOVER = {
  attrs: {
    body: {
      fill: BG_BLUE,
      stroke: STROKE_BLUE,
      strokeDasharray: '5,2',
    },
    title: {
      fill: STROKE_BLUE,
    },
  },
};

export const NODE_SELECTED = {
  attrs: {
    body: {
      filter: NODE_SHADOW,
      fill: BG_WHITE,
      stroke: STROKE_BLUE,
      strokeDasharray: '5,2',
      strokeWidth: 1.5,
    },
    title: {
      fill: STROKE_BLUE,
    },
  },
};

export const EDGE = {
  attrs: {
    line: {
      stroke: EDGE_COLOR,
      strokeWidth: 1.5,
      targetMarker: {
        tagName: 'path',
        fill: EDGE_COLOR,
        strokeWidth: 0,
        d: 'M 7 -5 0 0 7 5 Z',
      },
      filter: 'none',
    },
  },
  connector: {
    name: 'rounded',
  },
  router: {
    name: 'er',
    args: {
      offset: 12,
    },
  },
};

export const EDGE_HOVER = {
  attrs: {
    line: {
      stroke: STROKE_BLUE,
      targetMarker: {
        fill: STROKE_BLUE,
      },
    },
  },
};

export const EDGE_SELECTED = {
  attrs: {
    line: {
      stroke: STROKE_BLUE,
      targetMarker: {
        fill: STROKE_BLUE,
      },
      strokeWidth: 2,
      filter: NODE_SHADOW,
    },
  },
};

export const TASK_COLORS: Record<string, string> = {
  SHELL: '#52C41A',
  SQL: '#1890FF',
  SPARK: '#FA8C16',
  FLINK: '#722ED1',
  PYTHON: '#13C2C2',
  HTTP: '#EB2F96',
  DATAX: '#2F54EB',
  SQOOP: '#FAAD14',
  CONDITIONS: '#F5222D',
  SUB_PROCESS: '#1890FF',
  DEPENDENT: '#52C41A',
  KAFKA: '#FA8C16',
  WATERDROP: '#13C2C2',
  REMOTESHELL: '#FA541C',
};
