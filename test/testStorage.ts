import { Storage, Hash, Node } from '../src/chronoTree';

export class TestStorage implements Storage {
    private _knownNodes: Node[] = [];

    public save(node: Node): Hash {
        // todo: implement a hashing algorithm
        this._knownNodes.push(node);
        return 'not-a-hash';
    }

    public delete(node: Hash): void {
        console.log('Deleting ' + node);
    }

    public find(hash: Hash): Node {
        console.log('Finding ' + hash);
        for (let node of this._knownNodes) {
            if (node.hash === hash) {
                return node;
            }
        }

        throw new Error('Cannot find node hash ' + hash);
    }
}
