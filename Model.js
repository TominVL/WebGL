"use strict";

function Vertex(p, n, t, uv) {
    this.p = p;        // [x,y,z]
    this.normal = n;   // [nx,ny,nz]
    this.tangent = t;  // [tx,ty,tz]
    this.uv = uv;      // [u,v]
}

function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
}

// Модель з VBO + index buffer
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iIndexBuffer  = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(verticesF32, indicesU16) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, verticesF32, gl.STATIC_DRAW);
        gl.vertexAttribPointer(program.aVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(program.aVertex);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesU16, gl.STATIC_DRAW);

        this.count = indicesU16.length;
    };

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(program.aVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(program.aVertex);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
}


/* ---------- Virich Surface математика ---------- */

function f_func(v, a, b) {
    return (a * b) / Math.sqrt(a*a*Math.sin(v)*Math.sin(v) + b*b*Math.cos(v)*Math.cos(v));
}

function parametric(u, v, a, b, c, d) {
    let fv = f_func(v, a, b);

    let x = 0.5 * (fv*(1+Math.cos(u)) + (d*d - c*c)*(1-Math.cos(u))/fv) * Math.cos(v);
    let y = 0.5 * (fv*(1+Math.cos(u)) + (d*d - c*c)*(1-Math.cos(u))/fv) * Math.sin(v);
    let z = 0.5 * (fv - (d*d - c*c)/fv) * Math.sin(u);

    let s = 0.6;
    return [x*s, y*s, z*s];
}

// normal from derivatives (approx)
function analyticNormal(u, v, a, b, c, d) {
    let eps = 0.01;

    let p  = parametric(u, v, a, b, c, d);
    let pu = parametric(u + eps, v, a, b, c, d);
    let pv = parametric(u, v + eps, a, b, c, d);

    let du = [pu[0]-p[0], pu[1]-p[1], pu[2]-p[2]];
    let dv = [pv[0]-p[0], pv[1]-p[1], pv[2]-p[2]];

    let nx = du[1]*dv[2] - du[2]*dv[1];
    let ny = du[2]*dv[0] - du[0]*dv[2];
    let nz = du[0]*dv[1] - du[1]*dv[0];

    let L = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
    return [nx/L, ny/L, nz/L];
}

// tangent along U direction (approx)
function analyticTangent(u, v, a, b, c, d) {
    let eps = 0.01;
    let p1 = parametric(u + eps, v, a, b, c, d);
    let p0 = parametric(u - eps, v, a, b, c, d);

    let tx = p1[0] - p0[0];
    let ty = p1[1] - p0[1];
    let tz = p1[2] - p0[2];

    let L = Math.sqrt(tx*tx + ty*ty + tz*tz) || 1.0;
    return [tx/L, ty/L, tz/L];
}


/**
 * Create Virich Cyclic Surface data:
 * data.verticesF32
 * data.normalsF32
 * data.tangentsF32
 * data.texcoordsF32
 * data.indicesU16
 */
function CreateVirichSurfaceData(Usteps, Vsteps, data) {

    let a = 2, b = 1, c = 0.5, d = 1.2;

    let verts = [];
    let tris  = [];

    for (let j = 0; j <= Vsteps; j++) {
        let v = 2 * Math.PI * j / Vsteps;
        let vTex = j / Vsteps;

        for (let i = 0; i <= Usteps; i++) {
            let u = 2 * Math.PI * i / Usteps;
            let uTex = i / Usteps;

            let p  = parametric(u, v, a, b, c, d);
            let n  = analyticNormal(u, v, a, b, c, d);
            let tU = analyticTangent(u, v, a, b, c, d);

            verts.push(new Vertex(p, n, tU, [uTex, vTex]));
        }
    }

    let row = Usteps + 1;

    for (let j = 0; j < Vsteps; j++) {
        for (let i = 0; i < Usteps; i++) {

            let p0 = j * row + i;
            let p1 = p0 + 1;
            let p2 = p0 + row;
            let p3 = p2 + 1;

            tris.push(new Triangle(p0, p2, p1));
            tris.push(new Triangle(p1, p2, p3));
        }
    }

    data.verticesF32  = new Float32Array(verts.length * 3);
    data.normalsF32   = new Float32Array(verts.length * 3);
    data.tangentsF32  = new Float32Array(verts.length * 3);
    data.texcoordsF32 = new Float32Array(verts.length * 2);
    data.indicesU16   = new Uint16Array(tris.length * 3);

    for (let i = 0; i < verts.length; i++) {
        data.verticesF32[i*3+0] = verts[i].p[0];
        data.verticesF32[i*3+1] = verts[i].p[1];
        data.verticesF32[i*3+2] = verts[i].p[2];

        data.normalsF32[i*3+0] = verts[i].normal[0];
        data.normalsF32[i*3+1] = verts[i].normal[1];
        data.normalsF32[i*3+2] = verts[i].normal[2];

        data.tangentsF32[i*3+0] = verts[i].tangent[0];
        data.tangentsF32[i*3+1] = verts[i].tangent[1];
        data.tangentsF32[i*3+2] = verts[i].tangent[2];

        data.texcoordsF32[i*2+0] = verts[i].uv[0];
        data.texcoordsF32[i*2+1] = verts[i].uv[1];
    }

    for (let i = 0; i < tris.length; i++) {
        data.indicesU16[i*3+0] = tris[i].v0;
        data.indicesU16[i*3+1] = tris[i].v1;
        data.indicesU16[i*3+2] = tris[i].v2;
    }
}
