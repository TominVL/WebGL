"use strict";

let gl;
let program;
let spaceball;
let surface;

// Буфери для атрибутів
let normalBuffer, tangentBuffer, texCoordBuffer;

// Елементи інтерфейсу
let uSlider, vSlider, uValSpan, vValSpan;

// Текстури
let diffuseTex, specularTex, normalTex;

// Стан трансформації текстури
let texPivotU = 0.5;
let texPivotV = 0.5;
let texScale = 1.0;
let texAngle = 0.0;

/* --------------------------- ФУНКЦІЯ МАЛЮВАННЯ ------------------------------ */
function draw() {
    if (!gl || !surface) return;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Матриці проекції та вигляду
    let projection = m4.perspective(Math.PI / 8, gl.canvas.width / gl.canvas.height, 8, 12);
    let modelView = spaceball.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let MVP = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(program.uModelView, false, matAccum1);
    gl.uniformMatrix4fv(program.uMVP, false, MVP);

    // Обертання світла
    let t = performance.now() * 0.001;
    let lightPos = [4 * Math.cos(t), 4 * Math.sin(t), 2];
    gl.uniform3fv(program.uLightPos, lightPos);

    // ПЕРЕДАЧА ПАРАМЕТРІВ ТРАНСФОРМАЦІЇ ТЕКСТУРИ
    gl.uniform2f(program.uPivot, texPivotU, texPivotV);
    gl.uniform1f(program.uScale, texScale);
    gl.uniform1f(program.uAngle, texAngle);

    // Прив'язка текстур
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTex);

    // Прив'язка буферів атрибутів
    bindAttribute(normalBuffer, program.aNormal, 3);
    bindAttribute(tangentBuffer, program.aTangent, 3);
    bindAttribute(texCoordBuffer, program.aTexCoord, 2);

    surface.Draw();
    updateUI();
}

function bindAttribute(buffer, location, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}

/* --------------------------- ОНОВЛЕННЯ ПОВЕРХНІ ------------------------------ */
function rebuildSurface() {
    if (!uSlider || !vSlider) return;

    let uRaw = parseInt(uSlider.value);
    let vRaw = parseInt(vSlider.value);

    // Нелінійна залежність кроків
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

    // Перестворюємо/оновлюємо буфери
    if (!normalBuffer) normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.normalsF32, gl.STATIC_DRAW);

    if (!tangentBuffer) tangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.tangentsF32, gl.STATIC_DRAW);

    if (!texCoordBuffer) texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.texcoordsF32, gl.STATIC_DRAW);

    draw();
}

/* --------------------------- UI ТА КЛАВІАТУРА ------------------------------ */
function updateUI() {
    const uEl = document.getElementById('val-u');
    if (uEl) {
        uEl.textContent = texPivotU.toFixed(2);
        document.getElementById('val-v').textContent = texPivotV.toFixed(2);
        document.getElementById('val-scale').textContent = texScale.toFixed(2);
        document.getElementById('val-angle').textContent = Math.round(texAngle * 180 / Math.PI);
    }
}

function handleKeyDown(e) {
    const step = 0.02;
    // Перевірка на мову (якщо натиснуто клавішу в укр. розкладці, switch не спрацює)
    switch(e.key.toLowerCase()) {
        case 'w': case 'ц': texPivotV += step; break;
        case 's': case 'і': texPivotV -= step; break;
        case 'a': case 'ф': texPivotU -= step; break;
        case 'd': case 'в': texPivotU += step; break;
        case 'q': case 'й': texScale = Math.max(0.1, texScale - step); break;
        case 'e': case 'у': texScale += step; break;
        case 'z': case 'я': texAngle -= step * 3; break;
        case 'x': case 'ч': texAngle += step * 3; break;
        case 'r': case 'к':
            texPivotU = 0.5; texPivotV = 0.5;
            texScale = 1.0; texAngle = 0.0;
            break;
    }
    draw();
}

/* --------------------------- ІНІЦІАЛІЗАЦІЯ ------------------------------ */
function init() {
    const canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) { alert("WebGL не підтримується"); return; }

    program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    // Отримання локацій атрибутів та uniform-змінних
    program.aVertex   = gl.getAttribLocation(program, "vertex");
    program.aNormal   = gl.getAttribLocation(program, "normal");
    program.aTangent  = gl.getAttribLocation(program, "tangent");
    program.aTexCoord = gl.getAttribLocation(program, "texCoord");

    program.uMVP       = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    program.uModelView = gl.getUniformLocation(program, "ModelViewMatrix");
    program.uLightPos  = gl.getUniformLocation(program, "lightPos");
    program.uPivot     = gl.getUniformLocation(program, "uPivot");
    program.uScale     = gl.getUniformLocation(program, "uScale");
    program.uAngle     = gl.getUniformLocation(program, "uAngle");

    program.uDiffuseSampler  = gl.getUniformLocation(program, "uDiffuseSampler");
    program.uSpecularSampler = gl.getUniformLocation(program, "uSpecularSampler");
    program.uNormalSampler   = gl.getUniformLocation(program, "uNormalSampler");

    gl.uniform1i(program.uDiffuseSampler, 0);
    gl.uniform1i(program.uSpecularSampler, 1);
    gl.uniform1i(program.uNormalSampler, 2);

    spaceball = new TrackballRotator(canvas, draw, 0);

    // Слайдери кроків поверхні
    uSlider = document.getElementById("uSlider");
    vSlider = document.getElementById("vSlider");
    uValSpan = document.getElementById("uVal");
    vValSpan = document.getElementById("vVal");

    uSlider.oninput = rebuildSurface;
    vSlider.oninput = rebuildSurface;

    window.addEventListener('keydown', handleKeyDown);

    // Завантаження текстур (використовуйте свої шляхи)
    diffuseTex  = loadTexture("img/brick_diffuse.png");
    specularTex = loadTexture("img/brick_rough.png");
    normalTex   = loadTexture("img/brick_normal.png");

    rebuildSurface();

    function animate() {
        draw();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

/* --------------------------- ДОПОМІЖНІ ФУНКЦІЇ ------------------------------ */
function loadTexture(url) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        draw();
    };
    img.src = url;
    return tex;
}

function createProgram(gl, vsSource, fsSource) {
    function compileShader(type, source) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Помилка шейдера:", gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    let prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    return prog;
}

window.onload = init;