// https://gist.github.com/lsenta/15d7f6fcfc2987176b54
export class RNG {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    // http://indiegamr.com/generate-repeatable-random-numbers-in-js/
    public nextInt(min: number, max: number): number {
        return Math.floor(this.next(min, max));
    }

    public nextDouble(): number {
        return this.next(0, 1);
    }

    public nextBoolean(): boolean {
        return !(this.nextInt(0, 2));
    }

    public pick(collection: any[]): any {
        return collection[this.nextInt(0, collection.length - 1)];
    }

    private next(min: number, max: number): number {
        max = max || 0;
        min = min || 0;

        this.seed = (this.seed * 9301 + 49297) % 233281;
        let rnd = this.seed / 233280;

        return min + rnd * (max - min);
    }
}
