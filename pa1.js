'use strict';

// Обчислення допоміжної функції f(v)
function f(v, a, b) {
    return (a * b) / Math.sqrt(a * a * Math.sin(v) * Math.sin(v) + b * b * Math.cos(v) * Math.cos(v));
}

// Параметричне задання Virich Cyclic Surface
function parametric(u, v, a, b, c, d) {
    let fv = f(v, a, b);

    let x = 0.5 * (fv * (1 + Math.cos(u)) + (d * d - c * c) * (1 - Math.cos(u)) / fv) * Math.cos(v);
    let y = 0.5 * (fv * (1 + Math.cos(u)) + (d * d - c * c) * (1 - Math.cos(u)) / fv) * Math.sin(v);
    let z = 0.5 * (fv - (d * d - c * c) / fv) * Math.sin(u);

    return [x, y, z];
}

// Клас для створення каркасної поверхні
function VirichSurface(uSteps, vSteps, a = 2, b = 1, c = 0.5, d = 1.2) {
    let verticesU = []; // набір U-ліній
    let verticesV = []; // набір V-ліній

    // U-лінії (фіксуємо v, змінюємо u)
    for (let j = 0; j <= vSteps; j++) {
        let v = 2 * Math.PI * j / vSteps;
        for (let i = 0; i <= uSteps; i++) {
            let u = 2 * Math.PI * i / uSteps;
            let p = parametric(u, v, a, b, c, d);
            verticesU.push(...p);
        }
    }

    // V-лінії (фіксуємо u, змінюємо v)
    for (let i = 0; i <= uSteps; i++) {
        let u = 2 * Math.PI * i / uSteps;
        for (let j = 0; j <= vSteps; j++) {
            let v = 2 * Math.PI * j / vSteps;
            let p = parametric(u, v, a, b, c, d);
            verticesV.push(...p);
        }
    }

    // Створюємо дві моделі (дві множини вершин)
    let modelU = new Model("U-lines");
    modelU.BufferData(verticesU);

    let modelV = new Model("V-lines");
    modelV.BufferData(verticesV);

    // Метод для відмалювання
    this.Draw = function() {
        gl.uniform4fv(shProgram.iColor, [0, 1, 0, 1]); // зелений
        modelU.Draw();

        gl.uniform4fv(shProgram.iColor, [0, 0, 1, 1]); // синій
        modelV.Draw();
    }
}
