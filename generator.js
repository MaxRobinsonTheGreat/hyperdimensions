class FloatParameter {
    constructor(value=null, min=null, max=null) {
        this.min = min === null ? -1 : min;
        this.max = max === null ? 1 : max;
        this.value = value === null ? Math.random()*(this.max-this.min) + this.min : value;
    }

    mutate(range) {
        this.value += (Math.random()-0.5) * range;
        // this.value = Math.max(this.value, this.min);
        // this.value = Math.min(this.value, this.max);
    }
}

class IntParameter{
    constructor(value=null, min=null, max=null) {
        this.min = min === null ? -1 : min;
        this.max = max === null ? 1 : max;
        if (value === null)
            this.value = Math.floor(Math.random()*(max-min) + min);
    }

    mutate(range) {
        // todo
        this.value = Math.max(this.value, this.min);
        this.value = Math.min(this.value, this.max);
    }
}

class BoolParameter {
    constructor(value=null) {
        if (value === null)
            this.value = Math.random() > 0.5 + 0;
    }

    mutate(_) {
        this.value = !this.value + 0;
    }
}

class Node {
    nodes = []; // sub_nodes

    constructor(tree) {
        this.tree = tree;
    }
    
    eval(input) {
        throw new Error('Base node cannot eval');
    }

    mutate() {
        if (this.nodes.length > 0) {
            // get random sub node 
            let sub_node_i = Math.floor(Math.random()*this.nodes.length);
            const sub_node = this.nodes[sub_node_i];
            // create a new random node

            if (Math.random() < 0.5) {
                const newNode = newRandomNode(this.tree);
                // get arrays of indices of nodes in newNode and sub_node
                const remaining_new_i = newNode.nodes.map(node => newNode.nodes.indexOf(node));
                const remaining_cur_i = sub_node.nodes.map(node => sub_node.nodes.indexOf(node));
                // randomly replace nodes in newNode with nodes in sub_node, without duplication
                while (remaining_new_i.length > 0 && remaining_cur_i.length > 0) {
                    // get random index from remaining_new_i
                    const new_i = remaining_new_i.splice(Math.floor(Math.random()*remaining_new_i.length), 1)[0];
                    // get random node from remaining_cur_i
                    const cur_i = remaining_cur_i.splice(Math.floor(Math.random()*remaining_cur_i.length), 1)[0];
                    // replace the node at new_i with the node at cur_i
                    newNode.nodes[new_i] = sub_node.nodes[cur_i];
                }
                this.nodes[sub_node_i] = newNode;
            }
            else {
                // get random node from random sub tree of parent
                const other_nodes = this.tree.parent.getRandomTree().getNodes().filter(node => node !== sub_node);
                const other_node = other_nodes[Math.floor(Math.random()*other_nodes.length)];
                const graft_node = this.tree._cloneNode(other_node, this.tree);
                this.nodes[sub_node_i] = graft_node;
            }
        }
    }
}

class Variable extends Node {
    constructor(tree) {
        super(tree);
        this.mutate();
    }

    eval(input) {
        return input[this.name];
    }

    mutate() {
        this.name = this.tree.inputNames[Math.floor(Math.random()*this.tree.inputNames.length)];
    }

    getRawJS() {
        return this.name;
    }
}

class Param extends Node {
    constructor(tree) {
        super(tree)
        this.param = new FloatParameter();
    }

    eval(input) {
        return this.param.value;
    }

    mutate() {
        this.param.mutate(1);
    }

    getRawJS() {
        const val = this.param.value;
        return val > 0 ? val : `(${val})`;
    }
}

class VarParam extends Node {
    constructor(tree) {
        super(tree)
        this.nodes = [
            new Variable(tree),
            new Param(tree)
        ]
    }
}

class Add extends VarParam {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return a + b;
    }

    getRawJS() {
        return `(${this.nodes[0].getRawJS()} + ${this.nodes[1].getRawJS()})`;
    }
}

class Multiply extends VarParam {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return a * b;
    }

    getRawJS() {
        return `(${this.nodes[0].getRawJS()} * ${this.nodes[1].getRawJS()})`;
    }
}

class Divide extends VarParam {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return a / b;
    }

    getRawJS() {
        return `(${this.nodes[0].getRawJS()} / ${this.nodes[1].getRawJS()})`;
    }
}

class Relu extends VarParam {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return Math.max(a, b);
    }

    getRawJS() {
        return `Math.max(${this.nodes[0].getRawJS()}, ${this.nodes[1].getRawJS()})`;
    }
}

class Single extends Node {
    constructor(tree) {
        super(tree)
        this.nodes = [new Variable(tree)]
    }
}

class Sine extends Single {

    eval(input) {
        return Math.sin(this.nodes[0].eval(input))
    }

    getRawJS() {
        return `Math.sin(${this.nodes[0].getRawJS()})`;
    }
}

class Cosine extends Single {
    eval(input) {
        return Math.cos(this.nodes[0].eval(input))
    }

    getRawJS() {
        return `Math.cos(${this.nodes[0].getRawJS()})`;
    }
}

class Tanh extends Single {
    eval(input) { 
        return Math.tanh(this.nodes[0].eval(input)) 
    }

    getRawJS() {
        return `Math.tanh(${this.nodes[0].getRawJS()})`;
    }
}

class Abs extends Single {
    eval(input) {
        return Math.abs(this.nodes[0].eval(input))
    }

    getRawJS() {
        return `Math.abs(${this.nodes[0].getRawJS()})`;
    }
}

class Sigmoid extends Single {
    eval(input) {
        return 1 / (1 + Math.exp(-this.nodes[0].eval(input)))
    }

    getRawJS() {
        return `(1 / (1 + Math.exp(-${this.nodes[0].getRawJS()})))`;
    }
}

class Gaussian extends Single {
    eval(input) {
        return Math.exp(-Math.pow(this.nodes[0].eval(input), 2))
    }

    getRawJS() {
        return `Math.exp(-Math.pow(${this.nodes[0].getRawJS()}, 2))`;
    }
}

class Binary extends Single {
    eval(input) {
        return this.nodes[0].eval(input) > 0 ? 1 : 0;
    }

    getRawJS() {
        return `(${this.nodes[0].getRawJS()} > 0) ? 1 : 0`;
    }
}

class Block extends Node {
    constructor(tree) {
        super(tree)
        this.num = new IntParameter(null, 1, 10);
        this.nodes = Array.from({length: this.num.value}, () => new Add(tree));
    }

    eval(input) {
        return this.nodes.reduce((acc, node) => acc + node.eval(input), 0);
    }

    getRawJS() {
        return `(${this.nodes.map(n => n.getRawJS()).join(' + ')})`;
    }
}

class Exponential extends Node {
    constructor(tree) {
        super(tree)
        this.nodes = [
            new Variable(tree),
            new Param(tree)
        ]
    }

    eval(input) {
        const x_ = this.nodes[0].eval(input)
        const pow = this.nodes[1].eval(input)
        return Math.pow(Math.abs(x_), pow)
    }

    getRawJS() {
        return `Math.pow(Math.abs(${this.nodes[0].getRawJS()}), ${this.nodes[1].getRawJS()})`;
    }
}

class TriangleWave extends Single {
    eval(input) {
        const x = this.nodes[0].eval(input)
        return 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1
    }

    getRawJS() {
        const xExpr = this.nodes[0].getRawJS();
        return `(2 * Math.abs(2 * (${xExpr} - Math.floor(${xExpr} + 0.5))) - 1)`;
    }
}

const NodeBlocks = [
    Add,
    Multiply,
    Divide,
    Sine,
    Cosine,
    Tanh,
    Relu,
    Abs,
    Sigmoid,
    Gaussian,
    Binary,
    // Block,
    TriangleWave,
    // Exponential,
]

function newRandomNode(tree) {
    return new NodeBlocks[Math.floor(Math.random()*NodeBlocks.length)](tree);
}


class Tree {
    constructor(parent=null) {
        this.parent = parent;
        this.inputNames = parent.inputNames;
        this.root = new Add(this);
        this.fn = this.functionalize();
    }

    eval(input) {
        return this.fn(input);
    }

    recursiveEval(input) {
        return this.root.eval(input);
    }

    getRawJS() {
        return this.root.getRawJS();
    }

    functionalize() {
        let inputs = this.inputNames.map(name => `const ${name} = input.${name}`).join('; ');
        let code = `function fn(input) { ${inputs}; return ${this.getRawJS()}; } fn;`;
        return eval(code);
    }

    getNodes(cur=this.root) {
        let nodes = [cur];
        if (cur.nodes.length === 0) {
            return nodes;
        }
        for (let sub_node of cur.nodes) {
            nodes.push(...this.getNodes(sub_node));
        }
        return nodes;
    }

    mutate() {
        let nodes = this.getNodes();
        let i = Math.floor(Math.random()*nodes.length);
        nodes[i].mutate();
        this.fn = this.functionalize();
    }

    clone() {
        let copy = new Tree(this.parent);
        copy.root = this._cloneNode(this.root, copy);
        copy.fn = copy.functionalize();
        return copy;
    }

    _cloneNode(node, targetTree) {
        let copy = Object.create(Object.getPrototypeOf(node));
        copy.tree = targetTree;
        copy.nodes = [];
        if (node.name !== undefined) copy.name = node.name;
        if (node.param !== undefined) {
            copy.param = new FloatParameter(node.param.value, node.param.min, node.param.max);
        }
        if (node.num !== undefined) {
            copy.num = new IntParameter(node.num.value, node.num.min, node.num.max);
        }
        if (node.iterations !== undefined) copy.iterations = node.iterations;
        for (let child of node.nodes) {
            copy.nodes.push(this._cloneNode(child, targetTree));
        }
        return copy;
    }
}

class TreeFunction {
    constructor(inputNames, outputNames) {
        this.inputNames = inputNames;
        this.outputNames = outputNames;
        this.trees = {};
        for (let outputName of outputNames) {
            this.trees[outputName] = new Tree(this);
        }
    }

    eval(input) {
        let outputs = {};
        for (let outputName in this.trees) {
            outputs[outputName] = this.trees[outputName].eval(input);
        }
        return outputs;
    }

    mutate() {
        let toMutate = this.outputNames[Math.floor(Math.random()*this.outputNames.length)];
        this.trees[toMutate].mutate();
    }

    getRandomTree() {
        return this.trees[this.outputNames[Math.floor(Math.random()*this.outputNames.length)]];
    }

    clone() {
        let copy = new TreeFunction(this.inputNames, this.outputNames);
        for (let name of this.outputNames) {
            copy.trees[name] = this.trees[name].clone();
        }
        return copy;
    }
}


function test() {
    const treefn = new TreeFunction(["x"], ["y"]);
    const tree = treefn.getRandomTree();
    for (let i = 0; i < 1000; i++) {
        tree.mutate();
    }
    test_len = 1000000
    console.log(tree.getNodes().length);
    let start_time = Date.now()
    let treefn_results = [];
    for (let i = 0; i < test_len; i++) {
        treefn_results.push(tree.eval({x: i}));
    }
    console.log('treefn', Date.now() - start_time);
    start_time = Date.now()
    let tree_results = [];
    for (let i = 0; i < test_len; i++) {
        tree_results.push(tree.recursiveEval({x: i}));
    }
    console.log('tree', Date.now() - start_time);

    // calculate average absolute difference between treefn_results and tree_results
    let average_diff = 0;
    for (let i = 0; i < test_len; i++) {
        // if either result is nan, undefined, or null, print the index and the results
        if (isNaN(treefn_results[i]) || isNaN(tree_results[i]) || treefn_results[i] === undefined || tree_results[i] === undefined || treefn_results[i] === null || tree_results[i] === null) {
            console.log('index', i, 'treefn_result', treefn_results[i], 'tree_result', tree_results[i]);
        }
        else {
            average_diff += Math.abs(treefn_results[i] - tree_results[i]);
        }
    }
    average_diff /= test_len;
    console.log('average_diff', average_diff);
    console.log('all same', treefn_results.every((result, index) => result === tree_results[index]));
}

// test();