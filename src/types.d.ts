interface AttributeProps {
  name: string;
  size: number;
  data?: any;
}

interface UniformProps {
  type: string;
  value: Array<number>;
  location?: WebGLUniformLocation;
}

interface GeometryProps {
  vertices?: Array<Array<object>>;
  normal?: Array<Array<object>>;
}

interface BufferProps {
  location: number;
  buffer: WebGLBuffer;
  size: number;
}

interface InstanceProps {
  attributes?: Array<AttributeProps>;
  vertex?: string;
  fragment?: string;
  geometry?: GeometryProps;
  mode?: number;
  modifiers?: object;
  multiplier?: number;
  uniforms: {
    [key: string]: UniformProps;
  };
}

interface RendererProps {
  canvas?: HTMLCanvasElement;
  context?: object;
  contextType?: string;
  settings?: object;
}
