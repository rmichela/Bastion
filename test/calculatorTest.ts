/// <reference path="../typings/mocha/mocha.d.ts" />
import Calculator from "../src/calculator";
import { expect } from "chai";

describe("Calculator", () => {
    let calc: Calculator;

    beforeEach(function () {
        calc = new Calculator();
    });

    describe("#add", () => {
        it("should add two numbers together", () => {
            expect(calc.add(5, 3)).to.equal(8);
        });
    });
});