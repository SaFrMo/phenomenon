/// <reference path="types.d.ts" />

const positionMap = ['x', 'y', 'z'];

/**
 * Class representing an instance.
 */
export default class {
  public gl: WebGLRenderingContext;
  public vertex: string;
  public fragment: string;
  public program: WebGLProgram;
  public uniforms: {
    [key: string]: UniformProps;
  };
  public geometry: GeometryProps;
  public attributes: Array<AttributeProps>;
  public attributeKeys: Array<string>;
  public multiplier: number;
  public modifiers: Array<Function>;
  public buffers: Array<BufferProps>;
  public uniformMap: object;
  public mode: number;
  public onRender?: Function;

  /**
   * Create an instance.
   */
  constructor(props: InstanceProps) {
    // Assign default parameters
    Object.assign(this, {
      uniforms: {},
      geometry: { vertices: [{ x: 0, y: 0, z: 0 }] },
      mode: 0,
      modifiers: {},
      attributes: [],
      multiplier: 1,
      buffers: [],
    });

    // Assign optional parameters
    Object.assign(this, props);

    // Prepare all required pieces
    this.prepareProgram();
    this.prepareUniforms();
    this.prepareAttributes();
  }

  /**
   * Compile a shader.
   */
  compileShader(type: number, source: string) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    return shader;
  }

  /**
   * Create a program.
   */
  prepareProgram() {
    const { gl, vertex, fragment } = this;

    // Create a new shader program
    const program = gl.createProgram();

    // Attach the vertex shader
    gl.attachShader(program, this.compileShader(35633, vertex));

    // Attach the fragment shader
    gl.attachShader(program, this.compileShader(35632, fragment));

    // Link the program
    gl.linkProgram(program);

    // Use the program
    gl.useProgram(program);

    // Assign it to the instance
    this.program = program;
  }

  /**
   * Create uniforms.
   */
  prepareUniforms() {
    const keys = Object.keys(this.uniforms);
    for (let i = 0; i < keys.length; i += 1) {
      const location = this.gl.getUniformLocation(this.program, keys[i]);
      this.uniforms[keys[i]].location = location;
    }
  }

  /**
   * Create buffer attributes.
   */
  prepareAttributes() {
    if (typeof this.geometry.vertices !== 'undefined') {
      this.attributes.push({
        name: 'aPosition',
        size: 3,
      });
    }
    if (typeof this.geometry.normal !== 'undefined') {
      this.attributes.push({
        name: 'aNormal',
        size: 3,
      });
    }
    this.attributeKeys = [];
    // Convert all attributes to be useable in the shader
    for (let i = 0; i < this.attributes.length; i += 1) {
      this.attributeKeys.push(this.attributes[i].name);
      this.prepareAttribute(this.attributes[i]);
    }
  }

  /**
   * Prepare a single attribute.
   */
  prepareAttribute(attribute: AttributeProps) {
    const { geometry, multiplier } = this;
    const { vertices, normal } = geometry;
    // Create an array for the attribute to store data
    const attributeBufferData = new Float32Array(multiplier * vertices.length * attribute.size);
    // Repeat the process for the provided multiplier
    for (let j = 0; j < multiplier; j += 1) {
      // Set data used as default or the attribute modifier
      const data = attribute.data && attribute.data(j, multiplier);
      // Calculate the offset for the right place in the array
      let offset = j * vertices.length * attribute.size;
      // Loop over vertices length
      for (let k = 0; k < vertices.length; k += 1) {
        // Loop over attribute size
        for (let l = 0; l < attribute.size; l += 1) {
          // Check if a modifier is provided
          const modifier = this.modifiers[attribute.name];
          if (typeof modifier !== 'undefined') {
            // Handle attribute modifier
            attributeBufferData[offset] = modifier(data, k, l, this);
          } else if (attribute.name === 'aPosition') {
            // Handle position values
            attributeBufferData[offset] = vertices[k][positionMap[l]];
          } else if (attribute.name === 'aNormal') {
            // Handle normal values
            attributeBufferData[offset] = normal[k][positionMap[l]];
          } else {
            // Handle other attributes
            attributeBufferData[offset] = data[l];
          }
          offset += 1;
        }
      }
    }
    this.attributes[this.attributeKeys.indexOf(attribute.name)].data = attributeBufferData;
    this.prepareBuffer(this.attributes[this.attributeKeys.indexOf(attribute.name)]);
  }

  /**
   * Create a buffer with an attribute.
   */
  prepareBuffer(attribute: AttributeProps) {
    const { data, name, size } = attribute;

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(34962, buffer);
    this.gl.bufferData(34962, data, 35044);

    const location = this.gl.getAttribLocation(this.program, name);
    this.gl.enableVertexAttribArray(location);
    this.gl.vertexAttribPointer(location, size, 5126, false, 0, 0);

    this.buffers[this.attributeKeys.indexOf(attribute.name)] = { buffer, location, size };
  }

  /**
   * Initialize a texture from an image URL.
   */
  initTexture(url: string) {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = this.gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = this.gl.RGBA;
    const srcType = this.gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel
    );

    const image = new Image();
    image.onload = () => {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
      } else {
        // No, it's not a power of 2. Turn off mips and set
        // wrapping to clamp to edge
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      }
    };
    image.crossOrigin = 'anonymous';
    image.src = url;
  }

  /*
   * Utility functions
   */
  isPowerOf2(value: number): boolean {
    return (value & (value - 1)) == 0;
  }

  /**
   * Render the instance.
   */
  render(renderUniforms: object) {
    const { uniforms, multiplier, gl } = this;

    // Use the program of the instance
    gl.useProgram(this.program);

    // Bind the buffers for the instance
    for (let i = 0; i < this.buffers.length; i += 1) {
      const { location, buffer, size } = this.buffers[i];
      gl.enableVertexAttribArray(location);
      gl.bindBuffer(34962, buffer);
      gl.vertexAttribPointer(location, size, 5126, false, 0, 0);
    }

    // Update the shared uniforms from the renderer
    Object.keys(renderUniforms).forEach(key => {
      uniforms[key].value = renderUniforms[key].value;
    });

    // Map the uniforms to the context
    Object.keys(uniforms).forEach(key => {
      const { type, location, value } = uniforms[key];
      this.uniformMap[type](location, value);
    });

    // Draw the magic to the screen
    gl.drawArrays(this.mode, 0, multiplier * this.geometry.vertices.length);

    // Hook for uniform updates
    if (this.onRender) this.onRender(this);
  }

  /**
   * Destroy the instance.
   */
  destroy() {
    for (let i = 0; i < this.buffers.length; i += 1) {
      this.gl.deleteBuffer(this.buffers[i].buffer);
    }
    this.gl.deleteProgram(this.program);
    this.gl = null;
  }
}
