"use strict";

let gl;
let program;
let spaceball;

let vertexBuffer, normalBuffer, indexBuffer;
let indexCount = 0;

let uSlider, vSlider, uValSpan, vValSpan;

/* --------------------------- DRAW FUNCTION ------------------------------ */
function draw() {

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // --- матриці як у ЛР1 (камеру відсуваємо від об'єкта) ---
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    let modelView = spaceball.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0); // це наш ModelView
    let MVP       = m4.multiply(projection, matAccum1);            // це ModelViewProjection

    gl.uniformMatrix4fv(program.uModelView, false, matAccum1);
    gl.uniformMatrix4fv(program.uMVP,       false, MVP);

    // ---- рухоме світло
    let t = performance.now() * 0.001;
    let lightPos = [4 * Math.cos(t), 4 * Math.sin(t), 2];
    gl.uniform3fv(program.uLightPos, lightPos);

    // ---- вершини ----
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(program.aVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.aVertex);

    // ---- нормалі ----
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(program.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.aNormal);

    // ---- індекси ----
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
}

/* --------------------------- REBUILD SURFACE ------------------------------ */
function rebuildSurface() {

    let U = parseInt(uSlider.value);
    let V = parseInt(vSlider.value);
    uValSpan.textContent = U;
    vValSpan.textContent = V;

    let surf = GenerateSurface(U, V);  // → {vertices, normals, indices}

    indexCount = surf.indices.length;

    // ----- VERTEX BUFFER -----
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(surf.vertices), gl.STATIC_DRAW);

    // ----- NORMAL BUFFER -----
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(surf.normals), gl.STATIC_DRAW);

    // ----- INDEX BUFFER -----
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(surf.indices), gl.STATIC_DRAW);

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

    program.aVertex    = gl.getAttribLocation(program, "vertex");
    program.aNormal    = gl.getAttribLocation(program, "normal");

    program.uMVP       = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    program.uModelView = gl.getUniformLocation(program, "ModelViewMatrix");
    program.uLightPos  = gl.getUniformLocation(program, "lightPos");

    gl.enable(gl.DEPTH_TEST);
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

    rebuildSurface(); 
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
