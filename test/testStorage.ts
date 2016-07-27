import { Storage, Hash, Node } from '../src/chronoTree';
import * as h from 'object-hash';

export class TestStorage implements Storage {
    private _knownNodes: Node[] = [];

    public save(node: TestNode): Hash {
        // clear the node hash, so it isn't included in the new hash
        node.hash = '';
        let hash: string = this.computeHash(node);
        console.log('Saving   ' + hash);

        this._knownNodes.push(node);
        return hash;
    }

    public delete(node: Hash): void {
        console.log('Deleting ' + node);
    }

    public find(hash: Hash): Node {
        console.log('Finding  ' + hash);
        for (let node of this._knownNodes) {
            if (node.hash === hash) {
                return node;
            }
        }

        throw new Error('Cannot find node hash ' + hash);
    }

    private computeHash(node: TestNode): string {
        let hash = h.sha1(node).substr(0, 6);
        if (node.parent !== Node.HASH_NOT_SET) {
            hash += (' => ' + node.parent.substr(0, 6));
        }
        if (node.predecessors.length > 0) {
            hash += ' [ ';
            for (let p of node.predecessors) {
                hash += (p.substr(0, 6) + ' ');
            }
            hash += ']';
        }
        if (node.content) {
            hash += (' "' + node.content + '"');
        }
        return hash;
    }
}

export class TestNode extends Node {
    public content: String;
}
