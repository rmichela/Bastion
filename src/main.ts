import Calculator from "./calculator";

class Startup {
    public static main(): number {
        let calc: Calculator = new Calculator();
        console.log(calc.add(5, 20));
        return 0;
    }
}

Startup.main();