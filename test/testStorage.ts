import { Storage, Hash, Node } from '../src/chronoTree';
import * as h from 'object-hash';

export class TestStorage implements Storage {
    private _knownNodes: Node[] = [];

    public save(node: Node): Hash {
        // clear the node hash, so it isn't included in the new hash
        node.hash = '';
        let hash: string = h.sha1(node);
        console.log('Saving ' + hash);

        this._knownNodes.push(node);
        return hash;
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

export class TestNode extends Node {
    public content: String;
}
