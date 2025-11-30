"use strict";

let gl;
let program;
let spaceball;

let surface;            // Model
let normalBuffer;       // normals VBO
let tangentBuffer;      // tangents VBO
let texCoordBuffer;     // texcoords VBO

let uSlider, vSlider, uValSpan, vValSpan;

// textures
let diffuseTex, specularTex, normalTex;


/* --------------------------- DRAW FUNCTION ------------------------------ */
function draw() {

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // --- матриці як у PA2 ---
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    let modelView = spaceball.getViewMatrix();
    let rotateToPointZero    = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0); // ModelView
    let MVP       = m4.multiply(projection, matAccum1);           // MVP

    gl.uniformMatrix4fv(program.uModelView, false, matAccum1);
    gl.uniformMatrix4fv(program.uMVP,       false, MVP);

    // ---- світло крутиться (як у PA2) ----
    let t = performance.now() * 0.001;
    let lightPos = [4 * Math.cos(t), 4 * Math.sin(t), 2];
    gl.uniform3fv(program.uLightPos, lightPos);

    // ---- textures bind ----
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTex);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTex);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTex);

    // ---- normals ----
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(program.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.aNormal);

    // ---- tangents ----
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.vertexAttribPointer(program.aTangent, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.aTangent);

    // ---- texcoords ----
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(program.aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.aTexCoord);

    // ---- draw surface (vertex+index VBO inside Model) ----
    surface.Draw();
}


/* --------------------------- REBUILD SURFACE ------------------------------ */
function rebuildSurface() {

    // "сирі" значення 5..100
    let uRaw = parseInt(uSlider.value);
    let vRaw = parseInt(vSlider.value);

    // нелінійне перетворення:
    // 5 -> ~10-12, 100 -> ~110
    let U = Math.round(10 + (uRaw * uRaw) / 100);
    let V = Math.round(10 + (vRaw * vRaw) / 100);

    uValSpan.textContent = U;
    vValSpan.textContent = V;

    let data = {};
    CreateVirichSurfaceData(U, V, data);

    if (!surface) {
        surface = new Model("VirichSurface");
    }

    surface.BufferData(data.verticesF32, data.indicesU16);

    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.normalsF32, gl.STATIC_DRAW);

    tangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.tangentsF32, gl.STATIC_DRAW);

    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.texcoordsF32, gl.STATIC_DRAW);

    draw();
}



/* ----------------------------- INIT GL ----------------------------------- */
function initGL(canvas) {

    gl = canvas.getContext("webgl");
    if (!gl) {
        alert("Browser does not support WebGL");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    // attributes
    program.aVertex   = gl.getAttribLocation(program, "vertex");
    program.aNormal   = gl.getAttribLocation(program, "normal");
    program.aTangent  = gl.getAttribLocation(program, "tangent");
    program.aTexCoord = gl.getAttribLocation(program, "texCoord");

    // uniforms
    program.uMVP       = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    program.uModelView = gl.getUniformLocation(program, "ModelViewMatrix");
    program.uLightPos  = gl.getUniformLocation(program, "lightPos");

    program.uDiffuseSampler  = gl.getUniformLocation(program, "uDiffuseSampler");
    program.uSpecularSampler = gl.getUniformLocation(program, "uSpecularSampler");
    program.uNormalSampler   = gl.getUniformLocation(program, "uNormalSampler");

    gl.uniform1i(program.uDiffuseSampler,  0);
    gl.uniform1i(program.uSpecularSampler, 1);
    gl.uniform1i(program.uNormalSampler,   2);

    gl.enable(gl.DEPTH_TEST);
}


/* ------------------------- TEXTURE LOADER -------------------------------- */
function isPowerOf2(v) {
    return (v & (v - 1)) === 0;
}

function loadTexture(url) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // 1x1 stub
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([128, 128, 128, 255])
    );

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        draw();
    };

    img.src = url;
    return tex;
}


/* ------------------------------- INIT ------------------------------------ */
function init() {

    const canvas = document.getElementById("webglcanvas");

    initGL(canvas);

    spaceball = new TrackballRotator(canvas, draw, 0);

    uSlider  = document.getElementById("uSlider");
    vSlider  = document.getElementById("vSlider");
    uValSpan = document.getElementById("uVal");
    vValSpan = document.getElementById("vVal");

    uSlider.oninput = rebuildSurface;
    vSlider.oninput = rebuildSurface;

    // textures
    diffuseTex  = loadTexture("img/brick_diffuse.png");
    specularTex = loadTexture("img/brick_rough.png");
    normalTex   = loadTexture("img/brick_normal.png");

    rebuildSurface();

    // постійний рендер щоб світло крутилось
    function animate() {
        draw();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}


/* ---------------------------- SHADER COMPILER ----------------------------- */
function createProgram(gl, vsSource, fsSource) {

    function compileShader(type, source) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error("Shader compile error:\n" + gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);

    let prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Program link error:\n" + gl.getProgramInfoLog(prog));
    }

    return prog;
}
