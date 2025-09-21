'use strict';

function VirichSurface(uSteps, vSteps, a = 1.5) {
    let verticesU = []; // для U-поліліній
    let verticesV = []; // для V-поліліній

    function parametric(u, v) {
        let x = 0.5 * Math.cos(u) * (a + Math.cos(v));
        let y = 0.5 * Math.sin(u) * (a + Math.cos(v));
        let z = 0.5 * Math.sin(v);
        return [x, y, z];
    }

    // U-лінії (фіксуємо v, змінюємо u)
    for (let j = 0; j <= vSteps; j++) {
        let v = 2 * Math.PI * j / vSteps;
        for (let i = 0; i <= uSteps; i++) {
            let u = 2 * Math.PI * i / uSteps;
            let p = parametric(u, v);
            verticesU.push(...p);
        }
    }

    // V-лінії (фіксуємо u, змінюємо v)
    for (let i = 0; i <= uSteps; i++) {
        let u = 2 * Math.PI * i / uSteps;
        for (let j = 0; j <= vSteps; j++) {
            let v = 2 * Math.PI * j / vSteps;
            let p = parametric(u, v);
            verticesV.push(...p);
        }
    }

    // Створюємо дві моделі
    let modelU = new Model("U-lines");
    modelU.BufferData(verticesU);

    let modelV = new Model("V-lines");
    modelV.BufferData(verticesV);

    this.Draw = function() {
        gl.uniform4fv(shProgram.iColor, [0, 1, 0, 1]); // зелений
        modelU.Draw();

        gl.uniform4fv(shProgram.iColor, [0, 0, 1, 1]); // синій
        modelV.Draw();
    }
}
