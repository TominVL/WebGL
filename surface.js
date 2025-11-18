"use strict";

function f_func(v, a, b) {
    return (a * b) / Math.sqrt(a*a*Math.sin(v)*Math.sin(v) + b*b*Math.cos(v)*Math.cos(v));
}

function parametric(u, v, a, b, c, d) {
    let fv = f_func(v, a, b);

    let x = 0.5 * (fv*(1+Math.cos(u)) + (d*d - c*c)*(1-Math.cos(u))/fv) * Math.cos(v);
    let y = 0.5 * (fv*(1+Math.cos(u)) + (d*d - c*c)*(1-Math.cos(u))/fv) * Math.sin(v);
    let z = 0.5 * (fv - (d*d - c*c)/fv) * Math.sin(u);

    return [x*0.8, y*0.8, z*0.8];
}

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

    let L = Math.sqrt(nx*nx + ny*ny + nz*nz);
    return [nx/L, ny/L, nz/L];
}

function GenerateSurface(Usteps, Vsteps) {

    let a = 2;
    let b = 1;
    let c = 0.5;
    let d = 1.2;

    let vertices = [];
    let normals  = [];
    let indices  = [];

    for (let j = 0; j <= Vsteps; j++) {
        let v = 2*Math.PI * j / Vsteps;

        for (let i = 0; i <= Usteps; i++) {
            let u = 2*Math.PI * i / Usteps;

            let p = parametric(u, v, a, b, c, d);
            let n = analyticNormal(u, v, a, b, c, d);

            vertices.push(...p);
            normals.push(...n);
        }
    }

    let row = Usteps + 1;

    for (let j = 0; j < Vsteps; j++) {
        for (let i = 0; i < Usteps; i++) {

            let p0 = j * row + i;
            let p1 = p0 + 1;
            let p2 = p0 + row;
            let p3 = p2 + 1;

            indices.push(p0, p2, p1);
            indices.push(p1, p2, p3);
        }
    }

    return { vertices, normals, indices };
}
