/// <reference path="types.d.ts" />
import Instance from './instance';

/**
 * Class representing a Renderer. A Renderer can contain as many Instances
 * as needed.
 */
export default class {
  public clearColor: Array<GLclampf>;
  public onRender: Function;
  public onSetup: Function;
  public uniformMap: object;
  public gl: WebGLRenderingContext;
  public canvas: HTMLCanvasElement;
  public devicePixelRatio: number;
  public clip: Array<number>;
  public instances: Map<string, Instance>;
  public position: {
    x: number;
    y: number;
    z: number;
  };
  public uniforms: {
    [key: string]: UniformProps;
  };
  public shouldRender: boolean;

  /**
   * Create a renderer.
   */
  constructor(props: RendererProps) {
    const {
      canvas = document.querySelector('canvas'),
      context = {},
      contextType = 'experimental-webgl',
      settings = {},
    } = props || {};

    // Get context with optional parameters
    const gl = <WebGLRenderingContext>canvas.getContext(
      contextType,
      Object.assign(
        {
          alpha: false,
          antialias: false,
        },
        context
      )
    );

    // Assign program parameters
    Object.assign(this, {
      gl,
      canvas,
      uniforms: {},
      instances: new Map(),
      shouldRender: true,
    });

    // Assign default parameters
    Object.assign(this, {
      devicePixelRatio: 1,
      clearColor: [1, 1, 1, 1],
      position: { x: 0, y: 0, z: 2 },
      clip: [0.001, 100],
    });

    // Assign optional parameters
    Object.assign(this, settings);

    // Create uniform mapping object
    this.uniformMap = {
      float: (loc, val) => gl.uniform1f(loc, val),
      vec2: (loc, val) => gl.uniform2fv(loc, val),
      vec3: (loc, val) => gl.uniform3fv(loc, val),
      vec4: (loc, val) => gl.uniform4fv(loc, val),
      mat2: (loc, val) => gl.uniformMatrix2fv(loc, false, val),
      mat3: (loc, val) => gl.uniformMatrix3fv(loc, false, val),
      mat4: (loc, val) => gl.uniformMatrix4fv(loc, false, val),
    };

    // Enable depth
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Set clear values
    if (gl.getContextAttributes().alpha === false) {
      // @ts-ignore
      gl.clearColor(...this.clearColor);
      gl.clearDepth(1.0);
    }

    // Hook for gl context changes before first render
    if (this.onSetup) this.onSetup(gl);

    // Handle resize events
    window.addEventListener('resize', () => this.resize());

    // Start the renderer
    this.resize();
    this.render();
  }

  /**
   * Handle resize events.
   */
  resize() {
    const { gl, canvas, devicePixelRatio, position } = this;

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const bufferWidth = gl.drawingBufferWidth;
    const bufferHeight = gl.drawingBufferHeight;
    const ratio = bufferWidth / bufferHeight;

    gl.viewport(0, 0, bufferWidth, bufferHeight);

    const angle = Math.tan(45 * 0.5 * (Math.PI / 180));

    // prettier-ignore
    const projectionMatrix = [
      0.5 / angle, 0, 0, 0,
      0, 0.5 * (ratio / angle), 0, 0,
      0, 0, -(this.clip[1] + this.clip[0]) / (this.clip[1] - this.clip[0]), -1, 0, 0,
      -2 * this.clip[1] * (this.clip[0] / (this.clip[1] - this.clip[0])), 0,
    ];

    // prettier-ignore
    const viewMatrix = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];

    // prettier-ignore
    const modelMatrix = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      position.x, position.y, (ratio < 1 ? 1 : ratio) * -position.z, 1,
    ];

    this.uniforms.uProjectionMatrix = {
      type: 'mat4',
      value: projectionMatrix,
    };

    this.uniforms.uViewMatrix = {
      type: 'mat4',
      value: viewMatrix,
    };

    this.uniforms.uModelMatrix = {
      type: 'mat4',
      value: modelMatrix,
    };
  }

  /**
   * Toggle the active state of the renderer.
   */
  toggle(shouldRender: boolean) {
    if (shouldRender === this.shouldRender) return;
    this.shouldRender = typeof shouldRender !== 'undefined' ? shouldRender : !this.shouldRender;
    if (this.shouldRender) this.render();
  }

  /**
   * Render the total scene.
   */
  render() {
    this.gl.clear(16640);

    this.instances.forEach(instance => {
      instance.render(this.uniforms);
    });

    if (this.onRender) this.onRender(this);

    if (this.shouldRender) requestAnimationFrame(() => this.render());
  }

  /**
   * Add an instance to the renderer.
   */
  add(key: string, settings: InstanceProps) {
    if (typeof settings === 'undefined') {
      settings = { uniforms: {} };
    }

    if (typeof settings.uniforms === 'undefined') {
      settings.uniforms = {};
    }

    Object.assign(settings.uniforms, JSON.parse(JSON.stringify(this.uniforms)));

    Object.assign(settings, {
      gl: this.gl,
      uniformMap: this.uniformMap,
    });

    const instance = new Instance(settings);
    this.instances.set(key, instance);

    return instance;
  }

  /**
   * Remove an instance from the renderer.
   */
  remove(key: string) {
    const instance = this.instances.get(key);
    if (typeof instance === 'undefined') return;
    instance.destroy();
    this.instances.delete(key);
  }

  /**
   * Destroy the renderer and its instances.
   */
  destroy() {
    this.instances.forEach((instance, key) => {
      instance.destroy();
      this.instances.delete(key);
    });
    this.toggle(false);
  }
}
